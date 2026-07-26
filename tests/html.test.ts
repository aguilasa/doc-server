import { describe, it, expect } from 'vitest';
import { generateHtml } from '../src/html.js';
import type { DocServerConfig } from '../src/config.js';

function makeConfig(
  overrides: Partial<DocServerConfig['features']> = {},
  fontSize = 16,
): DocServerConfig {
  return {
    name: 'Test Docs',
    port: 4000,
    homepage: 'README.md',
    fontSize,
    sidebar: { numberedPrefix: true, collapsedSections: true, includeDotFolders: false },
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
      ...overrides,
    },
  };
}

describe('generateHtml', () => {
  it('includes docsify core script', () => {
    const html = generateHtml(makeConfig());
    expect(html).toContain('cdn.jsdelivr.net/npm/docsify@4');
  });

  it('includes config.name in title and window.$docsify', () => {
    const html = generateHtml(makeConfig());
    expect(html).toContain('<title>Test Docs</title>');
    expect(html).toContain("name: 'Test Docs'");
  });

  it('includes search when enabled', () => {
    const html = generateHtml(makeConfig({ search: true }));
    expect(html).toContain("search: 'auto'");
    expect(html).toContain('search.min.js');
  });

  it('excludes search when disabled', () => {
    const html = generateHtml(makeConfig({ search: false }));
    expect(html).not.toContain("search: 'auto'");
    expect(html).not.toContain('search.min.js');
  });

  it('includes mermaid scripts when enabled', () => {
    const html = generateHtml(makeConfig({ mermaid: true }));
    expect(html).toContain('mermaid.initialize');
    expect(html).toContain('mermaidPlugin');
    expect(html).toContain('mermaidConfig');
  });

  it('excludes mermaid scripts when disabled', () => {
    const html = generateHtml(makeConfig({ mermaid: false }));
    expect(html).not.toContain('mermaidConfig');
  });

  it('includes mermaid-viewer CSS and JS when enabled', () => {
    const html = generateHtml(makeConfig({ mermaidViewer: true }));
    expect(html).toContain('MermaidViewer');
    expect(html).toContain('mermaid-viewer-overlay');
  });

  it('excludes mermaid-viewer when disabled', () => {
    const html = generateHtml(makeConfig({ mermaidViewer: false }));
    expect(html).not.toContain('MermaidViewer');
  });

  it('includes copyCode plugin when enabled', () => {
    const html = generateHtml(makeConfig({ copyCode: true }));
    expect(html).toContain('docsify-copy-code');
    expect(html).toContain('copyCode:');
  });

  it('excludes copyCode plugin when disabled', () => {
    const html = generateHtml(makeConfig({ copyCode: false }));
    expect(html).not.toContain('docsify-copy-code');
    expect(html).not.toContain('copyCode:');
  });

  it('includes pagination plugin when enabled', () => {
    const html = generateHtml(makeConfig({ pagination: true }));
    expect(html).toContain('docsify-pagination');
    expect(html).toContain('pagination:');
  });

  it('excludes pagination plugin when disabled', () => {
    const html = generateHtml(makeConfig({ pagination: false }));
    expect(html).not.toContain('docsify-pagination');
    expect(html).not.toContain('pagination:');
  });

  it('includes zoom-image plugin when enabled', () => {
    const html = generateHtml(makeConfig({ zoomImage: true }));
    expect(html).toContain('zoom-image');
  });

  it('excludes zoom-image plugin when disabled', () => {
    const html = generateHtml(makeConfig({ zoomImage: false }));
    expect(html).not.toContain('zoom-image');
  });

  it('includes youtube-embed CSS and JS when enabled', () => {
    const html = generateHtml(makeConfig({ youtubeEmbed: true }));
    expect(html).toContain('youtube-embed');
    expect(html).toContain('youtube-nocookie.com/embed/');
  });

  it('excludes youtube-embed when disabled', () => {
    const html = generateHtml(makeConfig({ youtubeEmbed: false }));
    expect(html).not.toContain('youtube-nocookie.com/embed/');
  });

  it('includes downloadable-links script when enabled', () => {
    const html = generateHtml(makeConfig({ downloadableAttachments: true }));
    expect(html).toContain('downloadableLinksPlugin');
  });

  it('excludes downloadable-links script when disabled', () => {
    const html = generateHtml(makeConfig({ downloadableAttachments: false }));
    expect(html).not.toContain('downloadableLinksPlugin');
  });

  it('includes pdf-export button and print styles when enabled', () => {
    const html = generateHtml(makeConfig({ pdfExport: true }));
    expect(html).toContain('doc-pdf-export-btn');
    expect(html).toContain('window.print()');
    expect(html).toContain('@media print');
  });

  it('excludes pdf-export button and print styles when disabled', () => {
    const html = generateHtml(makeConfig({ pdfExport: false }));
    expect(html).not.toContain('doc-pdf-export-btn');
    expect(html).not.toContain('@media print');
  });

  it('includes live reload WebSocket script', () => {
    const html = generateHtml(makeConfig());
    expect(html).toContain('/_ws');
    expect(html).toContain('window.location.reload()');
  });

  it('includes task-lists script when enabled', () => {
    const html = generateHtml(makeConfig({ taskLists: true }));
    expect(html).toContain('renderTaskLists');
  });

  it('excludes task-lists script when disabled', () => {
    const html = generateHtml(makeConfig({ taskLists: false }));
    expect(html).not.toContain('renderTaskLists');
  });

  it('contains --doc-font-size: 16px by default', () => {
    const html = generateHtml(makeConfig({}, 16));
    expect(html).toContain('--doc-font-size: 16px');
  });

  it('contains --doc-font-size: 20px when fontSize is 20', () => {
    const html = generateHtml(makeConfig({}, 20));
    expect(html).toContain('--doc-font-size: 20px');
  });

  it('contains sidebar-resize-handle in all configurations', () => {
    const html = generateHtml(makeConfig());
    expect(html).toContain('sidebar-resize-handle');
  });

  it('contains sidebar-resize-handle even when all features disabled', () => {
    const html = generateHtml(makeConfig({
      taskLists: false, mermaid: false, mermaidViewer: false,
      copyCode: false, search: false, pagination: false,
      zoomImage: false, pageTitle: false, youtubeEmbed: false,
      downloadableAttachments: false, pdfExport: false,
    }));
    expect(html).toContain('sidebar-resize-handle');
  });
});
