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
    expect(config.features.taskLists).toBe(true);
    expect(config.features.mermaid).toBe(true);
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
