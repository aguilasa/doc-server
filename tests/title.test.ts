import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTitleFromFile } from '../src/title.js';

const fixturesDir = path.join(fileURLToPath(import.meta.url), '../../tests/fixtures');

describe('getTitleFromFile', () => {
  it('extracts title from frontmatter', () => {
    const file = path.join(fixturesDir, 'simple/guide.md');
    expect(getTitleFromFile(file)).toBe('Getting Started Guide');
  });

  it('extracts title from first # heading', () => {
    const file = path.join(fixturesDir, 'simple/intro.md');
    expect(getTitleFromFile(file)).toBe('Introduction');
  });

  it('extracts heading from file when present', () => {
    const file = path.join(fixturesDir, 'with-readme/about.md');
    expect(getTitleFromFile(file)).toBe('About');
  });

  it('falls back to filename for file without heading or frontmatter', () => {
    const file = path.join(fixturesDir, 'simple/plain-note.md');
    expect(getTitleFromFile(file)).toBe('plain note');
  });

  it('converts hyphens to spaces in fallback', () => {
    const file = path.join(fixturesDir, 'with-subdirs/guide/quickstart.md');
    expect(getTitleFromFile(file)).toBe('Quick Start');
  });

  it('strips numeric prefix from fallback', () => {
    const file = path.join(fixturesDir, 'numbered/01-overview.md');
    expect(getTitleFromFile(file)).toBe('Overview');
  });

  it('strips numeric prefix from fallback for higher numbers', () => {
    const file = path.join(fixturesDir, 'numbered/10-advanced.md');
    expect(getTitleFromFile(file)).toBe('Advanced Topics');
  });

  it('returns fallback for nonexistent file', () => {
    const file = '/nonexistent/my-doc.md';
    expect(getTitleFromFile(file)).toBe('my doc');
  });
});
