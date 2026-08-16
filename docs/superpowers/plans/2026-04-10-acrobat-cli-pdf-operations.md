# acrobat-cli PDF 文档操作实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `acrobat-cli` 从最小可用版扩展为支持 `pdf` 分组子命令的完整 CLI，第一版覆盖 PDF 信息、合并、拆分、旋转、删除页、提取、加密、解密、书签、注入。

**Architecture:** Node.js CLI 作为编排层，通过 `commands/pdf.js` 路由 `pdf` 子命令；具体 PDF 操作由 `scripts/pdf/*.py`（pypdf）执行；`lib/python.js` 统一负责调用 Python 脚本。

**Tech Stack:** Node.js 18+, pdf-lib, Python 3, pypdf, node:test

---

## 文件结构

```text
acrobat-cli/
├── acrobat-cli.js                 # 修改：增加 pdf 子命令路由
├── lib/
│   └── python.js                  # 新建：Python 调用封装
├── commands/
│   └── pdf.js                     # 新建：pdf 子命令路由
├── scripts/pdf/
│   ├── info.py                    # 新建
│   ├── merge.py                   # 新建
│   ├── split.py                   # 新建
│   ├── rotate.py                  # 新建
│   ├── delete_pages.py            # 新建
│   ├── extract.py                 # 移动/改造现有 scripts/extract_by_bookmarks.py
│   ├── encrypt.py                 # 新建
│   ├── decrypt.py                 # 新建
│   └── bookmarks.py               # 新建
├── tests/
│   ├── smoke.test.js              # 保留
│   └── pdf.test.js                # 新建：pdf 命令测试
└── skills/acrobat-cli/SKILL.md   # 修改：完整命令树
```

---

### Task 1: 创建 Python 调用封装

**Files:**
- Create: `lib/python.js`

- [ ] **Step 1: 创建 `lib/python.js`**

```js
"use strict";

const { execFile } = require("child_process");
const path = require("path");

function runPython(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const candidates = process.env.PYTHON ? [process.env.PYTHON] : ["python", "py"];
    let index = 0;
    const attempt = () => {
      if (index >= candidates.length) {
        reject(new Error("python/py not found. Install Python 3 or set PYTHON env var."));
        return;
      }
      const python = candidates[index++];
      execFile(python, [scriptPath, ...args], {
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024,
      }, (err, stdout, stderr) => {
        if (err) {
          if (err.code === "ENOENT") {
            attempt();
            return;
          }
          reject(new Error(stderr.trim() || err.message));
          return;
        }
        resolve(stdout.trim());
      });
    };
    attempt();
  });
}

module.exports = { runPython };
```

- [ ] **Step 2: 运行 Node 语法检查**

Run: `node --check lib/python.js`
Expected: no output, exit code 0

- [ ] **Step 3: 提交**

```bash
git add lib/python.js
git commit -m "chore: add python runner helper"
```

---

### Task 1.5: 创建 `lib/inject.js` 并避免循环依赖

**Files:**
- Create: `lib/inject.js`
- Modify: `acrobat-cli.js`

- [ ] **Step 1: 创建 `lib/inject.js`**

```js
"use strict";

const fs = require("fs");
const { PDFDocument, PDFName, PDFString } = require("pdf-lib");

const SELF_CLOSE_JS = "this.closeDoc(true);";

async function injectSelfClose(pdfPath, outputPath) {
  const bytes = fs.readFileSync(pdfPath);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const action = doc.context.obj({
    S: "JavaScript",
    JS: PDFString.of(SELF_CLOSE_JS),
  });
  doc.catalog.set(PDFName.of("OpenAction"), action);
  const modified = await doc.save();
  fs.writeFileSync(outputPath, modified);
}

module.exports = { injectSelfClose, SELF_CLOSE_JS };
```

- [ ] **Step 2: 修改 `acrobat-cli.js` 引入 `lib/inject.js`**

将 `acrobat-cli.js` 中的 `SELF_CLOSE_JS` 和 `injectSelfClose` 定义改为从 `./lib/inject.js` 引入：

```js
const { injectSelfClose, SELF_CLOSE_JS } = require("./lib/inject.js");
```

并删除原 `SELF_CLOSE_JS` 常量和 `injectSelfClose` 函数定义。

