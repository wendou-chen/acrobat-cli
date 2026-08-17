---
name: acrobat-cli
description: Use the acrobat-cli command-line tool to automate Adobe Acrobat and PDF handling on Windows. Supports closing outline-markdown-export-native-*.pdf temp PDFs, injecting self-close OpenAction JavaScript, watching the temp folder, listing Acrobat windows, closing outline tabs, and PDF document operations via the `pdf` subcommand (info, merge, split, rotate, delete, extract by bookmarks, encrypt, decrypt, bookmarks, inject). Trigger when the user asks to run acrobat-cli, close outline temp PDFs, watch for outline PDFs, inject self-close PDF actions, extract/bookmark PDF sections, or automate Acrobat/PDF via CLI.
---

# Acrobat CLI

## Overview

`acrobat-cli` is a Node.js CLI for Acrobat and PDF automation on Windows. Its main uses are:
- Making `outline-markdown-export-native-*.pdf` files close themselves automatically when Acrobat opens them.
- Watching the system temp folder for these files.
- Performing PDF document operations through the `pdf` subcommand (info, merge, split, rotate, delete, extract by bookmarks, encrypt, decrypt, bookmarks, inject).

## Quick start

```bash
# Inject self-close OpenAction into one PDF
acrobat-cli inject "C:\Users\admin\AppData\Local\Temp\outline-markdown-export-native-abc.pdf"

# Watch system TEMP and auto-inject new outline PDFs
acrobat-cli watch

# Watch a custom directory once (process existing files and exit)
acrobat-cli watch --dir=C:\Temp --once

# Extract pages by bookmark sections (e.g. 综合题/拓展题)
acrobat-cli pdf extract input.pdf --chapter 相似矩阵 --sections="综合,拓展" -o out.pdf

# PDF info / merge / split / rotate / delete / encrypt / decrypt / bookmarks / inject
acrobat-cli pdf info input.pdf
acrobat-cli pdf merge a.pdf b.pdf -o merged.pdf
acrobat-cli pdf split input.pdf --ranges 1-3,5 -o split_dir
acrobat-cli pdf rotate input.pdf --pages 1 --angle 90 -o rotated.pdf
acrobat-cli pdf delete input.pdf --pages 2,4 -o deleted.pdf
acrobat-cli pdf insert-blank input.pdf --after 2 -o inserted.pdf
acrobat-cli pdf crop input.pdf --pages 1-3 --box 0,0,300,400 -o cropped.pdf
acrobat-cli pdf replace-pages input.pdf --src src.pdf --range 1-3 -o replaced.pdf
acrobat-cli pdf watermark input.pdf --text 机密 -o watermarked.pdf
acrobat-cli pdf compress input.pdf -o compressed.pdf
acrobat-cli pdf pdfa input.pdf -o pdfa.pdf
acrobat-cli pdf encrypt input.pdf --user-password 123 --owner-password 456 -o encrypted.pdf
acrobat-cli pdf decrypt encrypted.pdf --password 123 -o decrypted.pdf
acrobat-cli pdf bookmarks input.pdf
acrobat-cli pdf inject input.pdf

# Hidden background Acrobat
acrobat-cli ui open input.pdf
acrobat-cli ui save input.pdf
acrobat-cli ui save-as input.pdf output.pdf
acrobat-cli ui print input.pdf --pages 1-3
acrobat-cli ui export input.pdf --format docx -o output.docx
acrobat-cli ui list

# OCR / form / annotate / sign
acrobat-cli ocr input.pdf -o output.txt
acrobat-cli form list input.pdf
acrobat-cli form fill input.pdf --field name --value 张三 -o filled.pdf
acrobat-cli annotate input.pdf --page 1 --rect 10,10,100,100 -o annotated.pdf
acrobat-cli sign input.pdf --text 签名 --page 1 --rect 10,10,200,100 -o signed.pdf
acrobat-cli ui status --pid <pid>
acrobat-cli ui close --pid <pid>
acrobat-cli ui close-all

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

### pdf

The `pdf` group contains PDF document operations. Requires Python 3 and `pypdf`:

```bash
pip install pypdf
```

```bash
# Info
acrobat-cli pdf info <file>

