import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import { loadConfig } from '../src/config.js';
import { startServer, RunningServer } from '../src/server.js';

const fixturesDir = path.join(fileURLToPath(import.meta.url), '../../tests/fixtures');

interface RawResponse {
  status: number;
  contentType: string;
  body: string;
}

/**
 * Requisição HTTP crua. `fetch` normaliza '..' na URL antes de enviar, o que
 * tornaria impossível exercitar path traversal — `http.request` manda o path
 * exatamente como escrito.
 */
function request(port: number, urlPath: string, method = 'GET'): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: urlPath, method }, res => {
      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(chunk as Buffer));
      res.on('end', () =>
        resolve({
          status: res.statusCode ?? 0,
          contentType: res.headers['content-type'] ?? '',
          body: Buffer.concat(chunks).toString('utf-8'),
        })
      );
    });
    req.on('error', reject);
    req.end();
  });
}

/** Porta 0: o SO escolhe uma livre, então os arquivos de teste não colidem. */
function serve(docsDir: string): Promise<RunningServer> {
  return startServer(docsDir, loadConfig(docsDir, '/nonexistent/.docserverrc'), 0);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'docserver-test-'));
}

describe('startServer routes', () => {
  let server: RunningServer;

  beforeAll(async () => {
    server = await serve(path.join(fixturesDir, 'with-subdirs'));
  });

  afterAll(() => server.stop());

  it('serves the generated index.html at /', async () => {
    const res = await request(server.port, '/');

    expect(res.status).toBe(200);
    expect(res.contentType).toContain('text/html');
    expect(res.body).toContain('window.$docsify');
  });

  it('serves the generated sidebar at /_sidebar.md', async () => {
    const res = await request(server.port, '/_sidebar.md');

    expect(res.status).toBe(200);
    expect(res.contentType).toContain('text/markdown');
    expect(res.body).toContain('[Docs Home](/README.md)');
  });

  it('never writes the generated files into docsDir', async () => {
    await request(server.port, '/');
    await request(server.port, '/_sidebar.md');

    const docsDir = path.join(fixturesDir, 'with-subdirs');
    expect(fs.existsSync(path.join(docsDir, 'index.html'))).toBe(false);
    expect(fs.existsSync(path.join(docsDir, '_sidebar.md'))).toBe(false);
  });

  it('serves a markdown file from a subdirectory', async () => {
    const res = await request(server.port, '/guide/quickstart.md');

    expect(res.status).toBe(200);
    expect(res.contentType).toContain('text/markdown');
    expect(res.body).toContain('# Quick Start');
  });

  it('serves a directory as its first markdown file when it has no README', async () => {
    const res = await request(server.port, '/guide');

    expect(res.status).toBe(200);
    expect(res.body).toContain('# Quick Start');
  });

  it('serves /subdir.md as the directory index, the way Docsify asks for it', async () => {
    const res = await request(server.port, '/guide.md');

    expect(res.status).toBe(200);
    expect(res.body).toContain('# Quick Start');
  });

  it('answers 404 for a file that does not exist', async () => {
    const res = await request(server.port, '/nada.png');

    expect(res.status).toBe(404);
  });

  it('answers 405 for a method other than GET', async () => {
    const res = await request(server.port, '/', 'POST');

    expect(res.status).toBe(405);
  });
});

describe('startServer source file types', () => {
  let server: RunningServer;

  beforeAll(async () => {
    server = await serve(path.join(fixturesDir, 'with-source-files'));
  });

  afterAll(() => server.stop());

  it('shows a C header as text instead of offering it as a download', async () => {
    const res = await request(server.port, '/src/hw.h');

    expect(res.status).toBe(200);
    expect(res.contentType).toContain('text/plain');
    expect(res.body).toContain('#ifndef HW_H');
  });

  it('shows a shell script as text', async () => {
    const res = await request(server.port, '/src/build.sh');

    expect(res.contentType).toContain('text/plain');
  });

  it('shows an extensionless Makefile as text', async () => {
    const res = await request(server.port, '/src/Makefile');

    expect(res.contentType).toContain('text/plain');
  });

  it('still offers an unknown binary extension as a download', async () => {
    const res = await request(server.port, '/src/dump.bin');

    expect(res.contentType).toContain('application/octet-stream');
  });
});