- [ ] **Step 3: 运行 `node --check lib/inject.js` 和 `node --check acrobat-cli.js`**

Run:
```bash
node --check lib/inject.js
node --check acrobat-cli.js
```

Expected: both no output, exit code 0

- [ ] **Step 4: 提交**

```bash
git add lib/inject.js acrobat-cli.js
git commit -m "refactor: extract inject helper to avoid circular dependency"
```

---

### Task 2: 修改 `acrobat-cli.js` 支持 `pdf` 子命令路由

**Files:**
- Modify: `acrobat-cli.js`

- [ ] **Step 1: 在文件顶部引入 `commands/pdf.js`**

在 `acrobat-cli.js` 第 8 行后加入：

```js
const { runPdfCommand } = require("./commands/pdf.js");
```

- [ ] **Step 2: 在 `main()` 的 switch 中加入 `case "pdf"`**

```js
    case "pdf":
      await runPdfCommand(args);
      break;
```

- [ ] **Step 3: 运行 `node --check acrobat-cli.js`**

Run: `node --check acrobat-cli.js`
Expected: no output, exit code 0

- [ ] **Step 4: 提交**

```bash
git add acrobat-cli.js
git commit -m "refactor: route pdf subcommand"
```

---

### Task 3: 创建 `commands/pdf.js` 路由

**Files:**
- Create: `commands/pdf.js`

- [ ] **Step 1: 创建路由文件**

```js
"use strict";

const path = require("path");
const { runPython } = require("../lib/python.js");
const { injectSelfClose } = require("../lib/inject.js");

function pdfScript(name) {
  return path.join(__dirname, "..", "scripts", "pdf", `${name}.py`);
}

async function cmdInfo(args) {
  const file = args._[0];
  if (!file) throw new Error("pdf info requires a file path");
  return runPython(pdfScript("info"), [file]);
}

async function cmdMerge(args) {
  const files = args._;
  const output = args.options.output || args.options.o;
  if (files.length < 2) throw new Error("pdf merge requires at least two input files");
  if (!output) throw new Error("pdf merge requires --output/-o");
  return runPython(pdfScript("merge"), ["--output", output, ...files]);
}

async function cmdSplit(args) {
  const file = args._[0];
  const ranges = args.options.ranges;
  const output = args.options.output || args.options.o;
  if (!file) throw new Error("pdf split requires a file path");
  if (!ranges) throw new Error("pdf split requires --ranges");
  if (!output) throw new Error("pdf split requires --output/-o");
  return runPython(pdfScript("split"), ["--ranges", ranges, "--output", output, file]);
}

async function cmdRotate(args) {
  const file = args._[0];
  const pages = args.options.pages;
  const angle = args.options.angle;
  const output = args.options.output || args.options.o;
  if (!file) throw new Error("pdf rotate requires a file path");
  if (!pages) throw new Error("pdf rotate requires --pages");
  if (!angle) throw new Error("pdf rotate requires --angle");
  if (!output) throw new Error("pdf rotate requires --output/-o");
  return runPython(pdfScript("rotate"), ["--pages", pages, "--angle", String(angle), "--output", output, file]);
}

async function cmdDelete(args) {
  const file = args._[0];
  const pages = args.options.pages;
  const output = args.options.output || args.options.o;
  if (!file) throw new Error("pdf delete requires a file path");
  if (!pages) throw new Error("pdf delete requires --pages");
  if (!output) throw new Error("pdf delete requires --output/-o");
  return runPython(pdfScript("delete_pages"), ["--pages", pages, "--output", output, file]);
}

async function cmdExtract(args) {
  const file = args._[0] || args.options.pdf;
  const chapter = args.options.chapter;
  const sections = args.options.sections;
  const output = args.options.output || args.options.o;
  if (!file) throw new Error("pdf extract requires a file path");
  if (!chapter) throw new Error("pdf extract requires --chapter");
  if (!sections) throw new Error("pdf extract requires --sections");
  if (!output) throw new Error("pdf extract requires --output/-o");
  return runPython(pdfScript("extract"), ["--pdf", file, "--chapter", chapter, "--sections", sections, "--output", output]);
}

async function cmdEncrypt(args) {
  const file = args._[0];
  const userPassword = args.options["user-password"];
  const ownerPassword = args.options["owner-password"];
  const output = args.options.output || args.options.o;
  if (!file) throw new Error("pdf encrypt requires a file path");
  if (!userPassword) throw new Error("pdf encrypt requires --user-password");
  if (!ownerPassword) throw new Error("pdf encrypt requires --owner-password");
  if (!output) throw new Error("pdf encrypt requires --output/-o");
  return runPython(pdfScript("encrypt"), ["--user-password", userPassword, "--owner-password", ownerPassword, "--output", output, file]);
}

async function cmdDecrypt(args) {
  const file = args._[0];
  const password = args.options.password;
  const output = args.options.output || args.options.o;
  if (!file) throw new Error("pdf decrypt requires a file path");
  if (!password) throw new Error("pdf decrypt requires --password");
  if (!output) throw new Error("pdf decrypt requires --output/-o");
  return runPython(pdfScript("decrypt"), ["--password", password, "--output", output, file]);
}

async function cmdBookmarks(args) {
  const file = args._[0];
  if (!file) throw new Error("pdf bookmarks requires a file path");
  return runPython(pdfScript("bookmarks"), [file]);
}

async function cmdInject(args) {
  const file = args._[0];
  if (!file) throw new Error("pdf inject requires a file path");
  const output = args.options.output || file;
  await injectSelfClose(file, output);
  return `injected: ${file}`;
}

const handlers = {
  info: cmdInfo,
  merge: cmdMerge,
  split: cmdSplit,
  rotate: cmdRotate,
  delete: cmdDelete,
  extract: cmdExtract,
  encrypt: cmdEncrypt,
  decrypt: cmdDecrypt,
  bookmarks: cmdBookmarks,
  inject: cmdInject,
};

async function runPdfCommand(args) {
  const sub = args._[0];
  if (!sub || !handlers[sub]) {
    throw new Error(`unknown pdf command: ${sub || "(missing)"}`);
  }
  const subArgs = {
    _: args._.slice(1),
    options: args.options,
  };
  const out = await handlers[sub](subArgs);
  process.stdout.write(`${out}\n`);
}

module.exports = { runPdfCommand };
```

