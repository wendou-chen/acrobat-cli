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
const { runFormCommand } = require("./commands/form.js");

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
                                   insert-blank, crop, replace-pages, watermark,
                                   compress, pdfa, extract, encrypt, decrypt,
                                   bookmarks, inject.
  ocr <pdf> [--lang <lang>] -o <txt>  OCR a PDF to text using Tesseract.
  form <command> [options]         PDF form operations.
                                   Commands: list, fill.
  annotate <pdf> --page <n> --rect <x0,y0,x1,y1> [--type highlight|text] [--text <s>] -o out.pdf
                                   Add annotations.
  sign <pdf> --text <s> --page <n> --rect <x0,y0,x1,y1> -o out.pdf
                                   Stamp a visible signature text.
  ui <command> [options]           Control hidden background Acrobat instances.
                                   Commands: open, save, save-as, print, export,
                                   close, list, status, close-all.
  doctor [--fix]                   Diagnose Acrobat processes, detect hung/hidden
                                   background instances and single-instance deadlocks.
                                   --fix: safely terminate headless zombie instances.
  kill-zombies                     Terminate background Acrobat processes without main
                                   windows to resolve launch deadlocks.
  list                             List Acrobat windows and background processes.
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

async function cmdOcr(args) {
  const file = args._[0];
  const output = args.options.output || args.options.o;
  if (!file || !output) {
    error("ocr requires a PDF path and --output/-o");
    return;
  }
  const lang = args.options.lang || "chi_sim";
  const scriptPath = path.join(__dirname, "scripts", "ocr.py");
  try {
    const out = await runPython(scriptPath, ["--lang", lang, "--output", output, file]);
    log(out);
  } catch (e) {
    error(`ocr failed: ${e.message}`);
  }
}

async function cmdAnnotate(args) {
  const file = args._[0];
  const type = args.options.type || "highlight";
  const page = Number(args.options.page);
  const rect = args.options.rect;
  const output = args.options.output || args.options.o;
  if (!file || !Number.isInteger(page) || !rect || !output) {
    error("annotate requires a PDF path, --page, --rect, --output/-o");
    return;
  }
  const text = args.options.text || "";
  const scriptPath = path.join(__dirname, "scripts", "annotate.py");
  const pyArgs = ["--type", type, "--page", String(page), "--rect", rect, "--text", text, "--output", output, file];
  try {
    const out = await runPython(scriptPath, pyArgs);
    log(out);
  } catch (e) {
    error(`annotate failed: ${e.message}`);
  }
}

async function cmdSign(args) {
  const file = args._[0];
  const text = args.options.text;
  const page = Number(args.options.page || 1);
  const rect = args.options.rect;
  const output = args.options.output || args.options.o;
  if (!file || !text || !rect || !output) {
    error("sign requires a PDF path, --text, --rect, --output/-o");
    return;
  }
  const scriptPath = path.join(__dirname, "scripts", "sign.py");
  const pyArgs = ["--text", text, "--page", String(page), "--rect", rect, "--output", output, file];
  try {
    const out = await runPython(scriptPath, pyArgs);
    log(out);
  } catch (e) {
    error(`sign failed: ${e.message}`);
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
      if (err && !stdout) {
        reject(new Error(stderr.trim() || err.message));
        return;
      }
      resolve((stdout || "").trim());
    });
  });
}

