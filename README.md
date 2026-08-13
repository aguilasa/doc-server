# doc-server

Local Markdown documentation server with automatic navigation, Mermaid support, and live reload.

```bash
doc-server ./docs
```

Zero configuration. Zero generated files in your folder.

---

## Installation

```bash
npm install -g doc-server
```

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
    "pageTitle": true
  }
}
```

### Excluding folders

Serving the root of a repository pulls in every `README.md` it contains — vendored dependencies included. Two top-level fields keep them out of the sidebar and out of the file watcher:

| Field | Default | Description |
| --- | --- | --- |
| `exclude` | `[]` | Globs, anchored at the served folder, of what to leave out |
| `respectGitignore` | `false` | Also leave out whatever the root `.gitignore` ignores |

```json
{ "exclude": ["tools/**", "vendor/**"], "respectGitignore": true }
```

In a glob, `**` crosses `/` while `*` and `?` stop at it, and naming a folder takes everything under it. `tools/**` matches `tools/wla-dx/README.md` and does **not** match `my-tools/x.md`; write `**/build/**` when you want any depth.

Excluded files are still served over HTTP — a link pointing at one still works. They only disappear from the generated navigation and from live reload.

`respectGitignore` reads the `.gitignore` of the served folder only, and supports comments, blank lines, `!` negation, `/` anchoring, patterns without a slash matching at any depth, and `*`/`**`/`?`. Nested `.gitignore` files are not read, and a trailing `/` does not restrict a pattern to folders (`build/` behaves like `build`).

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

All enabled by default, each individually disableable via `.docserverrc`:

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

Linked source files (`.c`, `.h`, `.py`, `.sh`, `.sql`, `.yml`, `Makefile`, …) open in the browser as plain text instead of downloading. No syntax highlighting — that is a rendered page, not a served file.

Syntax highlighting: `bash`, `javascript`, `typescript`, `json`, `python`, `java`, `sql`, `yaml`, `docker`, `markdown`, `nginx`, `php`, `ruby`, `go`, `rust`, `css`, `scss`, `less`.

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