- [ ] **Step 2: 运行 `node --check commands/pdf.js`**

Run: `node --check commands/pdf.js`
Expected: no output, exit code 0

- [ ] **Step 3: 提交**

```bash
git add commands/pdf.js
git commit -m "feat: add pdf subcommand router"
```

---

### Task 4: 实现 `pdf info`

**Files:**
- Create: `scripts/pdf/info.py`
- Test: `tests/pdf.test.js`

- [ ] **Step 1: 创建 Python 脚本**

```python
#!/usr/bin/env python3
import sys
from pypdf import PdfReader

def main():
    if len(sys.argv) < 2:
        print("usage: info.py <pdf>", file=sys.stderr)
        return 1
    path = sys.argv[1]
    reader = PdfReader(path)
    info = reader.metadata or {}
    print(f"Pages: {len(reader.pages)}")
    print(f"Encrypted: {reader.is_encrypted}")
    print(f"Title: {info.get('/Title', '')}")
    print(f"Author: {info.get('/Author', '')}")
    print(f"Producer: {info.get('/Producer', '')}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: 创建测试文件 `tests/pdf.test.js`**

```js
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const { runPython } = require("../lib/python.js");

function pdfScript(name) {
  return path.join(__dirname, "..", "scripts", "pdf", `${name}.py`);
}

async function makeTempPdf(pageCount = 3) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([200, 200]);
  const file = path.join(os.tmpdir(), `acrobat-cli-test-${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`);
  fs.writeFileSync(file, await doc.save());
  return file;
}

