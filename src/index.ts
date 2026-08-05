#!/usr/bin/env node
import * as path from 'node:path';
import { loadConfig } from './config.js';
import { findAvailablePort, startServer } from './server.js';

function printHelp(): void {
  console.log(`
doc-server — Serve uma pasta de Markdown como documentação local com Docsify

Uso:
  doc-server <pasta> [opções]

Argumentos:
  pasta           Caminho para a pasta com os arquivos .md (obrigatório)

Opções:
  --port,   -p   Porta do servidor (padrão: 4000)
  --name,   -n   Título do site
  --config, -c   Caminho para o arquivo .docserverrc
  --help,   -h   Exibe esta ajuda
`);
}

function parseArgs(argv: string[]): {
  docsDir?: string;
  port?: number;
  name?: string;
  configPath?: string;
  help: boolean;
} {
  const result: {
    docsDir?: string;
    port?: number;
    name?: string;
    configPath?: string;
    help: boolean;
  } = { help: false };

  const args = argv.slice(2);
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--port' || arg === '-p') {
      result.port = parseInt(args[++i], 10);
    } else if (arg === '--name' || arg === '-n') {
      result.name = args[++i];
    } else if (arg === '--config' || arg === '-c') {
      result.configPath = args[++i];
    } else if (!arg.startsWith('-')) {
      result.docsDir = arg;
    }

    i++;
  }

  return result;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);

  if (parsed.help) {
    printHelp();
    process.exit(0);
  }

  if (!parsed.docsDir) {
    console.error('Erro: informe o caminho para a pasta de documentação.');
    printHelp();
    process.exit(1);
  }

  const docsDir = path.resolve(parsed.docsDir);

  const config = loadConfig(docsDir, parsed.configPath, {
    port: parsed.port,
    name: parsed.name,
  });

  const port = await findAvailablePort(config.port);
  const { port: boundPort, stop } = await startServer(docsDir, config, port);

  console.log(`Documentação disponível em http://localhost:${boundPort}`);

  // Encerramento limpo: fecha sockets, watcher e servidor antes de sair.
  let shuttingDown = false;
  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    stop().then(
      () => process.exit(0),
      err => {
        console.error(err);
        process.exit(1);
      }
    );
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
