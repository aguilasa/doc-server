import * as fs from 'node:fs';
import * as path from 'node:path';
import { getTitleFromFile } from './title.js';
import { ExcludeFilter } from './exclude.js';

export interface SidebarOptions {
  numberedPrefix: boolean;
  collapsedSections: boolean;
  includeDotFolders: boolean;
  /** Ausente = nada é excluído além das pastas `.ignore`, `_*` e `.*`. */
  isExcluded?: ExcludeFilter;
}

function humanizeDir(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/^\w/, c => c.toUpperCase());
}

function numericPrefix(filename: string): number | null {
  const m = filename.match(/^(\d+)-/);
  return m ? parseInt(m[1], 10) : null;
}

function sortMdFiles(files: string[], numberedPrefix: boolean): string[] {
  const readme = files.filter(f => f.toLowerCase() === 'readme.md');
  const rest = files.filter(f => f.toLowerCase() !== 'readme.md');

  if (numberedPrefix) {
    const numbered = rest.filter(f => numericPrefix(f) !== null);
    const other = rest.filter(f => numericPrefix(f) === null);

    numbered.sort((a, b) => (numericPrefix(a) ?? 0) - (numericPrefix(b) ?? 0));
    other.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    return [...readme, ...numbered, ...other];
  }

  rest.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return [...readme, ...rest];
}

/** Opções com a ausência já resolvida, para o recursivo não repetir o default. */
interface ResolvedOptions {
  readonly numberedPrefix: boolean;
  readonly includeDotFolders: boolean;
  readonly isExcluded: ExcludeFilter;
}

/** Caminho relativo à raiz, em POSIX — é a forma que o filtro de exclusão espera. */
function toRelPath(docsDir: string, fullPath: string): string {
  return path.relative(docsDir, fullPath).replace(/\\/g, '/');
}

function buildSection(
  dirPath: string,
  docsDir: string,
  opts: ResolvedOptions,
  indent: string
): string {
  let items: fs.Dirent[];
  try {
    items = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return '';
  }

  const mdFiles = items
    .filter(i => i.isFile() && i.name.endsWith('.md') && i.name !== '_sidebar.md')
    .map(i => i.name)
    .filter(name => !opts.isExcluded(toRelPath(docsDir, path.join(dirPath, name))));

  const subdirs = items
    .filter(i =>
      i.isDirectory() &&
      i.name !== '.ignore' &&
      !i.name.startsWith('_') &&
      (opts.includeDotFolders || !i.name.startsWith('.'))
    )
    .map(i => i.name)
    .filter(name => !opts.isExcluded(toRelPath(docsDir, path.join(dirPath, name))))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const sorted = sortMdFiles(mdFiles, opts.numberedPrefix);

  let lines: string[] = [];

  for (const file of sorted) {
    const fullPath = path.join(dirPath, file);
    const relPath = toRelPath(docsDir, fullPath);
    const encodedPath = relPath.split('/').map(s => encodeURIComponent(s)).join('/');
    const title = getTitleFromFile(fullPath);
    // Barra inicial de propósito: é o único formato que o docsify resolve igual
    // com `relativePath` ligado e desligado. Sem ela, a sidebar vista de dentro
    // de uma subpasta apontaria para '/docs/docs/PLANO.md' quando a opção está
    // ligada. Ver docs/paridade-com-github.md §7.
    lines.push(`${indent}* [${title}](/${encodedPath})`);
  }

  for (const subdir of subdirs) {
    const subdirPath = path.join(dirPath, subdir);
    const sectionTitle = humanizeDir(subdir);
    const sectionContent = buildSection(subdirPath, docsDir, opts, indent + '  ');

    if (!sectionContent.trim()) continue;

    lines.push('');
    lines.push(`${indent}* **${sectionTitle}**`);
    lines.push(sectionContent.trimEnd());
  }

  return lines.join('\n') + '\n';
}

export function generateSidebar(docsDir: string, opts: SidebarOptions): string {
  const resolved: ResolvedOptions = {
    numberedPrefix: opts.numberedPrefix,
    includeDotFolders: opts.includeDotFolders,
    isExcluded: opts.isExcluded ?? (() => false),
  };
  return buildSection(docsDir, docsDir, resolved, '');
}
