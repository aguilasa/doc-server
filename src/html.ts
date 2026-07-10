import * as fs from 'node:fs';
import { DocServerConfig } from './config.js';

const templatesBase = new URL('../templates', import.meta.url);

function readAsset(relPath: string): string {
  const url = new URL(relPath, templatesBase + '/');
  return fs.readFileSync(url, 'utf-8');
}

function escapeJs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function generateHtml(config: DocServerConfig): string {
  const f = config.features;
  const safeName = escapeJs(config.name);
  const safeHomepage = escapeJs(config.homepage);

  const customCss = readAsset('assets/css/custom.css');
  const mermaidViewerCss = f.mermaidViewer ? readAsset('assets/css/mermaid-viewer.css') : '';
  const taskListsJs = f.taskLists ? readAsset('assets/js/task-lists.js') : '';
  const pageTitleJs = f.pageTitle ? readAsset('assets/js/page-title.js') : '';
  const mermaidInitJs = f.mermaid ? readAsset('assets/js/mermaid-init.js') : '';
  const mermaidPluginJs = f.mermaid ? readAsset('assets/js/mermaid-plugin.js') : '';
  const mermaidViewerJs = f.mermaidViewer ? readAsset('assets/js/mermaid-viewer.js') : '';
  const youtubeEmbedCss = f.youtubeEmbed ? readAsset('assets/css/youtube-embed.css') : '';
  const youtubeEmbedJs = f.youtubeEmbed ? readAsset('assets/js/youtube-embed.js') : '';
  const fontSizeJs = readAsset('assets/js/font-size.js');
  const sidebarResizeJs = readAsset('assets/js/sidebar-resize.js');

  const lines: string[] = [];

  lines.push('<!DOCTYPE html>');
  lines.push('<html lang="pt-BR">');
  lines.push('<head>');
  lines.push('  <meta charset="UTF-8">');
  lines.push(`  <title>${config.name}</title>`);
  lines.push('  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />');
  lines.push(`  <meta name="description" content="${config.name}" />`);
  lines.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0">');
  lines.push('  <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/docsify@4/lib/themes/vue.css">');
  lines.push(`  <style>${customCss}</style>`);
  lines.push(`  <style>:root { --doc-font-size: ${config.fontSize}px; }
.sidebar,
.sidebar-nav,
.sidebar-nav a,
.sidebar-nav ul,
.sidebar-nav li,
.sidebar-nav p { font-size: var(--doc-font-size) !important; }
.markdown-section { font-size: var(--doc-font-size); }</style>`);
  if (f.mermaidViewer) {
    lines.push(`  <style>${mermaidViewerCss}</style>`);
  }
  if (f.youtubeEmbed) {
    lines.push(`  <style>${youtubeEmbedCss}</style>`);
  }
  lines.push('</head>');
  lines.push('<body>');
  lines.push('  <div id="app"></div>');
  lines.push('');
  lines.push('  <script>');
  lines.push('    window.$docsify = {');
  lines.push(`      name: '${safeName}',`);
  lines.push("      repo: '',");
  lines.push('      loadSidebar: true,');
  lines.push('      loadNavbar: false,');
  lines.push('      maxLevel: 4,');
  lines.push('      subMaxLevel: 3,');
  lines.push('      auto2top: true,');
  lines.push(`      homepage: '${safeHomepage}',`);
  lines.push('      coverpage: false,');
  lines.push('      mergeNavbar: true,');
  lines.push('      notFoundPage: true,');
  if (f.search) {
    lines.push("      search: 'auto',");
  }
  lines.push('      markdown: {');
  lines.push('        smartypants: true,');
  lines.push('        renderer: { code: function(code, lang) { return this.origin.code.apply(this, arguments); } }');
  lines.push('      },');
  if (f.pagination) {
    lines.push("      pagination: { previousText: 'Anterior', nextText: 'Próximo', crossChapter: true, crossChapterText: true },");
  }
  if (f.copyCode) {
    lines.push("      copyCode: { buttonText: 'Copiar', errorText: 'Falha ao copiar', successText: 'Copiado!' },");
  }
  lines.push('      plugins: [],');
  if (f.mermaid) {
    lines.push("      mermaidConfig: { querySelector: '.mermaid' },");
  }
  lines.push('    }');
  lines.push('  </script>');
  lines.push('');
  if (f.taskLists) {
    lines.push(`  <script>${taskListsJs}</script>`);
  }
  if (f.pageTitle) {
    lines.push(`  <script>${pageTitleJs}</script>`);
  }
  lines.push('');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/docsify@4"></script>');
  lines.push('');
  if (f.copyCode) {
    lines.push('  <script src="//cdn.jsdelivr.net/npm/docsify-copy-code@2"></script>');
  }
  if (f.pagination) {
    lines.push('  <script src="//cdn.jsdelivr.net/npm/docsify-pagination@2/dist/docsify-pagination.min.js"></script>');
  }
  if (f.search) {
    lines.push('  <script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/search.min.js"></script>');
  }
  if (f.zoomImage) {
    lines.push('  <script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/zoom-image.min.js"></script>');
  }
  lines.push('  <script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/external-script.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/front-matter.min.js"></script>');
  lines.push('');
  lines.push('  <!-- Prism.js syntax highlight -->');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-bash.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-javascript.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-typescript.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-json.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-python.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-java.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-sql.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-yaml.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-docker.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-markdown.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-nginx.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-php.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-ruby.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-go.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-rust.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-css.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-scss.min.js"></script>');
  lines.push('  <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-less.min.js"></script>');
  lines.push('');
  if (f.mermaid) {
    lines.push(`  <script type="module">${mermaidInitJs}</script>`);
    lines.push(`  <script>${mermaidPluginJs}</script>`);
  }
  if (f.mermaidViewer) {
    lines.push(`  <script>${mermaidViewerJs}</script>`);
  }
  if (f.youtubeEmbed) {
    lines.push(`  <script>${youtubeEmbedJs}</script>`);
  }
  lines.push('');
  lines.push('  <!-- Live reload -->');
  lines.push('  <script>');
  lines.push('    const ws = new WebSocket(`ws://${location.host}/_ws`);');
  lines.push('    ws.onmessage = (e) => { const msg = JSON.parse(e.data); if (msg.type === \'reload\') window.location.reload(); };');
  lines.push('    ws.onclose = () => setTimeout(() => window.location.reload(), 1000);');
  lines.push('  </script>');
  lines.push(`  <script>${fontSizeJs}</script>`);
  lines.push(`  <script>${sidebarResizeJs}</script>`);
  lines.push('</body>');
  lines.push('</html>');

  return lines.join('\n');
}
