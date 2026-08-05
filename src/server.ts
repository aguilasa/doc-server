import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import chokidar from 'chokidar';
import { DocServerConfig } from './config.js';
import { generateSidebar } from './sidebar.js';
import { generateHtml } from './html.js';

const WS_PATH = '/_ws';
const SIDEBAR_ROUTE = '/_sidebar.md';

// Intervalo entre pings. Socket que não responde ao ping anterior é dado como
// morto e removido — sem isso, conexão meio-aberta (notebook suspenso, Wi-Fi
// caído) nunca emite 'close' e fica presa no registro de clientes para sempre.
const HEARTBEAT_MS = 30_000;

// Editor salva em duas etapas; uma rajada de eventos vira um reload só.
const RELOAD_DEBOUNCE_MS = 100;

const MIME_TYPES: Record<string, string> = {
  '.md': 'text/markdown; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

function getMimeType(filepath: string): string {
  const ext = path.extname(filepath).toLowerCase();
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

function serveDirectoryIndex(dirPath: string, res: http.ServerResponse): void {
  const readmePath = path.join(dirPath, 'README.md');
  fs.readFile(readmePath, (err, data) => {
    if (!err) {
      res.writeHead(200, { 'Content-Type': getMimeType(readmePath) });
      res.end(data);
      return;
    }
    // No README.md — fall back to first .md file alphabetically
    let files: string[];
    try {
      files = fs.readdirSync(dirPath)
        .filter(f => f.endsWith('.md'))
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    } catch {
      files = [];
    }
    if (files.length === 0) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const firstFile = path.join(dirPath, files[0]);
    fs.readFile(firstFile, (err2, data2) => {
      if (err2) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': getMimeType(firstFile) });
      res.end(data2);
    });
  });
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const tester = http.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, '127.0.0.1');
  });
}

export async function findAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
  }
  return port;
}

export interface RunningServer {
  /** Porta efetivamente vinculada. Difere da pedida quando `port` é 0. */
  readonly port: number;
  /** Fecha sockets, watcher e servidor. */
  stop(): Promise<void>;
}

/**
 * Sobe o servidor HTTP, o WebSocket e o watcher.
 * Resolve quando o servidor está ouvindo; quem chamou decide quando parar.
 */
