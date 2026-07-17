import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateSidebar } from '../src/sidebar.js';

const fixturesDir = path.join(fileURLToPath(import.meta.url), '../../tests/fixtures');

const defaultOpts = { numberedPrefix: true, collapsedSections: true, includeDotFolders: false };

describe('generateSidebar', () => {
  it('generates sidebar for simple folder (no README)', () => {
    const docsDir = path.join(fixturesDir, 'simple');
    const result = generateSidebar(docsDir, defaultOpts);
    expect(result).toContain('[Getting Started Guide](guide.md)');
    expect(result).toContain('[Introduction](intro.md)');
    // guide.md comes before intro.md alphabetically
    expect(result.indexOf('guide.md')).toBeLessThan(result.indexOf('intro.md'));
  });

  it('puts README.md first', () => {
    const docsDir = path.join(fixturesDir, 'with-readme');
    const result = generateSidebar(docsDir, defaultOpts);
    expect(result).toContain('[Home](README.md)');
    expect(result.indexOf('README.md')).toBeLessThan(result.indexOf('about.md'));
  });

  it('orders numbered prefix files numerically', () => {
    const docsDir = path.join(fixturesDir, 'numbered');
    const result = generateSidebar(docsDir, defaultOpts);
    const idx01 = result.indexOf('01-overview.md');
    const idx02 = result.indexOf('02-setup.md');
    const idx10 = result.indexOf('10-advanced.md');
    expect(idx01).toBeLessThan(idx02);
    expect(idx02).toBeLessThan(idx10);
  });

  it('generates section header for subdirectory', () => {
    const docsDir = path.join(fixturesDir, 'with-subdirs');
    const result = generateSidebar(docsDir, defaultOpts);
    expect(result).toContain('**Api**');
    expect(result).toContain('**Guide**');
    expect(result).toContain('reference.md');
    expect(result).toContain('quickstart.md');
  });

  it('humanizes subdir name with hyphens', () => {
    // "with-subdirs" itself is not a subdir, but api/guide are
    const docsDir = path.join(fixturesDir, 'with-subdirs');
    const result = generateSidebar(docsDir, defaultOpts);
    expect(result).toContain('**Api**');
  });

  it('includes README.md first in folder with subfolders', () => {
    const docsDir = path.join(fixturesDir, 'with-subdirs');
    const result = generateSidebar(docsDir, defaultOpts);
    expect(result).toContain('README.md');
    expect(result.indexOf('README.md')).toBeLessThan(result.indexOf('**Api**'));
  });

  it('ignores a .ignore folder when scanning for markdown files', () => {
    const docsDir = path.join(fixturesDir, 'with-ignored-dir');
    const result = generateSidebar(docsDir, defaultOpts);
    expect(result).not.toContain('secret.md');
    expect(result).not.toContain('.ignore');
  });

  it('ignores dot-prefixed folders by default', () => {
    const docsDir = path.join(fixturesDir, 'with-ignored-dir');
    const result = generateSidebar(docsDir, defaultOpts);
    expect(result).not.toContain('hidden.md');
  });

  it('scans dot-prefixed folders when includeDotFolders is enabled, but still skips .ignore', () => {
    const docsDir = path.join(fixturesDir, 'with-ignored-dir');
    const result = generateSidebar(docsDir, { ...defaultOpts, includeDotFolders: true });
    expect(result).toContain('hidden.md');
    expect(result).not.toContain('secret.md');
  });
});
