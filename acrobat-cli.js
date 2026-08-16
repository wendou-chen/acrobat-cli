#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { injectSelfClose, SELF_CLOSE_JS } = require("./lib/inject.js");
const { runPython } = require("./lib/python.js");
const { runPdfCommand } = require("./commands/pdf.js");
const { runUiCommand } = require("./commands/ui.js");

const OUTLINE_RE = /outline-markdown-export-native-.*\.pdf$/i;
const DEFAULT_POLL_MS = 500;

function log(message) {
  process.stdout.write(`${message}\n`);
}

function error(message) {
  process.stderr.write(`acrobat-cli: ${message}\n`);
  process.exitCode = 1;
}

function printHelp() {
  log(`acrobat-cli - Acrobat automation CLI

Usage:
  acrobat-cli <command> [options]

Commands:
  inject <pdf> [--output=<path>]   Inject a self-close OpenAction into a PDF.
                                   The PDF closes itself automatically when Acrobat opens it.
  watch [--dir=<path>] [--poll=<ms>] [--once]
                                   Watch a directory (default: system TEMP) for
                                   outline-markdown-export-native-*.pdf and inject
                                   self-close actions as files appear.
                                   --once: process existing matching files and exit.
  extract --pdf=<path> --chapter=<keyword> --sections=<a,b> --output=<path>
                                   Extract pages from a PDF by bookmark sections.
                                   Example:
                                     acrobat-cli extract --pdf=input.pdf --chapter=相似矩阵 --sections=综合,拓展 --output=out.pdf
  pdf <command> [options]          PDF document operations.
                                   Commands: info, merge, split, rotate, delete,
                                   extract, encrypt, decrypt, bookmarks, inject.
  ui <command> [options]           Control hidden background Acrobat instances.
                                   Commands: open, save, save-as, print, close, list, status, close-all.
  list                             List Acrobat windows and their titles.
  close-outline                    Best-effort close of Acrobat tabs whose title matches
                                   outline-markdown-export-native-*.pdf (sends Ctrl+W).
  status                           Show Acrobat status and outline temp PDFs.
  version                          Print version.
  help                             Print this help.

Examples:
  acrobat-cli inject C:\\Temp\\outline-markdown-export-native-abc.pdf
  acrobat-cli watch
  acrobat-cli watch --dir=C:\\Temp --poll=300
  acrobat-cli watch --once
  acrobat-cli list
  acrobat-cli close-outline
  acrobat-cli extract --pdf=input.pdf --chapter=相似矩阵 --sections=综合,拓展 --output=out.pdf
  acrobat-cli ui open input.pdf
`);
}

function version() {
  const pkg = require("./package.json");
  log(pkg.version);
}

async function cmdInject(args) {
  const pdfPath = args._[0];
  if (!pdfPath) {
    error("inject requires a PDF path");
    return;
  }
  const outputPath = args.options.output || pdfPath;
  if (!fs.existsSync(pdfPath)) {
    error(`file not found: ${pdfPath}`);
    return;
  }
  try {
    await injectSelfClose(pdfPath, outputPath);
    log(`Injected self-close action: ${pdfPath}${outputPath !== pdfPath ? ` -> ${outputPath}` : ""}`);
  } catch (e) {
    error(`inject failed: ${e.message}`);
  }
}

function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq >= 0) {
        options[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        const key = arg.slice(2);
        if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
          options[key] = argv[++i];
        } else {
          options[key] = true;
        }
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      const key = arg.slice(1);
      if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
        options[key] = argv[++i];
      } else {
        options[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { _: positional, options };
}

async function processPdfFile(pdfPath, quiet = false) {
  if (!fs.existsSync(pdfPath)) return false;
  try {
    await injectSelfClose(pdfPath, pdfPath);
    if (!quiet) log(`Injected: ${pdfPath}`);
    return true;
  } catch (e) {
    error(`Failed to inject ${pdfPath}: ${e.message}`);
    return false;
  }
}

async function scanAndInject(dir, processed, quiet = false) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir);
  } catch (e) {
    error(`cannot read directory ${dir}: ${e.message}`);
    return;
  }
  for (const name of entries) {
    if (!OUTLINE_RE.test(name)) continue;
    const full = path.join(dir, name);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;
    const key = `${full}:${stat.size}:${stat.mtimeMs}`;
    if (processed.has(key)) continue;
    processed.add(key);
    await processPdfFile(full, quiet);
  }
}

