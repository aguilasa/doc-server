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
