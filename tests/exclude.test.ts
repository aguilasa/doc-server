import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createExcludeFilter } from '../src/exclude.js';

const noGitignore = { respectGitignore: false };

/** Raiz temporária: um `.gitignore` em `tests/fixtures/` faria o git ignorar a própria fixture. */
function makeRootWithGitignore(content: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docserver-exclude-'));
  fs.writeFileSync(path.join(root, '.gitignore'), content);
  return root;
}

describe('createExcludeFilter', () => {
  it('excludes nothing when there is no pattern and no .gitignore', () => {
    const isExcluded = createExcludeFilter('/qualquer', { exclude: [], ...noGitignore });

    expect(isExcluded('tools/wla-dx/README.md')).toBe(false);
    expect(isExcluded('README.md')).toBe(false);
  });

  it('matches inside the excluded folder without matching a folder that merely ends with the same name', () => {
    const isExcluded = createExcludeFilter('/qualquer', { exclude: ['tools/**'], ...noGitignore });

    expect(isExcluded('tools/wla-dx/README.md')).toBe(true);
    expect(isExcluded('my-tools/x.md')).toBe(false);
  });

  it('prunes the folder itself so the scan never descends into it', () => {
    const isExcluded = createExcludeFilter('/qualquer', { exclude: ['tools/**'], ...noGitignore });

    expect(isExcluded('tools')).toBe(true);
  });

  it('excludes everything under a folder named without a wildcard', () => {
    const isExcluded = createExcludeFilter('/qualquer', { exclude: ['vendor'], ...noGitignore });

    expect(isExcluded('vendor')).toBe(true);
    expect(isExcluded('vendor/lib/README.md')).toBe(true);
    expect(isExcluded('vendors/lib/README.md')).toBe(false);
  });

  it('anchors a glob at the served root, so it does not match at any depth', () => {
    const isExcluded = createExcludeFilter('/qualquer', { exclude: ['build/**'], ...noGitignore });

    expect(isExcluded('build/out.md')).toBe(true);
    expect(isExcluded('app/build/out.md')).toBe(false);
  });

  it('matches at any depth when the glob says so', () => {
    const isExcluded = createExcludeFilter('/qualquer', { exclude: ['**/build/**'], ...noGitignore });

    expect(isExcluded('app/build/out.md')).toBe(true);
  });

  it('keeps a single star from crossing a path separator', () => {
    const isExcluded = createExcludeFilter('/qualquer', { exclude: ['*.md'], ...noGitignore });

    expect(isExcluded('nota.md')).toBe(true);
    expect(isExcluded('docs/nota.md')).toBe(false);
  });

  it('ignores a .gitignore that exists when respectGitignore is off', () => {
    const root = makeRootWithGitignore('node_modules\n');

    const isExcluded = createExcludeFilter(root, { exclude: [], respectGitignore: false });

    expect(isExcluded('node_modules/pacote/README.md')).toBe(false);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('applies a .gitignore entry at any depth when respectGitignore is on', () => {
    const root = makeRootWithGitignore('node_modules\n');

    const isExcluded = createExcludeFilter(root, { exclude: [], respectGitignore: true });

    expect(isExcluded('node_modules/pacote/README.md')).toBe(true);
    expect(isExcluded('app/node_modules/pacote/README.md')).toBe(true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('anchors a .gitignore entry that starts with a slash to the root', () => {
    const root = makeRootWithGitignore('/dist\n');

    const isExcluded = createExcludeFilter(root, { exclude: [], respectGitignore: true });

    expect(isExcluded('dist/index.md')).toBe(true);
    expect(isExcluded('app/dist/index.md')).toBe(false);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('skips blank lines and comments in .gitignore', () => {
    const root = makeRootWithGitignore('\n# comentario\n\ntmp\n');

    const isExcluded = createExcludeFilter(root, { exclude: [], respectGitignore: true });

    expect(isExcluded('tmp/rascunho.md')).toBe(true);
    expect(isExcluded('comentario/x.md')).toBe(false);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('re-includes a path negated with ! in .gitignore', () => {
    const root = makeRootWithGitignore('*.log\n!importante.log\n');

    const isExcluded = createExcludeFilter(root, { exclude: [], respectGitignore: true });

    expect(isExcluded('erro.log')).toBe(true);
    expect(isExcluded('importante.log')).toBe(false);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('keeps a folder excluded even when a file inside it is negated, the way git does', () => {
    const root = makeRootWithGitignore('build\n!build/keep.md\n');

    const isExcluded = createExcludeFilter(root, { exclude: [], respectGitignore: true });

    expect(isExcluded('build/keep.md')).toBe(true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('treats a missing .gitignore as nothing to exclude', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docserver-exclude-'));

    const isExcluded = createExcludeFilter(root, { exclude: [], respectGitignore: true });

    expect(isExcluded('README.md')).toBe(false);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('combines exclude globs with .gitignore entries', () => {
    const root = makeRootWithGitignore('node_modules\n');

    const isExcluded = createExcludeFilter(root, { exclude: ['tools/**'], respectGitignore: true });

    expect(isExcluded('tools/wla-dx/README.md')).toBe(true);
    expect(isExcluded('node_modules/pacote/README.md')).toBe(true);
    expect(isExcluded('docs/PLANO.md')).toBe(false);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