test("pdf info shows page count", async () => {
  const file = await makeTempPdf(3);
  const out = await runPython(pdfScript("info"), [file]);
  assert.match(out, /Pages: 3/);
  fs.unlinkSync(file);
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `node --test tests/pdf.test.js`
Expected: FAIL because `scripts/pdf/info.py` does not exist

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/pdf.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add scripts/pdf/info.py tests/pdf.test.js
git commit -m "feat: add pdf info"
```

---

### Task 5: 实现 `pdf merge`

**Files:**
- Create: `scripts/pdf/merge.py`
- Test: modify `tests/pdf.test.js`

- [ ] **Step 1: 创建 Python 脚本**

```python
#!/usr/bin/env python3
import argparse
import sys
from pypdf import PdfReader, PdfWriter

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("files", nargs="+")
    args = parser.parse_args()

    writer = PdfWriter()
    for path in args.files:
        reader = PdfReader(path)
        for page in reader.pages:
            writer.add_page(page)
    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"Merged {len(args.files)} files -> {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: 在 `tests/pdf.test.js` 中追加测试**

```js
test("pdf merge combines files", async () => {
  const a = await makeTempPdf(1);
  const b = await makeTempPdf(2);
  const out = path.join(os.tmpdir(), `merge-${Date.now()}.pdf`);
  const result = await runPython(pdfScript("merge"), ["--output", out, a, b]);
  assert.match(result, /Merged 2 files/);
  const { PDFDocument } = require("pdf-lib");
  const loaded = await PDFDocument.load(fs.readFileSync(out));
  assert.strictEqual(loaded.getPageCount(), 3);
  fs.unlinkSync(a); fs.unlinkSync(b); fs.unlinkSync(out);
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `node --test tests/pdf.test.js`
Expected: FAIL because `scripts/pdf/merge.py` does not exist

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/pdf.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add scripts/pdf/merge.py tests/pdf.test.js
git commit -m "feat: add pdf merge"
```

---

### Task 6: 实现 `pdf split`

**Files:**
- Create: `scripts/pdf/split.py`
- Test: modify `tests/pdf.test.js`

- [ ] **Step 1: 创建 Python 脚本**

```python
#!/usr/bin/env python3
import argparse
import os
import sys
from pypdf import PdfReader, PdfWriter

def parse_ranges(spec):
    ranges = []
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            ranges.append((int(a), int(b)))
        else:
            n = int(part)
            ranges.append((n, n))
    return ranges

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ranges", required=True)
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    reader = PdfReader(args.file)
    total = len(reader.pages)
    ranges = parse_ranges(args.ranges)
    os.makedirs(args.output, exist_ok=True)
    for idx, (start, end) in enumerate(ranges, 1):
        writer = PdfWriter()
        for p in range(start - 1, end):
            if p < 0 or p >= total:
                raise SystemExit(f"page out of range: {p + 1}")
            writer.add_page(reader.pages[p])
        out_path = os.path.join(args.output, f"part-{idx}.pdf")
        with open(out_path, "wb") as f:
            writer.write(f)
        print(f"part-{idx}.pdf: pages {start}-{end}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: 在 `tests/pdf.test.js` 中追加测试**

```js
test("pdf split by ranges", async () => {
  const file = await makeTempPdf(5);
  const outDir = path.join(os.tmpdir(), `split-${Date.now()}`);
  const result = await runPython(pdfScript("split"), ["--ranges", "1-2,4", "--output", outDir, file]);
  assert.match(result, /part-1\.pdf/);
  assert.match(result, /part-2\.pdf/);
  assert.ok(fs.existsSync(path.join(outDir, "part-1.pdf")));
  assert.ok(fs.existsSync(path.join(outDir, "part-2.pdf")));
  fs.unlinkSync(file);
  fs.rmSync(outDir, { recursive: true, force: true });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `node --test tests/pdf.test.js`
Expected: FAIL because `scripts/pdf/split.py` does not exist

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/pdf.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add scripts/pdf/split.py tests/pdf.test.js
git commit -m "feat: add pdf split"
```

---

### Task 7: 实现 `pdf rotate`

**Files:**
- Create: `scripts/pdf/rotate.py`
- Test: modify `tests/pdf.test.js`

- [ ] **Step 1: 创建 Python 脚本**

```python
#!/usr/bin/env python3
import argparse
import sys
from pypdf import PdfReader, PdfWriter

def parse_pages(spec):
    pages = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            pages.update(range(int(a), int(b) + 1))
        else:
            pages.add(int(part))
    return pages

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pages", required=True)
    parser.add_argument("--angle", required=True, type=int)
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    reader = PdfReader(args.file)
    writer = PdfWriter()
    target = parse_pages(args.pages)
    for i, page in enumerate(reader.pages, 1):
        if i in target:
            page.rotate(args.angle)
        writer.add_page(page)
    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"Rotated pages {args.pages} by {args.angle} degrees -> {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: 在 `tests/pdf.test.js` 中追加测试**

```js
test("pdf rotate rotates pages", async () => {
  const file = await makeTempPdf(2);
  const out = path.join(os.tmpdir(), `rotate-${Date.now()}.pdf`);
  const result = await runPython(pdfScript("rotate"), ["--pages", "1", "--angle", "90", "--output", out, file]);
  assert.match(result, /Rotated pages 1 by 90/);
  const { PDFDocument } = require("pdf-lib");
  const loaded = await PDFDocument.load(fs.readFileSync(out));
  assert.strictEqual(loaded.getPage(0).getRotation().angle, 90);
  fs.unlinkSync(file); fs.unlinkSync(out);
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `node --test tests/pdf.test.js`
Expected: FAIL because `scripts/pdf/rotate.py` does not exist

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/pdf.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add scripts/pdf/rotate.py tests/pdf.test.js
git commit -m "feat: add pdf rotate"
```

---

### Task 8: 实现 `pdf delete`

**Files:**
- Create: `scripts/pdf/delete_pages.py`
- Test: modify `tests/pdf.test.js`

- [ ] **Step 1: 创建 Python 脚本**

```python
#!/usr/bin/env python3
import argparse
import sys
from pypdf import PdfReader, PdfWriter

def parse_pages(spec):
    pages = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            pages.update(range(int(a), int(b) + 1))
        else:
            pages.add(int(part))
    return pages

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pages", required=True)
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    reader = PdfReader(args.file)
    writer = PdfWriter()
    remove = parse_pages(args.pages)
    for i, page in enumerate(reader.pages, 1):
        if i not in remove:
            writer.add_page(page)
    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"Deleted pages {args.pages} -> {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: 在 `tests/pdf.test.js` 中追加测试**

```js
test("pdf delete removes pages", async () => {
  const file = await makeTempPdf(4);
  const out = path.join(os.tmpdir(), `delete-${Date.now()}.pdf`);
  const result = await runPython(pdfScript("delete_pages"), ["--pages", "2,4", "--output", out, file]);
  assert.match(result, /Deleted pages 2,4/);
  const { PDFDocument } = require("pdf-lib");
  const loaded = await PDFDocument.load(fs.readFileSync(out));
  assert.strictEqual(loaded.getPageCount(), 2);
  fs.unlinkSync(file); fs.unlinkSync(out);
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `node --test tests/pdf.test.js`
Expected: FAIL because `scripts/pdf/delete_pages.py` does not exist

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/pdf.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add scripts/pdf/delete_pages.py tests/pdf.test.js
git commit -m "feat: add pdf delete"
```

---

### Task 9: 迁移并完善 `pdf extract`

**Files:**
- Rename/Create: `scripts/pdf/extract.py`（从现有 `scripts/extract_by_bookmarks.py` 迁移）
- Test: modify `tests/pdf.test.js`

- [ ] **Step 1: 将现有 `scripts/extract_by_bookmarks.py` 复制为 `scripts/pdf/extract.py`**

Run:
```bash
cp scripts/extract_by_bookmarks.py scripts/pdf/extract.py
```

- [ ] **Step 2: 在 `tests/pdf.test.js` 中追加测试**

```js
test("pdf extract by bookmarks", async () => {
  const src = "D:\\a考研\\Obsidian Vault\\考研数学\\习题集\\26李林880题-数学一-试题分册.pdf";
  const out = path.join(os.tmpdir(), `extract-${Date.now()}.pdf`);
  const result = await runPython(pdfScript("extract"), ["--pdf", src, "--chapter", "相似矩阵", "--sections", "综合,拓展", "--output", out]);
  assert.match(result, /已保存/);
  const { PDFDocument } = require("pdf-lib");
  const loaded = await PDFDocument.load(fs.readFileSync(out));
  assert.strictEqual(loaded.getPageCount(), 4);
  fs.unlinkSync(out);
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `node --test tests/pdf.test.js`
Expected: FAIL because `scripts/pdf/extract.py` does not exist

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/pdf.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add scripts/pdf/extract.py tests/pdf.test.js
git commit -m "feat: add pdf extract"
```

---

### Task 10: 实现 `pdf encrypt` / `pdf decrypt`

**Files:**
- Create: `scripts/pdf/encrypt.py`, `scripts/pdf/decrypt.py`
- Test: modify `tests/pdf.test.js`

- [ ] **Step 1: 创建 `scripts/pdf/encrypt.py`**

```python
#!/usr/bin/env python3
import argparse
import sys
from pypdf import PdfReader, PdfWriter

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-password", required=True)
    parser.add_argument("--owner-password", required=True)
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    reader = PdfReader(args.file)
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt(user_password=args.user_password, owner_password=args.owner_password)
    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"Encrypted -> {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: 创建 `scripts/pdf/decrypt.py`**

```python
#!/usr/bin/env python3
import argparse
import sys
from pypdf import PdfReader, PdfWriter

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--password", required=True)
    parser.add_argument("--output", "-o", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    reader = PdfReader(args.file)
    if reader.is_encrypted:
        reader.decrypt(args.password)
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    with open(args.output, "wb") as f:
        writer.write(f)
    print(f"Decrypted -> {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 3: 在 `tests/pdf.test.js` 中追加测试**

```js
test("pdf encrypt and decrypt roundtrip", async () => {
  const file = await makeTempPdf(2);
  const enc = path.join(os.tmpdir(), `enc-${Date.now()}.pdf`);
  const dec = path.join(os.tmpdir(), `dec-${Date.now()}.pdf`);
  await runPython(pdfScript("encrypt"), ["--user-password", "u", "--owner-password", "o", "--output", enc, file]);
  await runPython(pdfScript("decrypt"), ["--password", "u", "--output", dec, enc]);
  const { PDFDocument } = require("pdf-lib");
  const loaded = await PDFDocument.load(fs.readFileSync(dec));
  assert.strictEqual(loaded.getPageCount(), 2);
  fs.unlinkSync(file); fs.unlinkSync(enc); fs.unlinkSync(dec);
});
```

- [ ] **Step 4: 运行测试确认失败**

Run: `node --test tests/pdf.test.js`
Expected: FAIL because scripts do not exist

- [ ] **Step 5: 运行测试确认通过**

Run: `node --test tests/pdf.test.js`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add scripts/pdf/encrypt.py scripts/pdf/decrypt.py tests/pdf.test.js
git commit -m "feat: add pdf encrypt/decrypt"
```

---

### Task 11: 实现 `pdf bookmarks`

**Files:**
- Create: `scripts/pdf/bookmarks.py`
- Test: modify `tests/pdf.test.js`

- [ ] **Step 1: 创建 Python 脚本**

```python
#!/usr/bin/env python3
import sys
from pypdf import PdfReader

def dest_page(reader, dest):
    try:
        if isinstance(dest, int):
            return dest + 1
        if isinstance(dest, list):
            return reader.get_destination_page_number(dest) + 1
        if hasattr(dest, "page"):
            return reader.get_destination_page_number(dest) + 1
    except Exception:
        pass
    return None

def walk(items, reader, depth=0):
    for item in items:
        if isinstance(item, list):
            walk(item, reader, depth + 1)
        else:
            title = (item.title or "").strip()
            page = dest_page(reader, item)
            print(f"{'  ' * depth}{title} -> {page}")

def main():
    if len(sys.argv) < 2:
        print("usage: bookmarks.py <pdf>", file=sys.stderr)
        return 1
    reader = PdfReader(sys.argv[1])
    walk(reader.outline, reader)
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: 在 `tests/pdf.test.js` 中追加测试**

```js
test("pdf bookmarks prints outline", async () => {
  const src = "D:\\a考研\\Obsidian Vault\\考研数学\\习题集\\26李林880题-数学一-试题分册.pdf";
  const out = await runPython(pdfScript("bookmarks"), [src]);
  assert.match(out, /第十四章 相似矩阵/);
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `node --test tests/pdf.test.js`
Expected: FAIL because `scripts/pdf/bookmarks.py` does not exist

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/pdf.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add scripts/pdf/bookmarks.py tests/pdf.test.js
git commit -m "feat: add pdf bookmarks"
```

---

### Task 12: 更新 README 和 SKILL.md

**Files:**
- Modify: `README.md`
- Modify: `skills/acrobat-cli/SKILL.md`

- [ ] **Step 1: 在 README 功能表中加入 `pdf` 子命令**

将原“功能”表扩展为包含：

```markdown
| `acrobat-cli pdf info <file>` | 显示 PDF 信息 |
| `acrobat-cli pdf merge <files...> -o out.pdf` | 合并 PDF |
| `acrobat-cli pdf split <file> --ranges 1-3,5 -o outdir` | 拆分 PDF |
| `acrobat-cli pdf rotate <file> --pages 1-3 --angle 90 -o out.pdf` | 旋转页面 |
| `acrobat-cli pdf delete <file> --pages 2,4 -o out.pdf` | 删除页面 |
| `acrobat-cli pdf extract <file> --chapter <kw> --sections a,b -o out.pdf` | 按书签提取 |
| `acrobat-cli pdf encrypt <file> --user-password <p> --owner-password <p> -o out.pdf` | 加密 |
| `acrobat-cli pdf decrypt <file> --password <p> -o out.pdf` | 解密 |
| `acrobat-cli pdf bookmarks <file>` | 输出书签树 |
| `acrobat-cli pdf inject <file>` | 注入 self-close |
```

- [ ] **Step 2: 在 SKILL.md 中补充 `pdf` 子命令树**

在 Quick start 和 Commands 中加入上述 `pdf` 命令示例。

- [ ] **Step 3: 提交**

```bash
git add README.md skills/acrobat-cli/SKILL.md
git commit -m "docs: document pdf subcommands"
```

---

### Task 13: 更新项目技能部署

**Files:**
- Modify: `D:\a考研\Obsidian Vault\.dsh\skills\acrobat-cli\SKILL.md`
- Modify: `D:\a考研\Obsidian Vault\.dsh\skills\acrobat-cli\scripts\*`

- [ ] **Step 1: 将项目技能目录与仓库同步**

Run:
```powershell
Copy-Item -Recurse -Force "D:\Coding工具专用文件夹\acrobat-cli\skills\acrobat-cli\*" "D:\a考研\Obsidian Vault\.dsh\skills\acrobat-cli\"
Copy-Item -Force "D:\Coding工具专用文件夹\acrobat-cli\scripts\pdf\*.py" "D:\a考研\Obsidian Vault\.dsh\skills\acrobat-cli\scripts\"
```

- [ ] **Step 2: 验证**

Run:
```powershell
Test-Path "D:\a考研\Obsidian Vault\.dsh\skills\acrobat-cli\SKILL.md"
Test-Path "D:\a考研\Obsidian Vault\.dsh\skills\acrobat-cli\scripts\extract.py"
```

Expected: both True

- [ ] **Step 3: 提交（如果项目技能目录纳入版本控制）**

```bash
git add -A
git commit -m "chore: sync project skill"
```

---

### Task 14: 全量验证并推送

**Files:**
- None

- [ ] **Step 1: 运行全量测试**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 2: 手动冒烟**

Run:
```powershell
acrobat-cli pdf info "D:\a考研\Obsidian Vault\考研数学\习题集\26李林880题-数学一-试题分册.pdf"
acrobat-cli pdf bookmarks "D:\a考研\Obsidian Vault\考研数学\习题集\26李林880题-数学一-试题分册.pdf"
acrobat-cli pdf extract --pdf "D:\a考研\Obsidian Vault\考研数学\习题集\26李林880题-数学一-试题分册.pdf" --chapter 相似矩阵 --sections 综合,拓展 -o "$env:TEMP\acrobat-cli-final-extract.pdf"
```

Expected: 输出正常

- [ ] **Step 3: 推送**

```bash
git push origin main
```

---

## 自审结果

- 覆盖 spec 中所有第一版 `pdf` 命令：info/merge/split/rotate/delete/extract/encrypt/decrypt/bookmarks/inject。
- 无占位符；每个任务包含可运行代码或明确命令。
- 类型/接口一致：`runPython(scriptPath, args)` 在 `lib/python.js` 定义并被 `commands/pdf.js` 使用。
- 注意：Task 10 测试先写了无效代码，随后在同一任务中修正为可运行版本；执行时以修正后版本为准。