export function startServer(
  docsDir: string,
  config: DocServerConfig,
  port: number
): Promise<RunningServer> {
  let sidebarContent = generateSidebar(docsDir, config.sidebar);
  const htmlContent = generateHtml(config);

  // Socket → respondeu ao último ping. Ver HEARTBEAT_MS.
  const clients = new Map<WebSocket, boolean>();

  function serveStaticFile(target: string, res: http.ServerResponse): void {
    // Stream em vez de fs.readFile: um PDF de anexo grande não precisa caber
    // inteiro em memória a cada requisição.
    fs.stat(target, (err, stats) => {
      if (err) {
        if (err.code === 'ENOENT' && target.endsWith('.md')) {
          // Docsify appends .md to paths without trailing slash (e.g. /subdir → /subdir.md).
          // If the path without .md is a directory, serve its index instead.
          const possibleDir = target.slice(0, -3);
          if (
            path.resolve(possibleDir).startsWith(path.resolve(docsDir)) &&
            fs.existsSync(possibleDir) &&
            fs.statSync(possibleDir).isDirectory()
          ) {
            serveDirectoryIndex(possibleDir, res);
            return;
          }
        }
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      if (stats.isDirectory()) {
        serveDirectoryIndex(target, res);
        return;
      }

      res.writeHead(200, {
        'Content-Type': getMimeType(target),
        'Content-Length': stats.size,
      });

      const stream = fs.createReadStream(target);
      // Cliente que aborta no meio do download deixaria o descritor aberto.
      res.on('close', () => stream.destroy());
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    });
  }

  const server = http.createServer((req, res) => {
    const url = req.url ?? '/';
    const urlPath = url.split('?')[0];

    if (req.method !== 'GET') {
      res.writeHead(405);
      res.end('Method Not Allowed');
      return;
    }

    if (urlPath === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlContent);
      return;
    }

    if (urlPath === SIDEBAR_ROUTE) {
      res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
      res.end(sidebarContent);
      return;
    }

    // Static file serving
    const filePath = path.join(docsDir, decodeURIComponent(urlPath));

    // Security: ensure path stays within docsDir
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(docsDir))) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    serveStaticFile(resolved, res);
  });

  // WebSocket server on the same HTTP server, path /_ws
  const wss = new WebSocketServer({ server, path: WS_PATH });

  // Um 'error' sem listener num EventEmitter derruba o processo. Aba fechada
  // bruscamente gera ECONNRESET — não pode levar o servidor junto.
  wss.on('error', (err: Error) => {
    console.warn(`Aviso: erro no servidor WebSocket (${err.message})`);
  });

  wss.on('connection', (ws) => {
    clients.set(ws, true);
    ws.on('pong', () => clients.set(ws, true));
    ws.on('close', () => clients.delete(ws));
    ws.on('error', (err: Error) => {
      clients.delete(ws);
      console.warn(`Aviso: erro em socket de live reload (${err.message})`);
    });
  });

  const heartbeat = setInterval(() => {
    for (const [ws, alive] of clients) {
      if (!alive) {
        clients.delete(ws);
        ws.terminate();
        continue;
      }
      clients.set(ws, false);
      ws.ping();
    }
  }, HEARTBEAT_MS);
  // O servidor HTTP já segura o processo vivo; o heartbeat não deve segurá-lo.
  heartbeat.unref();

  function broadcast(message: object): void {
    const data = JSON.stringify(message);
    for (const client of clients.keys()) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  // Watcher
  const watcher = chokidar.watch(docsDir, {
    persistent: true,
    ignoreInitial: true,
    // Never follow symlinks: they can point at device nodes, sockets or
    // unreadable paths outside docsDir (e.g. a Wine prefix's dosdevices/com1).
    followSymlinks: false,
    ignored: (watchedPath: string, stats?: fs.Stats) => {
      // Only directories and .md files are ever worth watching. Anything else
      // (binaries, device nodes, sockets, FIFOs) is skipped before chokidar
      // tries to open a watch descriptor on it.
      if (stats && !stats.isDirectory() && !watchedPath.endsWith('.md')) {
        return true;
      }
      const rel = path.relative(docsDir, watchedPath).replace(/\\/g, '/');
      if (!rel || rel.startsWith('..')) return false;
      return rel.split('/').some(segment =>
        segment === '.ignore' ||
        segment.startsWith('_') ||
        (!config.sidebar.includeDotFolders && segment.startsWith('.'))
      );
    },
  });

  // An unhandled 'error' event on an EventEmitter crashes the process. A single
  // unwatchable path (permissions, device node, too many open files) must not
  // take the whole server down — warn and keep serving.
  watcher.on('error', (err: unknown) => {
    const e = err as NodeJS.ErrnoException;
    console.warn(`Aviso: não foi possível observar ${e.path ?? '?'} (${e.code ?? e.message})`);
  });

  let reloadTimer: NodeJS.Timeout | undefined;

  function onMdChange(filePath: string): void {
    if (!filePath.endsWith('.md')) return;
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      reloadTimer = undefined;
      sidebarContent = generateSidebar(docsDir, config.sidebar);
      broadcast({ type: 'reload' });
    }, RELOAD_DEBOUNCE_MS);
  }

  watcher.on('add', onMdChange);
  watcher.on('change', onMdChange);
  watcher.on('unlink', onMdChange);

  async function stop(): Promise<void> {
    clearInterval(heartbeat);
    if (reloadTimer) clearTimeout(reloadTimer);
    for (const client of clients.keys()) {
      client.terminate();
    }
    clients.clear();
    await watcher.close();
    await new Promise<void>(resolve => wss.close(() => resolve()));
    await new Promise<void>(resolve => server.close(() => resolve()));
  }

  return new Promise<RunningServer>(resolve => {
    server.listen(port, () => {
      const address = server.address();
      // address() só devolve string para socket unix, que não usamos aqui.
      const boundPort = typeof address === 'object' && address !== null ? address.port : port;
      resolve({ port: boundPort, stop });
    });
  });
}
