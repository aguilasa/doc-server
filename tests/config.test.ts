import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';

const fixturesDir = path.join(fileURLToPath(import.meta.url), '../../tests/fixtures');

describe('loadConfig', () => {
  it('applies all defaults when no config file', () => {
    const docsDir = path.join(fixturesDir, 'with-readme');
    const config = loadConfig(docsDir, '/nonexistent/.docserverrc');
    expect(config.name).toBe('with-readme');
    expect(config.port).toBe(4000);
    expect(config.homepage).toBe('README.md');
    expect(config.sidebar.numberedPrefix).toBe(true);
    expect(config.sidebar.collapsedSections).toBe(true);
    expect(config.sidebar.includeDotFolders).toBe(false);
    expect(config.features.taskLists).toBe(true);
    expect(config.features.mermaid).toBe(true);
    expect(config.features.youtubeEmbed).toBe(true);
    expect(config.features.downloadableAttachments).toBe(true);
    expect(config.features.pdfExport).toBe(true);
  });

  it('picks first .md alphabetically when no README', () => {
    const docsDir = path.join(fixturesDir, 'simple');
    const config = loadConfig(docsDir, '/nonexistent/.docserverrc');
    expect(config.homepage).toBe('guide.md');
  });

  it('merges partial .docserverrc over defaults', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docserver-test-'));
    const rcPath = path.join(tmpDir, '.docserverrc');
    fs.writeFileSync(rcPath, JSON.stringify({ name: 'My Site', port: 5000 }));
    const docsDir = path.join(fixturesDir, 'with-readme');

    const config = loadConfig(docsDir, rcPath);
    expect(config.name).toBe('My Site');
    expect(config.port).toBe(5000);
    expect(config.sidebar.numberedPrefix).toBe(true); // default preserved
    expect(config.features.search).toBe(true); // default preserved

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('merges partial features in .docserverrc', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docserver-test-'));
    const rcPath = path.join(tmpDir, '.docserverrc');
    fs.writeFileSync(rcPath, JSON.stringify({ features: { mermaid: false, search: false } }));
    const docsDir = path.join(fixturesDir, 'with-readme');

    const config = loadConfig(docsDir, rcPath);
    expect(config.features.mermaid).toBe(false);
    expect(config.features.search).toBe(false);
    expect(config.features.taskLists).toBe(true); // default preserved

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('enables includeDotFolders via .docserverrc', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docserver-test-'));
    const rcPath = path.join(tmpDir, '.docserverrc');
    fs.writeFileSync(rcPath, JSON.stringify({ sidebar: { includeDotFolders: true } }));
    const docsDir = path.join(fixturesDir, 'with-readme');

    const config = loadConfig(docsDir, rcPath);
    expect(config.sidebar.includeDotFolders).toBe(true);
    expect(config.sidebar.numberedPrefix).toBe(true); // default preserved

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('disables youtubeEmbed via .docserverrc', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docserver-test-'));
    const rcPath = path.join(tmpDir, '.docserverrc');
    fs.writeFileSync(rcPath, JSON.stringify({ features: { youtubeEmbed: false } }));
    const docsDir = path.join(fixturesDir, 'with-readme');

    const config = loadConfig(docsDir, rcPath);
    expect(config.features.youtubeEmbed).toBe(false);
    expect(config.features.mermaid).toBe(true); // default preserved

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('disables downloadableAttachments via .docserverrc', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docserver-test-'));
    const rcPath = path.join(tmpDir, '.docserverrc');
    fs.writeFileSync(rcPath, JSON.stringify({ features: { downloadableAttachments: false } }));
    const docsDir = path.join(fixturesDir, 'with-readme');

    const config = loadConfig(docsDir, rcPath);
    expect(config.features.downloadableAttachments).toBe(false);
    expect(config.features.mermaid).toBe(true); // default preserved

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('disables pdfExport via .docserverrc', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docserver-test-'));
    const rcPath = path.join(tmpDir, '.docserverrc');
    fs.writeFileSync(rcPath, JSON.stringify({ features: { pdfExport: false } }));
    const docsDir = path.join(fixturesDir, 'with-readme');

    const config = loadConfig(docsDir, rcPath);
    expect(config.features.pdfExport).toBe(false);
    expect(config.features.mermaid).toBe(true); // default preserved

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('fontSize defaults to 16', () => {
    const docsDir = path.join(fixturesDir, 'with-readme');
    const config = loadConfig(docsDir, '/nonexistent/.docserverrc');
    expect(config.fontSize).toBe(16);
  });

  it('fontSize is read from .docserverrc', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docserver-test-'));
    const rcPath = path.join(tmpDir, '.docserverrc');
    fs.writeFileSync(rcPath, JSON.stringify({ fontSize: 20 }));
    const docsDir = path.join(fixturesDir, 'with-readme');

    const config = loadConfig(docsDir, rcPath);
    expect(config.fontSize).toBe(20);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('exclude defaults to an empty list and respectGitignore to false', () => {
    const docsDir = path.join(fixturesDir, 'with-readme');
    const config = loadConfig(docsDir, '/nonexistent/.docserverrc');
    expect(config.exclude).toEqual([]);
    expect(config.respectGitignore).toBe(false);
  });

  it('reads exclude and respectGitignore from .docserverrc', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docserver-test-'));
    const rcPath = path.join(tmpDir, '.docserverrc');
    fs.writeFileSync(rcPath, JSON.stringify({ exclude: ['tools/**'], respectGitignore: true }));
    const docsDir = path.join(fixturesDir, 'with-readme');

    const config = loadConfig(docsDir, rcPath);
    expect(config.exclude).toEqual(['tools/**']);
    expect(config.respectGitignore).toBe(true);
    expect(config.sidebar.numberedPrefix).toBe(true); // default preserved

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('falls back to no exclusion when exclude is not a list of strings', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docserver-test-'));
    const rcPath = path.join(tmpDir, '.docserverrc');
    fs.writeFileSync(rcPath, JSON.stringify({ exclude: 'tools/**' }));
    const docsDir = path.join(fixturesDir, 'with-readme');

    const config = loadConfig(docsDir, rcPath);
    expect(config.exclude).toEqual([]);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('githubSlugs defaults to false, unlike every other feature', () => {
    const docsDir = path.join(fixturesDir, 'with-readme');
    const config = loadConfig(docsDir, '/nonexistent/.docserverrc');
    expect(config.features.githubSlugs).toBe(false);
  });

  it('enables githubSlugs via .docserverrc', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docserver-test-'));
    const rcPath = path.join(tmpDir, '.docserverrc');
    fs.writeFileSync(rcPath, JSON.stringify({ features: { githubSlugs: true } }));
    const docsDir = path.join(fixturesDir, 'with-readme');

    const config = loadConfig(docsDir, rcPath);
    expect(config.features.githubSlugs).toBe(true);
    expect(config.features.mermaid).toBe(true); // default preserved

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('CLI flags override .docserverrc', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docserver-test-'));
    const rcPath = path.join(tmpDir, '.docserverrc');
    fs.writeFileSync(rcPath, JSON.stringify({ name: 'From File', port: 5000 }));
    const docsDir = path.join(fixturesDir, 'with-readme');

    const config = loadConfig(docsDir, rcPath, { name: 'CLI Name', port: 9000 });
    expect(config.name).toBe('CLI Name');
    expect(config.port).toBe(9000);

    fs.rmSync(tmpDir, { recursive: true });
  });
});
