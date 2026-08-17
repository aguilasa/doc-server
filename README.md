# doc-server

Local Markdown documentation server with automatic navigation, Mermaid support, and live reload.

```bash
doc-server ./docs
```

Zero configuration. Zero generated files in your folder.

---

## Installation

```bash
git clone https://github.com/aguilasa/doc-server.git
cd doc-server
npm run install:local
```

`dist/` is not versioned — the `prepare` script builds it during `npm install`, so a fresh clone needs no separate build step.

Note that `npm install -g github:aguilasa/doc-server` does **not** work: npm skips devDependencies when installing a git URL globally, so `tsc` is missing when `prepare` runs. Installing it as a project dependency (`npm install github:aguilasa/doc-server`) does work, because that path does install them.

## Usage

```bash
doc-server <folder> [options]
```

The server starts at `http://localhost:4000` and automatically reloads when Markdown files change.

### Options

| Flag | Alias | Description | Default |
| --- | --- | --- | --- |
| `--port` | `-p` | Server port | `4000` (auto-increments if in use) |
| `--name` | `-n` | Site title | Folder name |
| `--config` | `-c` | Path to `.docserverrc` | `.docserverrc` in current directory |
| `--help` | `-h` | Show help | — |

---

## Configuration

Create a `.docserverrc` in the directory where you run the command (or pass the path with `--config`). All fields are optional.

```json
{
  "name": "My Documentation",
  "port": 4000,
  "homepage": "README.md",
  "exclude": ["tools/**", "vendor/**"],
  "respectGitignore": false,
  "relativePath": false,
  "sidebar": {
    "numberedPrefix": true,
    "collapsedSections": true
  },
  "features": {
    "taskLists": true,
    "mermaid": true,
    "mermaidViewer": true,
    "copyCode": true,
    "search": true,
    "pagination": true,
    "zoomImage": true,
    "pageTitle": true,
    "githubSlugs": false
  }
}
```

### Excluding folders

Serving the root of a repository pulls in every `README.md` it contains — vendored dependencies included. Two top-level fields keep them out of the sidebar and out of the file watcher:

| Field | Default | Description |
| --- | --- | --- |
| `exclude` | `[]` | Globs, anchored at the served folder, of what to leave out |
| `respectGitignore` | `false` | Also leave out whatever the root `.gitignore` ignores — **and refuse to serve it** |

```json
{ "exclude": ["tools/**", "vendor/**"], "respectGitignore": true }
```

In a glob, `**` crosses `/` while `*` and `?` stop at it, and naming a folder takes everything under it. `tools/**` matches `tools/wla-dx/README.md` and does **not** match `my-tools/x.md`; write `**/build/**` when you want any depth.

The two fields differ in reach, and the difference is deliberate:

- **`exclude` hides navigation, not access.** An excluded file is still served over HTTP — a link pointing at one still works. It only disappears from the generated sidebar and from live reload.
- **`respectGitignore` also refuses to serve.** An ignored file is not in the repository, so GitHub does not serve it either; a request for one answers `404`. Turning it on when you serve a repository root is what keeps `node_modules/`, build output and gitignored secrets off the wire.

`respectGitignore` reads the `.gitignore` of the served folder only, and supports comments, blank lines, `!` negation, `/` anchoring, patterns without a slash matching at any depth, and `*`/`**`/`?`. Nested `.gitignore` files are not read, and a trailing `/` does not restrict a pattern to folders (`build/` behaves like `build`).

### Serving a repository root

Two rules apply whatever the configuration says:

- **The server listens on `127.0.0.1` only.** It is a local documentation server; nothing on the network can reach it.
- **`.git/` is never served.** No configuration turns it back on. A repository's `.git` holds the full history and, in some setups, credentials in the remote URL of `.git/config`.

Anything else under the served root is readable over HTTP unless `respectGitignore` keeps it out — so when the served folder is a repository root, turn `respectGitignore` on.

### Link resolution — `relativePath`

GitHub accepts two link conventions; docsify only does one of them at a time.

| Written in | Link | `relativePath: false` (default) | `relativePath: true` |
| --- | --- | --- | --- |
| `/README.md` | `docs/PLANO.md` | works | works |
| `/docs/PLANO.md` | `EQUIVALENCIA.md` | **404** | works |
| `/docs/deep/NOTA.md` | `../VIZINHO.md` | **404** | works |
| `/docs/PLANO.md` | `/docs/EQUIVALENCIA.md` | works | works |

With `false`, every path without a leading slash is anchored at the served folder. With `true`, it is resolved from the file that contains it — what GitHub does.

Keep the default `false` for documentation that only lives in doc-server; turning it on changes how every existing link resolves. Turn it on for documentation that is also read on GitHub — see the next section.

---

## Writing docs that work on GitHub too

The same `.md` files, read in both places, with links that resolve the same way.

### 1. Serve the repository root

```bash
cd <repo> && doc-server .
```

Not `doc-server ./docs`. GitHub resolves links against the repository root, so doc-server has to serve the same root — otherwise a link that crosses out of `docs/` has nowhere to land.

`.docserverrc` at the repository root, and run the command from there: the config is read from the current directory, not from the served folder.

```json
{
  "relativePath": true,
  "respectGitignore": true,
  "features": { "githubSlugs": true }
}
```

