import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Decide quais entries ficam de fora da sidebar e do watcher.
 *
 * O caminho avaliado é sempre relativo à raiz servida e em POSIX ('a/b/c.md'),
 * porque é assim que o usuário escreve o glob no `.docserverrc` e no
 * `.gitignore` — e porque href de sidebar é POSIX mesmo no Windows.
 */

/** Padrão já compilado. `negated` é o `!` do `.gitignore`; glob de `exclude` nunca nega. */
interface Rule {
  readonly re: RegExp;
  readonly negated: boolean;
}

export interface ExcludeOptions {
  /** Globs do `.docserverrc`, ancorados na raiz. */
  readonly exclude: readonly string[];
  /** Quando ligado, o `.gitignore` da raiz também exclui. */
  readonly respectGitignore: boolean;
}

export interface ServeOptions {
  /** Quando ligado, o que o `.gitignore` da raiz cobre também não é servido. */
  readonly respectGitignore: boolean;
}

/** Verdadeiro quando a entry fica de fora. */
export type ExcludeFilter = (relPath: string) => boolean;

const GITIGNORE_FILE = '.gitignore';

const GIT_DIR = '.git';

const EXCLUDES_NOTHING: ExcludeFilter = () => false;

export function createExcludeFilter(rootDir: string, opts: ExcludeOptions): ExcludeFilter {
  const rules: Rule[] = [
    ...opts.exclude.flatMap(pattern => compilePattern(pattern, 'glob')),
    ...(opts.respectGitignore ? readGitignoreRules(rootDir) : []),
  ];

  if (rules.length === 0) return EXCLUDES_NOTHING;

  return relPath => isExcluded(rules, relPath);
}

/**
 * Decide o que a rota estática **recusa**. Verdadeiro quando o caminho não é
 * servível.
 *
 * Difere do filtro da sidebar em duas coisas, e as duas são deliberadas:
 *
 * - **`exclude` não entra aqui.** Ele significa "não navegue para isto", não
 *   "não sirva isto": um link para um arquivo excluído continua resolvendo.
 * - **`.git/` nunca é servível**, com ou sem configuração. Servir a raiz de um
 *   repositório — que é o que dá paridade de link com o GitHub — deixaria o
 *   histórico inteiro e a URL de remote do `.git/config` legíveis por HTTP.
 *
 * `respectGitignore` vale aqui pelo que ele já significa: arquivo ignorado não
 * está no repositório, logo o GitHub também não o serve.
 */
export function createServeFilter(rootDir: string, opts: ServeOptions): ExcludeFilter {
  const configured = createExcludeFilter(rootDir, {
    exclude: [],
    respectGitignore: opts.respectGitignore,
  });
  return relPath => isInsideGitDir(relPath) || configured(relPath);
}

/**
 * A pasta `.git` e tudo abaixo dela. Avaliada fora do casador de padrões de
 * propósito: ali o último padrão que casa vence, e um `!` no `.gitignore`
 * poderia reabrir o que esta regra fecha.
 */
function isInsideGitDir(relPath: string): boolean {
  return relPath === GIT_DIR || relPath.startsWith(GIT_DIR + '/');
}

/**
 * Uma pasta excluída leva junto tudo que está dentro dela — é a regra do git, e
 * é o que permite podar a varredura em vez de percorrer a subárvore inteira.
 * Por isso a decisão é tomada ancestral por ancestral, do topo para baixo.
 */
function isExcluded(rules: readonly Rule[], relPath: string): boolean {
  for (const prefix of ancestors(relPath)) {
    let excluded = false;
    for (const rule of rules) {
      // Último padrão que casa decide, como no .gitignore.
      if (rule.re.test(prefix)) excluded = !rule.negated;
    }
    if (excluded) return true;
  }
  return false;
}

/** 'a/b/c.md' → ['a', 'a/b', 'a/b/c.md'] */
function ancestors(relPath: string): string[] {
  const segments = relPath.split('/').filter(s => s !== '');
  return segments.map((_, i) => segments.slice(0, i + 1).join('/'));
}

type PatternSource = 'glob' | 'gitignore';

/**
 * Um padrão pode virar mais de uma regra:
 *
 * - `tools/**` também casa com `tools`, senão a pasta não é podada e a
 *   varredura desce nela só para descartar tudo lá dentro;
 * - padrão de `.gitignore` sem barra vale em qualquer nível (`node_modules`
 *   pega `a/node_modules`), então ganha a forma ancorada e a de qualquer nível.
 */
function compilePattern(rawPattern: string, source: PatternSource): Rule[] {
  const trimmed = rawPattern.trim();
  if (trimmed === '' || trimmed.startsWith('#')) return [];

  const negated = trimmed.startsWith('!');
  const withoutBang = negated ? trimmed.slice(1) : trimmed;

  // Barra final marca "só pasta" no .gitignore. Aqui a distinção é ignorada:
  // a poda por ancestral já cobre o conteúdo, e um arquivo com o nome de uma
  // pasta ignorada é caso raro o bastante para não pagar a complexidade.
  const stripped = withoutBang.replace(/\/+$/, '');
  if (stripped === '') return [];

  const anchored = stripped.startsWith('/') ? stripped.slice(1) : stripped;
  if (anchored === '') return [];

  const patterns = [anchored];

  const anyDepth = source === 'gitignore' && !stripped.startsWith('/') && !stripped.includes('/');
  if (anyDepth) patterns.push(`**/${anchored}`);

  const prunesDir = anchored.endsWith('/**');
  if (prunesDir) patterns.push(anchored.slice(0, -3));

  return patterns.map(p => ({ re: globToRegExp(p), negated }));
}

/**
 * `**` atravessa barra, `*` e `?` param nela. O casamento é do caminho inteiro:
 * é o que faz `tools/**` pegar `tools/wla-dx/README.md` e não pegar
 * `my-tools/x.md`.
 */
function globToRegExp(glob: string): RegExp {
  const parts: string[] = [];

  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === '*') {
      if (glob[i + 1] === '*') {
        parts.push('.*');
        i++;
      } else {
        parts.push('[^/]*');
      }
    } else if (char === '?') {
      parts.push('[^/]');
    } else {
      parts.push(char.replace(/[.+^${}()|[\]\\]/g, '\\$&'));
    }
  }

  return new RegExp(`^${parts.join('')}$`);
}

function readGitignoreRules(rootDir: string): Rule[] {
  const gitignorePath = path.join(rootDir, GITIGNORE_FILE);

  let content: string;
  try {
    content = fs.readFileSync(gitignorePath, 'utf-8');
  } catch (err) {
    // Raiz sem .gitignore é o caso comum, não erro. Qualquer outra falha o
    // usuário pode consertar, então precisa saber dela.
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`Aviso: não foi possível ler ${gitignorePath} (${message})`);
    }
    return [];
  }

  return content.split(/\r?\n/).flatMap(line => compilePattern(line, 'gitignore'));
}
