# acrobat-cli 完整框架设计

日期：2026-04-10
状态：已批准（用户确认 Node CLI + Python PDF 引擎方案）

## 1. 背景与目标

当前 `acrobat-cli` 只是最小可用版，只覆盖 outline 临时 PDF 自关闭和按书签提取。用户期望的是类似 `playwright-cli` 的完整 CLI：把 Acrobat / PDF 的主要能力都通过命令行暴露出来，而不是只处理个别工作流。

本设计先落地第一版：**PDF 文档操作**，并预留后续 **Acrobat UI 自动化** 和更深入能力（OCR、表单、注释、数字签名等）的扩展位。

## 2. 架构决策

采用 **Node.js CLI 编排 + Python PDF 引擎** 的混合架构。

- Node.js：命令解析、参数校验、错误处理、调用后端、输出。
- Python（pypdf / pikepdf）：执行具体 PDF 文档操作。
- PowerShell（后续）：执行 Acrobat UI 自动化。

理由：
- 复用现有 `acrobat-cli` Node 仓库与全局安装。
- Python 的 PDF 生态（pypdf、pikepdf、PyMuPDF）比 pdf-lib 完整。
- 后续 Acrobat UI 自动化需要 PowerShell / COM，Node 作为编排层最灵活。

## 3. 目录结构

```text
acrobat-cli/
├── acrobat-cli.js                 # Node CLI 入口
├── package.json
├── commands/
│   ├── pdf.js                     # pdf 子命令路由
│   └── ui.js                      # 后续 Acrobat UI 路由（预留）
├── scripts/
│   └── pdf/
│       ├── info.py
│       ├── merge.py
│       ├── split.py
│       ├── rotate.py
│       ├── delete_pages.py
│       ├── extract.py
│       ├── encrypt.py
│       ├── decrypt.py
│       ├── bookmarks.py
│       └── inject.py
├── tests/
├── docs/
│   └── superpowers/specs/
└── skills/acrobat-cli/SKILL.md
```

## 4. 命令树

### 顶层命令

```text
acrobat-cli pdf <command> [options]
acrobat-cli ui  <command> [options]   # 后续
acrobat-cli watch / status / list / close-outline
```

### `pdf` 第一版命令

| 命令 | 说明 |
|---|---|
| `pdf info <file>` | 显示页数、大小、加密状态、元数据 |
| `pdf merge <files...> -o out.pdf` | 合并多个 PDF |
| `pdf split <file> --ranges 1-3,5 -o outdir` | 按页码范围拆分 |
| `pdf rotate <file> --pages 1-3 --angle 90 -o out.pdf` | 旋转指定页 |
| `pdf delete <file> --pages 2,4 -o out.pdf` | 删除指定页 |
| `pdf extract <file> --chapter <kw> --sections a,b -o out.pdf` | 按书签提取章节页面 |
| `pdf encrypt <file> --user-password <p> --owner-password <p> -o out.pdf` | 加密 |
| `pdf decrypt <file> --password <p> -o out.pdf` | 解密 |
| `pdf bookmarks <file>` | 输出书签树 |
| `pdf inject <file> [--output]` | 注入 self-close OpenAction |

### 后续扩展

- `ui` 组：`open`、`close`、`save`、`save-as`、`print`、`export`、`tab-list`、`tab-close`
- `pdf` 组继续：`watermark`、`compress`、`ocr`、`form`、`annotate`、`sign`、`pdfa`

## 5. 后端契约

每个 Python 脚本遵守以下契约：

- 通过命令行参数接收输入输出路径与选项。
- 输出人类可读信息到 stdout。
- 错误信息输出到 stderr。
- 成功返回 0，失败返回非 0。
- 不读取交互输入。

Node 侧通过 `child_process.execFile` 调用：

```js
execFile("python", [scriptPath, ...args], { windowsHide: true, maxBuffer: 8MB }, cb)
```

## 6. 实现阶段

1. 重构 CLI 入口，支持 `pdf` 子命令路由。
2. 实现 Python 后端脚本（info/merge/split/rotate/delete/extract/encrypt/decrypt/bookmarks/inject）。
3. Node 侧接入所有 `pdf` 命令。
4. 补充测试：每个 PDF 命令至少一个 smoke test。
5. 更新 SKILL.md 与 README。
6. 同步部署到项目 `.dsh/skills/acrobat-cli`。
7. 提交并推送 GitHub。

## 7. 测试策略

- 使用 `node:test` 作为测试框架。
- 在临时目录生成小 PDF，验证命令输出文件存在且页数正确。
- 对加密/解密验证权限属性。
- 对书签提取验证输出页数。
- 保持 `npm test` 一键可跑。

## 8. 技能与部署

- 更新 `skills/acrobat-cli/SKILL.md` 为完整命令树。
- 复制到项目：
  ```text
  D:\a考研\Obsidian Vault\.dsh\skills\acrobat-cli\
  ```
- 保持全局命令 `acrobat-cli` 可用。

## 9. 风险与注意

- pypdf 对某些加密 PDF 支持有限；复杂加密可能需要 pikepdf。
- 书签中文编码在部分 PDF 中可能异常，需要额外处理。
- Acrobat UI 自动化（后续）受窗口/焦点影响，不能保证 100% 稳定。
- 不计划逆向 Acrobat 二进制；只通过公开文件格式、脚本、UI 自动化实现能力。

## 10. 验收标准

- `npm test` 全部通过。
- `acrobat-cli pdf info/merge/split/rotate/delete/extract/encrypt/decrypt/bookmarks/inject` 均可用。
- README 和 SKILL.md 包含完整命令说明。
- GitHub 仓库已推送最新代码。