describe('startServer path containment', () => {
  let server: RunningServer;
  let root: string;

  beforeAll(async () => {
    root = makeTempDir();
    const docsDir = path.join(root, 'docs');
    fs.mkdirSync(path.join(docsDir, 'guide'), { recursive: true });
    fs.mkdirSync(path.join(root, 'outside'));
    // Irmã com o mesmo prefixo: é o caso que a checagem por startsWith deixava passar.
    fs.mkdirSync(path.join(root, 'docs-privado'));

    fs.writeFileSync(path.join(docsDir, 'README.md'), '# Home\n');
    fs.writeFileSync(path.join(docsDir, 'guide', 'quickstart.md'), '# Quick Start\n');
    fs.writeFileSync(path.join(docsDir, '..oculto.md'), '# Oculto\n');
    fs.writeFileSync(path.join(root, 'docs-privado', 'segredo.md'), 'SEGREDO-IRMAO\n');
    fs.writeFileSync(path.join(root, 'outside', 'segredo.txt'), 'SEGREDO-FORA\n');
    // 'junction' é ignorado fora do Windows e lá dispensa privilégio de admin.
    fs.symlinkSync(path.join(root, 'outside'), path.join(docsDir, 'link'), 'junction');

    server = await serve(docsDir);
  });

  afterAll(async () => {
    await server.stop();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('blocks ../ that escapes into a sibling folder sharing the docsDir prefix', async () => {
    const res = await request(server.port, '/../docs-privado/segredo.md');

    expect(res.status).toBe(403);
    expect(res.body).not.toContain('SEGREDO-IRMAO');
  });

  it('blocks percent-encoded ../', async () => {
    const res = await request(server.port, '/%2e%2e/docs-privado/segredo.md');

    expect(res.status).toBe(403);
    expect(res.body).not.toContain('SEGREDO-IRMAO');
  });

  it('blocks ../ nested inside an existing subpath', async () => {
    const res = await request(server.port, '/guide/../../docs-privado/segredo.md');

    expect(res.status).toBe(403);
    expect(res.body).not.toContain('SEGREDO-IRMAO');
  });

  it('blocks a symlink pointing outside docsDir', async () => {
    const res = await request(server.port, '/link/segredo.txt');

    expect(res.status).toBe(403);
    expect(res.body).not.toContain('SEGREDO-FORA');
  });

  it('serves a file whose own name starts with ..', async () => {
    const res = await request(server.port, '/..oculto.md');

    expect(res.status).toBe(200);
    expect(res.body).toContain('# Oculto');
  });

  it('answers 400 for malformed percent-encoding instead of crashing', async () => {
    const res = await request(server.port, '/%');

    expect(res.status).toBe(400);
  });

  it('keeps serving after a blocked request', async () => {
    await request(server.port, '/../docs-privado/segredo.md');
    await request(server.port, '/%');

    const res = await request(server.port, '/README.md');
    expect(res.status).toBe(200);
  });
});

describe('startServer live reload', () => {
  let server: RunningServer;
  let root: string;
  let mdFile: string;

  beforeAll(async () => {
    root = makeTempDir();
    mdFile = path.join(root, 'a.md');
    fs.writeFileSync(mdFile, '# A\n');
    server = await serve(root);
  });

  afterAll(async () => {
    await server.stop();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('collapses simultaneous changes to several files into a single reload', async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${server.port}/_ws`);
    const messages: string[] = [];
    await new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve());
      socket.once('error', reject);
    });
    socket.on('message', data => messages.push(data.toString()));

    // O watcher fica pronto de forma assíncrona e não expõe esse instante.
    // Escrever até o primeiro reload chegar prova que ele está observando,
    // sem depender de um sleep arbitrário.
    let watching = false;
    for (let i = 0; i < 25 && !watching; i++) {
      fs.appendFileSync(mdFile, `\n<!-- ping ${i} -->\n`);
      await delay(200);
      watching = messages.length > 0;
    }
    expect(watching).toBe(true);

    // Silêncio para o debounce das escritas acima terminar de drenar.
    await delay(500);
    messages.length = 0;

    // Arquivos distintos, de propósito: escritas repetidas no mesmo arquivo já
    // são coalescidas pelo próprio chokidar, então não exercitariam o debounce.
    // Cinco arquivos criados juntos geram cinco eventos — é o caso real de um
    // checkout do git ou de salvar vários arquivos de uma vez.
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(path.join(root, `rajada-${i}.md`), `# Rajada ${i}\n`);
    }

    // Bem mais que o debounce: se viesse um segundo reload, chegaria aqui.
    await delay(1000);
    socket.close();

    expect(messages).toEqual(['{"type":"reload"}']);
  }, 15_000);

  it('drops the client from the registry when the socket closes', async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${server.port}/_ws`);
    await new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve());
      socket.once('error', reject);
    });

    await new Promise<void>(resolve => {
      socket.once('close', () => resolve());
      socket.close();
    });

    // Um cliente ausente não pode impedir o encerramento nem gerar erro:
    // uma escrita depois do close tem que passar sem derrubar o servidor.
    fs.appendFileSync(mdFile, '\n# depois do close\n');
    await delay(400);

    const res = await request(server.port, '/');
    expect(res.status).toBe(200);
  }, 10_000);
});
