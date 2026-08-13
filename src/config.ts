import * as fs from 'node:fs';
import * as path from 'node:path';

export interface DocServerConfig {
  name: string;
  port: number;
  homepage: string;
  fontSize: number;
  /**
   * Globs, ancorados na raiz servida, do que não entra na sidebar nem no
   * watcher. De topo, e não dentro de `sidebar`, porque atinge os dois.
   */
  exclude: string[];
  /** Quando ligado, o `.gitignore` da raiz exclui junto com `exclude`. */
  respectGitignore: boolean;
  /**
   * Repassado ao docsify. Com `false` (default), todo link sem barra inicial é
   * ancorado na raiz servida; com `true`, é resolvido a partir do arquivo que o
   * contém — a convenção do GitHub.
   */
  relativePath: boolean;
  sidebar: {
    numberedPrefix: boolean;
    collapsedSections: boolean;
    includeDotFolders: boolean;
  };
  features: {
    taskLists: boolean;
    mermaid: boolean;
    mermaidViewer: boolean;
    copyCode: boolean;
    search: boolean;
    pagination: boolean;
    zoomImage: boolean;
    pageTitle: boolean;
    youtubeEmbed: boolean;
    downloadableAttachments: boolean;
    pdfExport: boolean;
    githubSlugs: boolean;
  };
}

export type PartialConfig = Partial<{
  name: string;
  port: number;
  homepage: string;
  fontSize: number;
  exclude: string[];
  respectGitignore: boolean;
  relativePath: boolean;
  sidebar: Partial<DocServerConfig['sidebar']>;
  features: Partial<DocServerConfig['features']>;
}>;

export type CliFlags = {
  port?: number;
  name?: string;
};

function defaultHomepage(docsDir: string): string {
  const readmePath = path.join(docsDir, 'README.md');
  if (fs.existsSync(readmePath)) return 'README.md';
  try {
    const files = fs.readdirSync(docsDir)
      .filter(f => f.endsWith('.md'))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return files[0] ?? 'README.md';
  } catch {
    return 'README.md';
  }
}

export function loadConfig(docsDir: string, configPath?: string, cliFlags?: CliFlags): DocServerConfig {
  const rcPath = configPath ?? path.join(process.cwd(), '.docserverrc');
  let fileConfig: PartialConfig = {};

  if (fs.existsSync(rcPath)) {
    try {
      const raw = fs.readFileSync(rcPath, 'utf-8');
      fileConfig = JSON.parse(raw) as PartialConfig;
    } catch {
      // ignore parse errors, use defaults
    }
  }

  const defaults: DocServerConfig = {
    name: path.basename(docsDir),
    port: 4000,
    homepage: defaultHomepage(docsDir),
    fontSize: 16,
    exclude: [],
    respectGitignore: false,
    relativePath: false,
    sidebar: {
      numberedPrefix: true,
      collapsedSections: true,
      includeDotFolders: false,
    },
    features: {
      taskLists: true,
      mermaid: true,
      mermaidViewer: true,
      copyCode: true,
      search: true,
      pagination: true,
      zoomImage: true,
      pageTitle: true,
      youtubeEmbed: true,
      downloadableAttachments: true,
      pdfExport: true,
      githubSlugs: false,
    },
  };

  const merged: DocServerConfig = {
    name: fileConfig.name ?? defaults.name,
    port: fileConfig.port ?? defaults.port,
    homepage: fileConfig.homepage ?? defaults.homepage,
    fontSize: fileConfig.fontSize ?? defaults.fontSize,
    // Um `exclude` que não é lista de strings viraria erro só lá na frente, na
    // compilação do glob; descartar aqui mantém o resto do arquivo válido.
    exclude: Array.isArray(fileConfig.exclude)
      ? fileConfig.exclude.filter(pattern => typeof pattern === 'string')
      : defaults.exclude,
    respectGitignore: fileConfig.respectGitignore ?? defaults.respectGitignore,
    relativePath: fileConfig.relativePath ?? defaults.relativePath,
    sidebar: {
      numberedPrefix: fileConfig.sidebar?.numberedPrefix ?? defaults.sidebar.numberedPrefix,
      collapsedSections: fileConfig.sidebar?.collapsedSections ?? defaults.sidebar.collapsedSections,
      includeDotFolders: fileConfig.sidebar?.includeDotFolders ?? defaults.sidebar.includeDotFolders,
    },
    features: {
      taskLists: fileConfig.features?.taskLists ?? defaults.features.taskLists,
      mermaid: fileConfig.features?.mermaid ?? defaults.features.mermaid,
      mermaidViewer: fileConfig.features?.mermaidViewer ?? defaults.features.mermaidViewer,
      copyCode: fileConfig.features?.copyCode ?? defaults.features.copyCode,
      search: fileConfig.features?.search ?? defaults.features.search,
      pagination: fileConfig.features?.pagination ?? defaults.features.pagination,
      zoomImage: fileConfig.features?.zoomImage ?? defaults.features.zoomImage,
      pageTitle: fileConfig.features?.pageTitle ?? defaults.features.pageTitle,
      youtubeEmbed: fileConfig.features?.youtubeEmbed ?? defaults.features.youtubeEmbed,
      downloadableAttachments: fileConfig.features?.downloadableAttachments ?? defaults.features.downloadableAttachments,
      pdfExport: fileConfig.features?.pdfExport ?? defaults.features.pdfExport,
      githubSlugs: fileConfig.features?.githubSlugs ?? defaults.features.githubSlugs,
    },
  };

  // CLI flags have highest priority
  if (cliFlags?.port !== undefined) merged.port = cliFlags.port;
  if (cliFlags?.name !== undefined) merged.name = cliFlags.name;

  return merged;
}
