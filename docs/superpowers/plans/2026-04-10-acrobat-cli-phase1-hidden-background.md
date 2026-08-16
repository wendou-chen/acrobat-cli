# Phase 1：后台隐藏 Acrobat 实例管理器 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `acrobat-cli` 增加独立隐藏 Acrobat 实例管理能力，通过 `ui open/close/list/status/close-all` 控制，不干扰用户正在使用的 Acrobat。

**Architecture:** Node.js CLI 通过 PowerShell `Start-Process -WindowStyle Hidden` 启动独立 Acrobat 实例（`/n`），PID 状态保存在 `%TEMP%\acrobat-cli-background-pids.json`，关闭时只杀 CLI 自己启动的 PID。

**Tech Stack:** Node.js 18+, PowerShell, node:test

---

## 文件结构

```text
acrobat-cli/
├── acrobat-cli.js          # 修改：增加 ui 路由和帮助
├── lib/
│   └── background.js       # 新建：后台实例管理器
├── commands/
│   └── ui.js               # 新建：ui 子命令路由
├── tests/
│   └── background.test.js  # 新建：状态管理测试
└── skills/acrobat-cli/SKILL.md  # 修改：加入 ui 命令
```

---

### Task 1: 创建 `lib/background.js`

**Files:**
- Create: `lib/background.js`

- [ ] **Step 1: 创建文件**

```js
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

const ACROBAT_EXE = "D:\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe";
const STATE_FILE = path.join(os.tmpdir(), "acrobat-cli-background-pids.json");

function readState() {
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeState(pids) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(pids, null, 2), "utf8");
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

async function launchHidden(pdfPath) {
  if (!fs.existsSync(pdfPath)) throw new Error(`file not found: ${pdfPath}`);
  const psPath = `'${pdfPath.replace(/'/g, "''")}'`;
  const script = `
$exe = '${ACROBAT_EXE}'
$p = Start-Process -FilePath $exe -ArgumentList @('/n', ${psPath}) -WindowStyle Hidden -PassThru
$p.Id
`;
  const out = await runPowerShell(script);
  const pid = Number(out.trim());
  if (!Number.isInteger(pid) || pid <= 0) throw new Error(`failed to launch hidden Acrobat: ${out}`);
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
  STATE_FILE,
  readState,
  writeState,
  addPid,
  removePid,
  clearState,
  launchHidden,
  isPidAlive,
  closePid,
  listPids,
  closeAll,
};
```

- [ ] **Step 2: 运行语法检查**

Run: `node --check lib/background.js`
Expected: no output, exit code 0

- [ ] **Step 3: 提交**

```bash
git add lib/background.js
git commit -m "feat: add hidden Acrobat background manager"
```

---

### Task 2: 创建 `commands/ui.js`

**Files:**
- Create: `commands/ui.js`

- [ ] **Step 1: 创建文件**

```js
"use strict";

const {
  launchHidden,
  closePid,
  listPids,
  isPidAlive,
  closeAll,
} = require("../lib/background.js");

