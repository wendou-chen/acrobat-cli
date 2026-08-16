# acrobat-cli 全功能 + 后台隐藏 Acrobat 设计

日期：2026-04-10
状态：已批准（用户确认独立隐藏实例 + 分阶段实现）

## 1. 背景与目标

用户希望 `acrobat-cli` 最终覆盖 Acrobat/PDF 的主要能力，并且所有需要启动 Acrobat 的操作都必须在后台隐藏运行，不能弹窗干扰其他工作。

本设计在现有 `pdf` 文档操作基础上，新增：

- 后台隐藏 Acrobat 实例管理器
- `ui` 命令组（打开/关闭/保存/另存/打印/导出）
- `pdf` 高级操作（插入/替换/裁剪/水印/压缩/PDF/A）
- 深层能力（OCR/表单/注释/签名）

## 2. 核心架构

### 后台隐藏实例管理器 `lib/background.js`

职责：

- 使用 `Acrobat.exe /n <pdf>` 启动独立 Acrobat 进程
- 使用 `Start-Process -WindowStyle Hidden` 或 `SW_HIDE` 隐藏窗口
- 记录 CLI 启动的隐藏 PID
- 只关闭 CLI 自己启动的 PID，不影响用户正在使用的 Acrobat
- 提供 `open`、`close`、`list`、`status`、`closeAll`

### 命令组织

```text
acrobat-cli ui <command> [options]
acrobat-cli pdf <command> [options]
acrobat-cli watch / status / list / close-outline
```

## 3. 分阶段实施

### Phase 1：后台隐藏实例

```text
acrobat-cli ui open <pdf> [--hidden]
acrobat-cli ui close --pid <pid>
acrobat-cli ui list
acrobat-cli ui status --pid <pid>
acrobat-cli ui close-all
```

### Phase 2：Acrobat UI 操作

```text
acrobat-cli ui save --pid <pid>
acrobat-cli ui save-as <output> --pid <pid>
acrobat-cli ui print <pdf> [--printer <name>]
acrobat-cli ui export <pdf> --format docx/xlsx/png -o <output>
```

### Phase 3：PDF 高级操作（pypdf/pdf-lib）

```text
acrobat-cli pdf insert-blank --after <page> -o out.pdf
acrobat-cli pdf replace-pages --src <pdf> --range 1-3 -o out.pdf
acrobat-cli pdf crop --pages 1-3 --box 0,0,300,400 -o out.pdf
acrobat-cli pdf watermark --text "机密" -o out.pdf
acrobat-cli pdf compress -o out.pdf
acrobat-cli pdf pdfa -o out.pdf
```

### Phase 4：Acrobat 深层能力

```text
acrobat-cli ocr <pdf> --lang chi_sim -o out.pdf
acrobat-cli form list <pdf>
acrobat-cli form fill <pdf> --field name --value 张三 -o out.pdf
acrobat-cli annotate add <pdf> --type highlight --page 1 --rect ... -o out.pdf
acrobat-cli sign <pdf> --cert <pfx> --password *** -o out.pdf
```

## 4. 后台隐藏实现方式

- 打印：`Acrobat.exe /t <pdf> <printer>` 静默打印。
- 打开/关闭：`/n` + 隐藏窗口，记录 PID。
- 保存/另存/导出：优先尝试隐藏窗口内 JavaScript/COM；若隐藏窗口无法接收输入，则使用最小化/离屏窗口方案，保证不遮挡用户工作。

## 5. 测试策略

- 每个命令至少一个 smoke test。
- 后台实例测试：启动隐藏实例，确认 PID 存在且不影响已有 Acrobat 窗口。
- 关闭测试：确认只关闭 CLI 启动的 PID。
- 文档操作测试：生成临时 PDF 验证输出。

## 6. 技能与部署

- 更新 `skills/acrobat-cli/SKILL.md` 为完整命令树。
- 同步全局技能和项目 `.dsh/skills/acrobat-cli`。
- 保持 `npm test` 一键可跑。

## 7. 验收标准

- `npm test` 全部通过。
- `ui open/close/list/status/close-all` 可用且不影响用户 Acrobat。
- `pdf` 高级操作命令可用。
- 深层能力（OCR/表单/注释/签名）至少提供基础可用版本。
- 文档和技能已更新，GitHub 已推送。

## 8. 风险

- Acrobat 隐藏窗口的保存/导出可能依赖 UI 自动化，稳定性受系统影响。
- OCR/表单/签名等能力可能需要额外依赖（Tesseract、pikepdf、证书库）。
- 部分功能可能需要 Acrobat SDK/插件，超出纯 CLI 范围时需与用户确认。