async function listAcrobatWindows() {
  const script = "$ErrorActionPreference = 'SilentlyContinue'; $procs = Get-Process -Name 'Acrobat', 'AcroRd32' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle }; if ($procs) { $procs | Select-Object Id, MainWindowTitle | ConvertTo-Json -Compress }";
  try {
    const out = await runPowerShell(script);
    if (!out) return [];
    const parsed = JSON.parse(out);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

async function getAllAcrobatProcesses() {
  const script = "$ErrorActionPreference = 'SilentlyContinue'; $procs = Get-Process -Name 'Acrobat', 'AcroRd32' -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, MainWindowTitle, MainWindowHandle, Responding, @{Name='WorkingSetMB'; Expression={[math]::Round($_.WorkingSet64/1MB, 1)}}; if ($procs) { $procs | ConvertTo-Json -Compress }";
  try {
    const out = await runPowerShell(script);
    if (!out) return [];
    const parsed = JSON.parse(out);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

async function cmdList() {
  try {
    const procs = await getAllAcrobatProcesses();
    if (procs.length === 0) {
      log("No Acrobat processes found.");
      return;
    }
    const visible = procs.filter((p) => p.MainWindowTitle && p.MainWindowHandle);
    const headless = procs.filter((p) => !p.MainWindowTitle || !p.MainWindowHandle);

    if (visible.length > 0) {
      log("Acrobat windows:");
      for (const w of visible) {
        log(`  PID ${w.Id}: ${w.MainWindowTitle} (HWND 0x${Number(w.MainWindowHandle).toString(16).toUpperCase()})`);
      }
    } else {
      log("No Acrobat window with a visible title found.");
    }

    if (headless.length > 0) {
      log(`\nBackground / headless processes (${headless.length}):`);
      for (const p of headless) {
        log(`  PID ${p.Id}: ${p.ProcessName} (${p.WorkingSetMB || 0} MB, no visible main window)`);
      }
      log("Run `acrobat-cli doctor` to inspect or `acrobat-cli kill-zombies` to clean up.");
    }
  } catch (e) {
    error(`list failed: ${e.message}`);
  }
}

async function cmdCloseOutline() {
  const tempDir = os.tmpdir().replace(/\\/g, "\\\\");
  const script = "$ErrorActionPreference = 'SilentlyContinue'; $ws = New-Object -ComObject WScript.Shell; $closedCount = 0; $targets = Get-Process -Name 'Acrobat', 'AcroRd32' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -match 'outline-markdown' }; foreach ($p in $targets) { $null = $ws.AppActivate($p.Id); Start-Sleep -Milliseconds 200; $ws.SendKeys('^w'); Start-Sleep -Milliseconds 300; $closedCount++ }; $outlineFiles = Get-ChildItem '" + tempDir + "' -Filter 'outline-markdown-export-native-*.pdf' -ErrorAction SilentlyContinue; $deletedCount = 0; foreach ($f in $outlineFiles) { try { Remove-Item -LiteralPath $f.FullName -Force -ErrorAction Stop; $deletedCount++ } catch {} }; Write-Host \"CLOSED_TABS=$closedCount, DELETED_TEMP=$deletedCount\"";
  try {
    const out = await runPowerShell(script);
    log(out || "CLOSED_TABS=0, DELETED_TEMP=0");
  } catch (e) {
    error(`close-outline failed: ${e.message}`);
  }
}

async function cmdStatus() {
  try {
    const procs = await getAllAcrobatProcesses();
    const visible = procs.filter((p) => p.MainWindowTitle && p.MainWindowHandle);
    const headless = procs.filter((p) => !p.MainWindowTitle || !p.MainWindowHandle);

    log(`Acrobat running: ${procs.length > 0 ? "yes" : "no"} (${procs.length} process${procs.length === 1 ? "" : "es"})`);
    if (visible.length > 0) {
      log("Visible windows:");
      for (const w of visible) {
        log(`  PID ${w.Id}: ${w.MainWindowTitle}`);
      }
    }
    if (headless.length > 0) {
      log(`Background / zombie instances: ${headless.length} (PIDs: ${headless.map((p) => p.Id).join(", ")})`);
      if (visible.length === 0) {
        log("  [WARN] Acrobat is running in background without any visible window.");
        log("  [WARN] This may cause single-instance launch deadlocks or tray-hidden orphan state.");
        log("  Run `acrobat-cli doctor --fix` or `acrobat-cli kill-zombies` to resolve.");
      }
    }
    const tempDir = os.tmpdir();
    let outlineFiles = [];
    try {
      outlineFiles = fs.readdirSync(tempDir).filter((n) => OUTLINE_RE.test(n));
    } catch {}
    log(`Outline temp PDFs in ${tempDir}: ${outlineFiles.length}`);
    for (const name of outlineFiles) {
      log(`  ${name}`);
    }
  } catch (e) {
    error(`status failed: ${e.message}`);
  }
}

async function cmdDoctor(args) {
  try {
    log("=== Acrobat Doctor ===");
    const procs = await getAllAcrobatProcesses();
    if (procs.length === 0) {
      log("Status: OK (No Acrobat processes running).");
      return;
    }
    log(`Total Acrobat processes found: ${procs.length}`);
    const visible = procs.filter((p) => p.MainWindowTitle && p.MainWindowHandle);
    const headless = procs.filter((p) => !p.MainWindowTitle || !p.MainWindowHandle);

    if (visible.length > 0) {
      log(`\nVisible window(s): ${visible.length}`);
      for (const w of visible) {
        log(`  - [PID ${w.Id}] ${w.MainWindowTitle} (HWND 0x${Number(w.MainWindowHandle).toString(16).toUpperCase()})`);
      }
    } else {
      log("\nVisible window(s): 0");
    }

    if (headless.length > 0) {
      log(`\nHeadless / background process(es): ${headless.length}`);
      for (const p of headless) {
        log(`  - [PID ${p.Id}] ${p.ProcessName} (Memory: ${p.WorkingSetMB || 0} MB, MainWindowHandle: 0)`);
      }
    }

    const doFix = Boolean(args.options.fix || args.options.f);
    if (headless.length > 0 && visible.length === 0) {
      log("\n[ISSUE DETECTED] SINGLE-INSTANCE LAUNCH DEADLOCK");
      log("Acrobat processes exist in background, but no visible main window is open.");
      log("Double-clicking Acrobat or PDF files will silently stall or spawn more zombie processes.");
      if (doFix) {
        log("\nApplying fix: terminating headless zombie processes...");
        const killScript = "$ErrorActionPreference = 'SilentlyContinue'; $procs = Get-Process -Name 'Acrobat', 'AcroRd32' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -eq 0 }; $cnt = @($procs).Count; if ($procs) { $procs | Stop-Process -Force }; Write-Host \"KILLED=$cnt\"";
        const res = await runPowerShell(killScript);
        log(res || "Fixed.");
        log("Zombie processes cleared. You can now launch Acrobat or open PDFs normally.");
      } else {
        log("\nRecommendation: Run `acrobat-cli doctor --fix` or `acrobat-cli kill-zombies` to clear them.");
      }
    } else if (headless.length > 2 && visible.length > 0) {
      log(`\n[NOTICE] Extra background helper/zombie processes (${headless.length}).`);
      log("Normal Acrobat 64-bit architecture uses 1 broker + 1 renderer process.");
      if (doFix) {
        log("\nCleaning up extra headless processes while keeping active window...");
        const killScript = "$ErrorActionPreference = 'SilentlyContinue'; $procs = Get-Process -Name 'Acrobat', 'AcroRd32' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -eq 0 }; $cnt = @($procs).Count; if ($procs) { $procs | Stop-Process -Force }; Write-Host \"KILLED=$cnt\"";
        const res = await runPowerShell(killScript);
        log(res || "Cleaned.");
      } else {
        log("Run `acrobat-cli doctor --fix` if you want to trim redundant background helpers.");
      }
    } else {
      log("\nStatus: Healthy.");
    }
  } catch (e) {
    error(`doctor failed: ${e.message}`);
  }
}

async function cmdKillZombies() {
  try {
    const killScript = "$ErrorActionPreference = 'SilentlyContinue'; $procs = @(Get-Process -Name 'Acrobat', 'AcroRd32' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -eq 0 }); if ($procs.Count -gt 0) { $ids = ($procs | ForEach-Object { $_.Id }) -join ', '; $procs | Stop-Process -Force; Write-Host \"Killed $($procs.Count) zombie process(es): $ids\" } else { Write-Host 'No zombie Acrobat processes found.' }";
    const out = await runPowerShell(killScript);
    log(out || "Done.");
  } catch (e) {
    error(`kill-zombies failed: ${e.message}`);
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
    case "ocr":
      await cmdOcr(args);
      break;
    case "form":
      await runFormCommand(args);
      break;
    case "annotate":
      await cmdAnnotate(args);
      break;
    case "sign":
      await cmdSign(args);
      break;
    case "ui":
      await runUiCommand(args);
      break;
    case "doctor":
      await cmdDoctor(args);
      break;
    case "kill-zombies":
      await cmdKillZombies();
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
  getAllAcrobatProcesses,
  runPowerShell,
};
