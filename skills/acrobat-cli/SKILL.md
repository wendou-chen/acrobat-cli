---
name: acrobat-cli
description: Use the acrobat-cli command-line tool to automate Adobe Acrobat PDF handling on Windows, especially closing outline-markdown-export-native-*.pdf temp PDFs, injecting self-close OpenAction JavaScript, watching the temp folder, listing Acrobat windows, and closing outline tabs. Trigger when the user asks to run acrobat-cli, close outline temp PDFs, watch for outline PDFs, inject self-close PDF actions, or automate Acrobat via CLI.
---

# Acrobat CLI

## Overview

`acrobat-cli` is a Node.js CLI for Acrobat automation on Windows. Its main use is to make `outline-markdown-export-native-*.pdf` files close themselves automatically when Acrobat opens them, and to watch the system temp folder for these files.

## Quick start

```bash
# Inject self-close OpenAction into one PDF
acrobat-cli inject "C:\Users\admin\AppData\Local\Temp\outline-markdown-export-native-abc.pdf"

# Watch system TEMP and auto-inject new outline PDFs
acrobat-cli watch

# Watch a custom directory once (process existing files and exit)
acrobat-cli watch --dir=C:\Temp --once

# Extract pages by bookmark sections (e.g. 综合题/拓展题)
acrobat-cli extract --pdf=input.pdf --chapter=相似矩阵 --sections=综合,拓展 --output=out.pdf

# List Acrobat windows
acrobat-cli list

# Best-effort close outline tabs in Acrobat
acrobat-cli close-outline

# Show Acrobat status and outline temp files
acrobat-cli status
```

## Commands

### inject

```bash
acrobat-cli inject <pdf-path> [--output=<path>]
```

Injects a document-level OpenAction into the PDF:

```js
this.closeDoc(true);
```

When Acrobat opens the PDF, it immediately closes that tab. If `--output` is omitted, the file is modified in place.

### watch

```bash
acrobat-cli watch [--dir=<path>] [--poll=<ms>] [--once]
```

Watches a directory (default: system TEMP) for filenames matching:

```regex
outline-markdown-export-native-.*\.pdf$
```

For every matching file it finds, it injects the self-close action. This is useful when the Obsidian export chain still opens temp PDFs in an already-running Acrobat.

- `--dir=<path>`: watch another directory.
- `--poll=<ms>`: polling interval, default 500 ms.
- `--once`: process existing matching files and exit instead of watching continuously.

### extract

```bash
acrobat-cli extract --pdf=<path> --chapter=<keyword> --sections=<a,b> --output=<path>
```

Extracts pages from a PDF based on bookmark sections. It finds the chapter containing `--chapter`, then selects child bookmarks matching the comma-separated `--sections` keywords (e.g. `综合,拓展`), and writes those pages to `--output`.

Requires Python 3 and `pypdf`:

```bash
pip install pypdf
```

Example:

```bash
acrobat-cli extract --pdf="26李林880题-数学一-试题分册.pdf" --chapter="相似矩阵" --sections="综合,拓展" --output="相似矩阵综合提高篇.pdf"
```

### list

```bash
acrobat-cli list
```

Lists Acrobat processes that have a main window title.

### close-outline

```bash
acrobat-cli close-outline
```

Best-effort command. It finds Acrobat windows whose title contains `outline-markdown-export-native-` and sends `Ctrl+W`. This only works when the outline tab is the active tab in that window. For reliable automatic closing, prefer `inject` or `watch`.

### status

```bash
acrobat-cli status
```

Shows whether Acrobat is running, its window titles, and outline temp PDFs present in the system temp folder.

## Windows notes

- PowerShell is used for `list`, `close-outline`, and `status`.
- `close-outline` uses `WScript.Shell.SendKeys`, so it requires an interactive desktop session.
- For `watch`, the process must keep running; stop with `Ctrl+C`.

## Example: automatic outline temp PDF cleanup

```bash
# Terminal 1: keep watching temp and auto-inject
acrobat-cli watch --poll=300

# Then export from Obsidian/kaoyan as usual.
# Any outline temp PDF that appears will be made self-closing.
```

## Resources

- `scripts/extract_by_bookmarks.py` — Python helper used by `extract`
- See the project README for installation and deployment.