# Merge
acrobat-cli pdf merge a.pdf b.pdf -o merged.pdf

# Split
acrobat-cli pdf split <file> --ranges 1-3,5 -o split_dir

# Rotate
acrobat-cli pdf rotate <file> --pages 1-3 --angle 90 -o rotated.pdf

# Delete pages
acrobat-cli pdf delete <file> --pages 2,4 -o deleted.pdf

# Insert blank page
acrobat-cli pdf insert-blank <file> --after 2 -o inserted.pdf

# Crop pages
acrobat-cli pdf crop <file> --pages 1-3 --box 0,0,300,400 -o cropped.pdf

# Replace pages
acrobat-cli pdf replace-pages <file> --src src.pdf --range 1-3 -o replaced.pdf

# Watermark
acrobat-cli pdf watermark <file> --text 机密 -o watermarked.pdf

# Compress
acrobat-cli pdf compress <file> -o compressed.pdf

# Best-effort PDF/A
acrobat-cli pdf pdfa <file> -o pdfa.pdf

# Extract pages by bookmark sections
acrobat-cli pdf extract <file> --chapter 相似矩阵 --sections="综合,拓展" -o out.pdf

# Encrypt
acrobat-cli pdf encrypt <file> --user-password 123 --owner-password 456 -o encrypted.pdf

# Decrypt
acrobat-cli pdf decrypt <file> --password 123 -o decrypted.pdf

# Bookmarks
acrobat-cli pdf bookmarks <file>

# Inject self-close
acrobat-cli pdf inject <file>
```

`pdf extract` finds the chapter containing `--chapter`, then selects child bookmarks matching the comma-separated `--sections` keywords (e.g. `综合,拓展`), and writes those pages to `--output`.

### ui

```bash
acrobat-cli ui open <pdf> [--visible]
acrobat-cli ui save <pdf>
acrobat-cli ui save-as <pdf> <output>
acrobat-cli ui print <pdf> [--pages 1-3]
acrobat-cli ui export <pdf> --format txt|png|docx|xlsx|pptx|html -o <output> [--native-only]
acrobat-cli ui native-check <pdf>
acrobat-cli ui close --pid <pid>
acrobat-cli ui list
acrobat-cli ui status --pid <pid>
acrobat-cli ui close-all
```

Launches Acrobat as an independent background instance using `/n`; the default is hidden (`Start-Process -WindowStyle Hidden`). Add `--visible` / `--foreground` to open in the foreground. It records the PID and only closes instances started by the CLI, so your normal Acrobat windows are not affected. `save`, `save-as`, and `print` use Acrobat COM. `export` tries Acrobat native `doc.SaveAs(..., com.adobe.acrobat.*)` first; if the JS bridge/filter is unavailable, `ui native-check` reports it and `export` falls back to PyMuPDF/python-docx/openpyxl.

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

### ocr

```bash
acrobat-cli ocr <pdf> [--lang chi_sim] -o <txt>
```

Uses Tesseract to OCR the PDF into a text file.

### form

```bash
acrobat-cli form list <pdf>
acrobat-cli form fill <pdf> --field <name> --value <value> -o out.pdf
```

Lists or fills AcroForm fields.

### annotate

```bash
acrobat-cli annotate <pdf> --page <n> --rect <x0,y0,x1,y1> [--type highlight|text] [--text <s>] -o out.pdf
```

Adds a highlight or text annotation to a page.

### sign

```bash
acrobat-cli sign <pdf> --text <s> --page <n> --rect <x0,y0,x1,y1> -o out.pdf
```

Stamps a visible signature text onto a page.

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

- `scripts/pdf/*.py` — Python helpers used by `pdf` subcommands
- See the project README for installation and deployment.
