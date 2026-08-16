"use strict";

const {
  launchHidden,
  closePid,
  listPids,
  isPidAlive,
  closeAll,
} = require("../lib/background.js");
const { save, saveAs, printPdf } = require("../lib/com.js");

async function cmdOpen(args) {
  const file = args._[0];
  if (!file) throw new Error("ui open requires a PDF path");
  const pid = await launchHidden(file);
  return `Opened hidden Acrobat PID ${pid}: ${file}`;
}

async function cmdSave(args) {
  const file = args._[0];
  if (!file) throw new Error("ui save requires a PDF path");
  await save(file);
  return `Saved: ${file}`;
}

async function cmdSaveAs(args) {
  const src = args._[0];
  const dst = args._[1] || args.options.output || args.options.o;
  if (!src) throw new Error("ui save-as requires a source PDF path");
  if (!dst) throw new Error("ui save-as requires an output path");
  await saveAs(src, dst);
  return `Saved as: ${dst}`;
}

async function cmdPrint(args) {
  const file = args._[0];
  if (!file) throw new Error("ui print requires a PDF path");
  let first = 0;
  let last = -1;
  if (args.options.pages) {
    const m = String(args.options.pages).match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error("ui print --pages must be like 1 or 1-3");
    first = Number(m[1]) - 1;
    last = m[2] ? Number(m[2]) - 1 : first;
  }
  await printPdf(file, first, last);
  return `Printed: ${file}`;
}

async function cmdClose(args) {
  const pid = Number(args.options.pid);
  if (!pid) throw new Error("ui close requires --pid");
  await closePid(pid);
  return `Closed hidden Acrobat PID ${pid}`;
}

async function cmdList() {
  const pids = await listPids();
  if (pids.length === 0) return "No hidden Acrobat instances.";
  return `Hidden Acrobat PIDs:\n${pids.join("\n")}`;
}

async function cmdStatus(args) {
  const pid = Number(args.options.pid);
  if (!pid) throw new Error("ui status requires --pid");
  const alive = await isPidAlive(pid);
  return alive ? `PID ${pid}: running` : `PID ${pid}: not running`;
}

async function cmdCloseAll() {
  const result = await closeAll();
  return `Closed ${result.closed} hidden instance(s).${result.errors.length ? ` Errors: ${result.errors.join("; ")}` : ""}`;
}

const handlers = {
  open: cmdOpen,
  save: cmdSave,
  "save-as": cmdSaveAs,
  print: cmdPrint,
  close: cmdClose,
  list: cmdList,
  status: cmdStatus,
  "close-all": cmdCloseAll,
};

async function runUiCommand(args) {
  const sub = args._[0];
  if (!sub || !handlers[sub]) {
    throw new Error(`unknown ui command: ${sub || "(missing)"}`);
  }
  const subArgs = {
    _: args._.slice(1),
    options: args.options,
  };
  const out = await handlers[sub](subArgs);
  process.stdout.write(`${out}\n`);
}

module.exports = { runUiCommand };
