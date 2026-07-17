import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import chokidar from 'chokidar';
import { DocServerConfig } from './config.js';
import { generateSidebar } from './sidebar.js';
import { generateHtml } from './html.js';

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

export function startServer(docsDir: string, config: DocServerConfig, port: number): void {
  let sidebarContent = generateSidebar(docsDir, config.sidebar);
  let htmlContent = generateHtml(config);

  const clients = new Set<WebSocket>();

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

    if (urlPath === '/_sidebar.md') {
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

    fs.readFile(resolved, (err, data) => {
      if (err) {
        if (err.code === 'EISDIR') {
          serveDirectoryIndex(resolved, res);
          return;
        }
        if (err.code === 'ENOENT' && resolved.endsWith('.md')) {
          // Docsify appends .md to paths without trailing slash (e.g. /subdir → /subdir.md).
          // If the path without .md is a directory, serve its index instead.
          const possibleDir = resolved.slice(0, -3);
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
      res.writeHead(200, { 'Content-Type': getMimeType(resolved) });
      res.end(data);
    });
  });

  // WebSocket server on the same HTTP server, path /_ws
  const wss = new WebSocketServer({ server, path: '/_ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
  });

  function broadcast(message: object): void {
    const data = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  // Watcher
  const watcher = chokidar.watch(docsDir, {
    persistent: true,
    ignoreInitial: true,
    ignored: (watchedPath: string) => {
      const rel = path.relative(docsDir, watchedPath).replace(/\\/g, '/');
      if (!rel || rel.startsWith('..')) return false;
      return rel.split('/').some(segment =>
        segment === '.ignore' ||
        segment.startsWith('_') ||
        (!config.sidebar.includeDotFolders && segment.startsWith('.'))
      );
    },
  });

  function onMdChange(filePath: string): void {
    if (!filePath.endsWith('.md')) return;
    sidebarContent = generateSidebar(docsDir, config.sidebar);
    broadcast({ type: 'reload' });
  }

  watcher.on('add', onMdChange);
  watcher.on('change', onMdChange);
  watcher.on('unlink', onMdChange);

  server.listen(port, () => {
    console.log(`Documentação disponível em http://localhost:${port}`);
  });
}