async function cmdOpen(args) {
  const file = args._[0];
  if (!file) throw new Error("ui open requires a PDF path");
  const pid = await launchHidden(file);
  return `Opened hidden Acrobat PID ${pid}: ${file}`;
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
```

- [ ] **Step 2: 运行语法检查**

Run: `node --check commands/ui.js`
Expected: no output, exit code 0

- [ ] **Step 3: 提交**

```bash
git add commands/ui.js
git commit -m "feat: add ui subcommand router"
```

---

### Task 3: 在 `acrobat-cli.js` 接入 `ui` 路由

**Files:**
- Modify: `acrobat-cli.js`

- [ ] **Step 1: 在文件顶部引入 `runUiCommand`**

在现有 `const { runPdfCommand } = require("./commands/pdf.js");` 后加入：

```js
const { runUiCommand } = require("./commands/ui.js");
```

- [ ] **Step 2: 在 `main()` switch 中加入 `case "ui"`**

```js
    case "ui":
      await runUiCommand(args);
      break;
```

- [ ] **Step 3: 在 `printHelp()` 中加入 ui 命令说明**

在 `pdf <command>` 说明后加入：

```text
  ui <command> [options]             Control hidden background Acrobat instances.
                                     Commands: open, close, list, status, close-all.
```

- [ ] **Step 4: 运行语法检查**

Run: `node --check acrobat-cli.js`
Expected: no output, exit code 0

- [ ] **Step 5: 提交**

```bash
git add acrobat-cli.js
git commit -m "feat: wire ui subcommand into CLI"
```

---

### Task 4: 添加后台状态管理测试

**Files:**
- Create: `tests/background.test.js`

- [ ] **Step 1: 创建测试**

```js
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const bg = require("../lib/background.js");

test("state file add/remove/clear", () => {
  const stateFile = path.join(os.tmpdir(), `acrobat-cli-test-state-${Date.now()}.json`);
  const original = bg.STATE_FILE;
  // 临时替换 STATE_FILE
  Object.defineProperty(bg, "STATE_FILE", { value: stateFile, configurable: true });

  bg.writeState([]);
  assert.deepStrictEqual(bg.readState(), []);

  bg.addPid(101);
  bg.addPid(202);
  assert.deepStrictEqual(bg.readState(), [101, 202]);

  bg.removePid(101);
  assert.deepStrictEqual(bg.readState(), [202]);

  bg.clearState();
  assert.deepStrictEqual(bg.readState(), []);

  Object.defineProperty(bg, "STATE_FILE", { value: original, configurable: true });
  fs.unlinkSync(stateFile);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/background.test.js`
Expected: FAIL because `lib/background.js` does not exist (or already exists from Task 1; if Task 1 done, should pass)

- [ ] **Step 3: 运行测试确认通过**

Run: `node --test tests/background.test.js`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add tests/background.test.js
git commit -m "test: add background state management tests"
```

---

### Task 5: 更新 README 和 SKILL.md

**Files:**
- Modify: `README.md`
- Modify: `skills/acrobat-cli/SKILL.md`

- [ ] **Step 1: README 功能表加入 ui 命令**

```markdown
| `acrobat-cli ui open <pdf>` | 以隐藏后台实例打开 PDF |
| `acrobat-cli ui close --pid <pid>` | 关闭指定隐藏实例 |
| `acrobat-cli ui list` | 列出 CLI 启动的隐藏实例 |
| `acrobat-cli ui status --pid <pid>` | 查看隐藏实例状态 |
| `acrobat-cli ui close-all` | 关闭所有 CLI 启动的隐藏实例 |
```

- [ ] **Step 2: SKILL.md Quick start 加入 ui 命令**

```bash
# Hidden background Acrobat
acrobat-cli ui open input.pdf
acrobat-cli ui list
acrobat-cli ui status --pid <pid>
acrobat-cli ui close --pid <pid>
acrobat-cli ui close-all
```

- [ ] **Step 3: 提交**

```bash
git add README.md skills/acrobat-cli/SKILL.md
git commit -m "docs: document ui hidden background commands"
```

---

### Task 6: 全量验证并推送

**Files:**
- None

- [ ] **Step 1: 运行全量测试**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 2: 手动冒烟（可选，会启动隐藏 Acrobat）**

Run:
```powershell
$pid = (acrobat-cli ui open "D:\a考研\Obsidian Vault\考研数学\习题集\相似矩阵综合提高篇.pdf").Split(' ')[-1]
acrobat-cli ui list
acrobat-cli ui status --pid $pid
acrobat-cli ui close --pid $pid
```

Expected: 能启动、列出、关闭隐藏实例

- [ ] **Step 3: 推送**

```bash
git push origin main
```

---

## 自审结果

- 覆盖 Phase 1 全部命令：open/close/list/status/close-all。
- 无占位符；每个任务包含完整代码。
- 接口一致：`launchHidden` 返回 PID，`closePid` 按 PID 关闭。
- 测试使用临时状态文件，不依赖真实 Acrobat 启动。
