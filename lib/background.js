"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

const CANDIDATE_ACROBAT_EXES = [
  "C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe",
  "D:\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe",
];
const DEFAULT_STATE_FILE = path.join(os.tmpdir(), "acrobat-cli-background-pids.json");
let stateFile = DEFAULT_STATE_FILE;

function resolveAcrobatExe() {
  if (process.env.ACROBAT_EXE && fs.existsSync(process.env.ACROBAT_EXE)) {
    return process.env.ACROBAT_EXE;
  }
  for (const candidate of CANDIDATE_ACROBAT_EXES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return CANDIDATE_ACROBAT_EXES[0];
}

function setStateFile(file) {
  stateFile = file;
}

function readState() {
  try {
    const data = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeState(pids) {
  fs.writeFileSync(stateFile, JSON.stringify(pids, null, 2), "utf8");
}

function addPid(pid) {
  const pids = readState();
  if (!pids.includes(pid)) pids.push(pid);
  writeState(pids);
}

function removePid(pid) {
  const pids = readState().filter((p) => p !== pid);
  writeState(pids);
}

function clearState() {
  writeState([]);
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

async function launchHidden(pdfPath, options = {}) {
  if (!fs.existsSync(pdfPath)) throw new Error(`file not found: ${pdfPath}`);
  const visible = Boolean(options.visible);
  const psPath = `'${pdfPath.replace(/'/g, "''")}'`;
  const exe = resolveAcrobatExe();
  const windowStyle = visible ? "" : " -WindowStyle Hidden";
  const script = `
$exe = '${exe}'
$p = Start-Process -FilePath $exe -ArgumentList @('/n', ${psPath})${windowStyle} -PassThru
$p.Id
`;
  const out = await runPowerShell(script);
  const pid = Number(out.trim());
  if (!Number.isInteger(pid) || pid <= 0) throw new Error(`failed to launch Acrobat: ${out}`);
  addPid(pid);
  return pid;
}

async function isPidAlive(pid) {
  try {
    const out = await runPowerShell(`(Get-Process -Id ${pid} -ErrorAction SilentlyContinue) -ne $null`);
    return out.trim() === "True";
  } catch {
    return false;
  }
}

async function closePid(pid) {
  await runPowerShell(`Stop-Process -Id ${pid} -Force -ErrorAction Stop`);
  removePid(pid);
}

async function listPids() {
  const pids = readState();
  const alive = [];
  for (const pid of pids) {
    if (await isPidAlive(pid)) alive.push(pid);
  }
  if (alive.length !== pids.length) writeState(alive);
  return alive;
}

async function closeAll() {
  const pids = await listPids();
  const errors = [];
  for (const pid of pids) {
    try {
      await closePid(pid);
    } catch (e) {
      errors.push(`${pid}: ${e.message}`);
    }
  }
  clearState();
  return { closed: pids.length, errors };
}

module.exports = {
  DEFAULT_STATE_FILE,
  setStateFile,
  readState,
  writeState,
  addPid,
  removePid,
  clearState,
  runPowerShell,
  resolveAcrobatExe,
  launchHidden,
  isPidAlive,
  closePid,
  listPids,
  closeAll,
};