async function cmdWatch(args) {
  const dir = args.options.dir || os.tmpdir();
  const pollMs = Number(args.options.poll || DEFAULT_POLL_MS);
  const once = Boolean(args.options.once);
  const processed = new Set();
  if (once) {
    await scanAndInject(dir, processed, false);
    return;
  }
  log(`Watching ${dir} for outline temp PDFs (poll=${pollMs}ms). Ctrl+C to stop.`);
  await scanAndInject(dir, processed, false);
  const timer = setInterval(() => {
    scanAndInject(dir, processed, false).catch((e) => error(e.message));
  }, pollMs);
  const stop = () => {
    clearInterval(timer);
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

async function cmdExtract(args) {
  const pdf = args.options.pdf;
  const chapter = args.options.chapter;
  const sections = args.options.sections;
  const output = args.options.output;
  if (!pdf || !chapter || !sections || !output) {
    error("extract requires --pdf, --chapter, --sections, --output");
    return;
  }
  if (!fs.existsSync(pdf)) {
    error(`file not found: ${pdf}`);
    return;
  }
  const scriptPath = path.join(__dirname, "scripts", "extract_by_bookmarks.py");
  const pyArgs = [
    "--pdf", pdf,
    "--chapter", chapter,
    "--sections", sections,
    "--output", output,
  ];
  try {
    const out = await runPython(scriptPath, pyArgs);
    log(out);
  } catch (e) {
    error(`extract failed: ${e.message}`);
  }
}

function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    const ps = process.env.SystemRoot
      ? path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
      : "powershell.exe";
    execFile(ps, ["-NoProfile", "-NonInteractive", "-Command", script], {
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr.trim() || err.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function listAcrobatWindows() {
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
Get-Process -Name 'Acrobat' | Where-Object { $_.MainWindowTitle } |
  Select-Object Id, MainWindowTitle |
  ConvertTo-Json -Compress
`;
  const out = await runPowerShell(script);
  if (!out) return [];
  const parsed = JSON.parse(out);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function cmdList() {
  try {
    const windows = await listAcrobatWindows();
    if (windows.length === 0) {
      log("No Acrobat window with a title found.");
      return;
    }
    log("Acrobat windows:");
    for (const w of windows) {
      log(`  PID ${w.Id}: ${w.MainWindowTitle}`);
    }
  } catch (e) {
    error(`list failed: ${e.message}`);
  }
}

async function cmdCloseOutline() {
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$ws = New-Object -ComObject WScript.Shell
$targets = Get-Process -Name 'Acrobat' | Where-Object { $_.MainWindowTitle -match 'outline-markdown-export-native-' }
foreach ($p in $targets) {
  $null = $ws.AppActivate($p.Id)
  Start-Sleep -Milliseconds 200
  $ws.SendKeys('^w')
  Start-Sleep -Milliseconds 300
}
if ($targets.Count -eq 0) { 'NO_MATCH' } else { "CLOSED=$($targets.Count)" }
`;
  try {
    const out = await runPowerShell(script);
    if (out.includes("NO_MATCH")) {
      log("No outline temp PDF tab found in Acrobat title.");
    } else {
      log(out);
    }
  } catch (e) {
    error(`close-outline failed: ${e.message}`);
  }
}

async function cmdStatus() {
  try {
    const windows = await listAcrobatWindows();
    log(`Acrobat running: ${windows.length > 0 ? "yes" : "no"}`);
    if (windows.length > 0) {
      log("Acrobat windows:");
      for (const w of windows) {
        log(`  PID ${w.Id}: ${w.MainWindowTitle}`);
      }
    }
    const tempDir = os.tmpdir();
    const outlineFiles = fs.readdirSync(tempDir).filter((n) => OUTLINE_RE.test(n));
    log(`Outline temp PDFs in ${tempDir}: ${outlineFiles.length}`);
    for (const name of outlineFiles) {
      log(`  ${name}`);
    }
  } catch (e) {
    error(`status failed: ${e.message}`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    printHelp();
    return;
  }
  const command = argv[0];
  const args = parseArgs(argv.slice(1));
  switch (command) {
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    case "version":
    case "--version":
    case "-v":
      version();
      break;
    case "inject":
      await cmdInject(args);
      break;
    case "watch":
      await cmdWatch(args);
      break;
    case "extract":
      await cmdExtract(args);
      break;
    case "pdf":
      await runPdfCommand(args);
      break;
    case "ui":
      await runUiCommand(args);
      break;
    case "list":
      await cmdList();
      break;
    case "close-outline":
      await cmdCloseOutline();
      break;
    case "status":
      await cmdStatus();
      break;
    default:
      error(`unknown command: ${command}`);
      printHelp();
  }
}

if (require.main === module) {
  main().catch((e) => {
    error(e.stack || e.message);
  });
}

module.exports = {
  OUTLINE_RE,
  SELF_CLOSE_JS,
  injectSelfClose,
  parseArgs,
  scanAndInject,
  processPdfFile,
  listAcrobatWindows,
  runPowerShell,
};