All three are off by default and all three are needed: `relativePath` for relative links, `githubSlugs` for anchors, `respectGitignore` so serving a repository root does not put `node_modules/` and ignored files on the wire.

### 2. Link with relative paths

Both styles work on GitHub, and both work here — but only one works everywhere else.

| Written in | Link | GitHub | doc-server | VS Code preview, other renderers |
| --- | --- | --- | --- | --- |
| `/docs/PLANO.md` | `EQUIVALENCIA.md` | works | works¹ | works |
| `/docs/deep/NOTA.md` | `../VIZINHO.md` | works | works¹ | works |
| `/README.md` | `docs/PLANO.md` | works | works | works |
| anywhere | `/docs/PLANO.md` | works | works | **breaks** |

¹ needs `"relativePath": true`.

**Prefer relative paths.** A leading slash means "filesystem root" to every renderer that is not GitHub, so it breaks in the VS Code preview and in any other Markdown tool. It is the right choice only if you cannot turn `relativePath` on — it is the one form that resolves identically in both of doc-server's modes.

Pick one style and keep the whole repository on it.

### 3. Write anchors the way GitHub spells them

```markdown
[see the phase](../docs/PLANO.md#fase-0--ferramental)
```

With `githubSlugs` on this resolves in both places, whether the link is clicked or pasted cold into the address bar.

Two rules apply to the **heading**, because no setting fixes them:

- **Never start an anchored heading with a digit.** `## 5.1 What changed` produces an id that docsify's `querySelector` rejects. Write `## Phase 5.1 — What changed` instead.
- **An em dash is safe** with `githubSlugs` on — it becomes `--` on both sides.

### 4. The rest of the checklist

- **Keep the `.md` extension.** `[plan](../docs/PLANO)` works in docsify and 404s on GitHub.
- **Match the case exactly.** GitHub and Linux are case-sensitive; macOS is not, so a wrong case only breaks after you push.
- **Do not link to gitignored files.** With `respectGitignore` on they answer `404` — and they are not on GitHub either, because they are not in the repository. Same rule on both sides, deliberately.
- **Link the file, not the folder.** `[docs](../docs/)` shows a file tree on GitHub; here it serves that folder's `README.md`.

---

## Sidebar organization

The sidebar is generated automatically. Ordering rules applied in sequence:

1. `README.md` is always first in its section
2. Numerically prefixed files (`01-intro.md`) are sorted numerically — prefix removed from the title
3. All other files in alphabetical order

Subdirectories become collapsible sections with humanized titles (`my-folder` → **My Folder**).

File titles are extracted from the frontmatter `title:` field, the first `# Heading`, or the filename.

---

## Features

All enabled by default except **GitHub Slugs**, each individually toggled via `.docserverrc`:

| Feature | Description |
| --- | --- |
| **Mermaid** | Diagrams in ` ```mermaid ` code blocks |
| **MermaidViewer** | Modal with zoom, pan, and resize for diagrams |
| **Task Lists** | `[ ]` and `[x]` rendered as read-only checkboxes |
| **Copy Code** | Copy button on code blocks |
| **Search** | Full-text search |
| **Pagination** | Previous / Next navigation |
| **Zoom Image** | Click images to enlarge |
| **Page Title** | `<title>` updated with the current page's H1 |
| **GitHub Slugs** | GitHub-style heading anchors — **off by default**, see below |

Linked source files (`.c`, `.h`, `.py`, `.sh`, `.sql`, `.yml`, `Makefile`, …) open in the browser as plain text instead of downloading. No syntax highlighting — that is a rendered page, not a served file.

Syntax highlighting inside code blocks: `bash`, `javascript`, `typescript`, `json`, `python`, `java`, `sql`, `yaml`, `docker`, `markdown`, `nginx`, `php`, `ruby`, `go`, `rust`, `css`, `scss`, `less`.

### GitHub-style heading anchors

Docsify and GitHub disagree on how a heading becomes an anchor: docsify collapses repeated hyphens and prefixes a leading digit with `_`.

| Heading | GitHub | Docsify |
| --- | --- | --- |
| `### Fase 0 — Ferramental` | `fase-0--ferramental` | `fase-0-ferramental` |
| `## 5.1 What changed` | `51-what-changed` | `_5-1-what-changed` |

A link written for GitHub therefore navigates without scrolling — no error, no 404. Set `"features": { "githubSlugs": true }` to add a second, GitHub-named anchor next to each affected heading. The heading keeps its docsify id, so the sidebar's heading index and docsify's own links keep working.

**Known limitation:** a heading that starts with a digit still will not scroll. Docsify looks the anchor up with `querySelector`, and `#51-what-changed` is not a valid CSS selector — the browser rejects it. Nothing in docsify's configuration reaches that call. Other headings on the same page are unaffected. Avoid starting an anchored heading with a digit.

Anchors work across files as well as within one — see [Writing docs that work on GitHub too](#writing-docs-that-work-on-github-too) for how to set the whole thing up.

---

## Development

```bash
npm run build          # compile TypeScript
npm run dev            # compile in watch mode
npm test               # run tests in watch mode
npm test -- --run      # run tests once

npm run install:local  # build + install globally
npm run uninstall:local
```

Requires Node.js 20 or newer. Runtime dependencies are `chokidar` and `ws`, and nothing else — everything else is a Node builtin.

---

## License

[MIT](LICENSE) © Ingmar Aguiar
