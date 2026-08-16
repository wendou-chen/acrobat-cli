# acrobat-cli

Windows 下用于 Acrobat/PDF 自动化的开源 CLI。支持隐藏后台 Acrobat 实例、COM 操作、原生导出检测、PDF 文档处理、表单填写、OCR、注释、签名、书签提取等。

项目结构参考 [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli)：一个轻量 Node CLI + `skills/acrobat-cli/SKILL.md` 技能说明。代码为自研实现，仅使用 MIT 许可的 `pdf-lib`，不包含 Playwright/微软任何专有代码。

## 功能

| 命令 | 说明 |
|---|---|
| `acrobat-cli pdf info <file>` | 显示 PDF 页数、加密状态、元数据 |
| `acrobat-cli pdf merge <files...> -o out.pdf` | 合并多个 PDF |
| `acrobat-cli pdf split <file> --ranges 1-3,5 -o outdir` | 按页码范围拆分 PDF |
| `acrobat-cli pdf rotate <file> --pages 1-3 --angle 90 -o out.pdf` | 旋转指定页面 |
| `acrobat-cli pdf delete <file> --pages 2,4 -o out.pdf` | 删除指定页面 |
| `acrobat-cli pdf insert-blank <file> --after 2 -o out.pdf` | 在指定页后插入空白页 |
| `acrobat-cli pdf crop <file> --pages 1-3 --box 0,0,300,400 -o out.pdf` | 裁剪指定页面 |
| `acrobat-cli pdf replace-pages <file> --src src.pdf --range 1-3 -o out.pdf` | 用源 PDF 页面替换指定范围 |
| `acrobat-cli pdf watermark <file> --text 机密 -o out.pdf` | 添加文字水印 |
| `acrobat-cli pdf compress <file> -o out.pdf` | 压缩 PDF |
| `acrobat-cli pdf pdfa <file> -o out.pdf` | 输出最佳努力 PDF/A 兼容文件 |
| `acrobat-cli pdf extract <file> --chapter <kw> --sections a,b -o out.pdf` | 按书签提取章节页面 |
| `acrobat-cli pdf encrypt <file> --user-password <p> --owner-password <p> -o out.pdf` | 加密 PDF |
| `acrobat-cli pdf decrypt <file> --password <p> -o out.pdf` | 解密 PDF |
| `acrobat-cli pdf bookmarks <file>` | 输出书签树 |
| `acrobat-cli pdf inject <file>` | 注入 self-close OpenAction |
| `acrobat-cli ui open <pdf>` | 以隐藏后台实例打开 PDF |
| `acrobat-cli ui save <pdf>` | 用隐藏 Acrobat COM 保存 PDF |
| `acrobat-cli ui save-as <pdf> <output>` | 用隐藏 Acrobat COM 另存 PDF |
| `acrobat-cli ui print <pdf> [--pages 1-3]` | 用隐藏 Acrobat COM 打印 PDF |
| `acrobat-cli ui export <pdf> --format txt/png/docx/xlsx/pptx/html -o <output> [--native-only]` | 导出 PDF 内容（优先 Acrobat 原生导出，失败自动回退 Python；`--native-only` 强制只用原生） |
| `acrobat-cli ui native-check <pdf>` | 检测当前 Acrobat 是否支持原生导出（JS 桥/过滤器） |
| `acrobat-cli ui close --pid <pid>` | 关闭指定隐藏实例 |
| `acrobat-cli ocr <pdf> --lang chi_sim -o out.txt` | OCR 识别为文本 |
| `acrobat-cli form list <pdf>` | 列出表单字段 |
| `acrobat-cli form fill <pdf> --field name --value 张三 -o out.pdf` | 填写表单字段 |
| `acrobat-cli annotate <pdf> --page 1 --rect ... -o out.pdf` | 添加注释/高亮 |
| `acrobat-cli sign <pdf> --text 签名 --page 1 --rect ... -o out.pdf` | 添加可见签名文本 |
| `acrobat-cli ui list` | 列出 CLI 启动的隐藏实例 |
| `acrobat-cli ui status --pid <pid>` | 查看隐藏实例状态 |
| `acrobat-cli ui close-all` | 关闭所有 CLI 启动的隐藏实例 |
| `acrobat-cli watch [--dir=<path>] [--poll=<ms>] [--once]` | 监听目录中的 outline 临时 PDF，自动注入 self-close |
| `acrobat-cli list` | 列出 Acrobat 窗口 |
| `acrobat-cli close-outline` | 尽力关闭标题匹配 outline 的 Acrobat 标签（Ctrl+W） |
| `acrobat-cli status` | 显示 Acrobat 状态与 TEMP 中的 outline PDF |

## 为什么不会侵权

- 本仓库是**自研 Node.js CLI**，不复制 Playwright/微软的源码。
- 参考的只是 `playwright-cli` 的**组织方式**：CLI 入口 + `bin` + `skills/SKILL.md`，这是通用工程模式。
- 唯一第三方运行依赖是 MIT 许可的 `pdf-lib`。
- Acrobat COM 操作、PowerShell 脚本、Python PDF 处理均为本项目原创。
- 社区中已有 Acrobat 动作/插件项目（如 `binghe/Acrobat-Actions`），但本项目的定位是**命令行自动化 + AI 技能集成**，与它们不构成代码冲突。

## 与 playwright-cli 的对齐

| 维度 | playwright-cli | acrobat-cli |
|---|---|---|
| 入口 | `bin: { "playwright-cli": "playwright-cli.js" }` | `bin: { "acrobat-cli": "acrobat-cli.js" }` |
| 参数解析 | `minimist` | 内置 `parseArgs`（支持 `--key=value` 与 `-o value`） |
| 技能 | `skills/.../SKILL.md` | `skills/acrobat-cli/SKILL.md` |
| Node 要求 | `>=18` | `>=18` |
| 测试 | `playwright test` | `node --test tests/*.test.js` |
| License | Apache-2.0 | MIT |

## 环境要求

- Windows 10/11
- Node.js 18+
- npm
- Python 3 + `pypdf`（`pdf` 子命令需要）
- Adobe Acrobat Pro DC（用于实际 PDF 自动关闭验证）
- 可选：GitHub CLI `gh`（用于开源仓库操作）

## 部署方式

### 一、人工部署（Manual Deployment）

适合人类按步骤操作：

```powershell
# 1. 进入项目目录
cd D:\Coding工具专用文件夹\acrobat-cli

# 2. 安装依赖
npm install

# 3. 全局链接，生成 acrobat-cli 命令
npm link

# 4. 验证安装
acrobat-cli version
acrobat-cli help

# 5. 安装 Claude Code 技能（可选）
# 把 skills/acrobat-cli 复制到全局技能目录
Copy-Item -Recurse -Force "D:\Coding工具专用文件夹\acrobat-cli\skills\acrobat-cli" "C:\Users\admin\.claude\skills\acrobat-cli"

# 6. 验证技能
Get-ChildItem "C:\Users\admin\.claude\skills\acrobat-cli"
```

### 二、Agent 部署（Agent Deployment）

适合 AI Agent 直接执行。以下命令可整段交给 Agent 运行：

```powershell
# 1. 环境检查
node --version
npm --version
git --version

# 2. 安装依赖并全局链接
cd D:\Coding工具专用文件夹\acrobat-cli
npm install
npm link

# 3. 运行自检
npm test
acrobat-cli version
acrobat-cli status

# 4. 安装 Claude Code 技能
$skillSrc = "D:\Coding工具专用文件夹\acrobat-cli\skills\acrobat-cli"
$skillDst = "C:\Users\admin\.claude\skills\acrobat-cli"
if (Test-Path $skillDst) { Remove-Item -Recurse -Force $skillDst }
Copy-Item -Recurse -Force $skillSrc $skillDst

# 5. 验证技能文件存在
Test-Path "C:\Users\admin\.claude\skills\acrobat-cli\SKILL.md"
```

Agent 部署验收标准：

```powershell
acrobat-cli version   # 应输出 0.2.0
npm test              # 应 21 个测试全部通过
acrobat-cli status    # 应能显示 Acrobat 状态
Test-Path "C:\Users\admin\.claude\skills\acrobat-cli\SKILL.md"  # 应为 True
```

### 三、管理员权限说明

如果需要把 Acrobat 默认安装路径从 C 盘切换到 D 盘，需要修改 HKLM 注册表，必须管理员权限：

```powershell
# 以管理员身份运行 PowerShell 后执行：
$d = 'D:\Adobe\Acrobat DC\Acrobat'
reg add "HKLM\SOFTWARE\Adobe\Adobe Acrobat\DC\InstallPath" /ve /t REG_SZ /d $d /f
reg add "HKLM\SOFTWARE\WOW6432Node\Adobe\Adobe Acrobat\DC\InstallPath" /ve /t REG_SZ /d $d /f
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Acrobat.exe" /ve /t REG_SZ /d "$d\Acrobat.exe" /f
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Acrobat.exe" /v Path /t REG_SZ /d "$d\" /f
```

> 注意：如果当前 Agent 沙箱没有管理员权限，上述命令会报 `Access is denied`。请让用户以管理员身份启动终端后再执行，或由人工手动执行。

## 使用示例

```powershell
# 手动给一个临时 PDF 注入自关闭动作
acrobat-cli inject "$env:TEMP\outline-markdown-export-native-abc.pdf"

# 持续监听系统 TEMP
acrobat-cli watch

# 只处理当前已存在的 outline PDF
acrobat-cli watch --once

# 按书签提取“相似矩阵”章节的综合题+拓展题
acrobat-cli pdf extract "D:\a考研\Obsidian Vault\考研数学\习题集\26李林880题-数学一-试题分册.pdf" --chapter "相似矩阵" --sections="综合,拓展" -o "D:\a考研\Obsidian Vault\考研数学\习题集\相似矩阵综合提高篇.pdf"

# 合并 PDF
acrobat-cli pdf merge a.pdf b.pdf -o merged.pdf

# 拆分 PDF
acrobat-cli pdf split input.pdf --ranges 1-3,5 -o split_dir

# 查看书签
acrobat-cli pdf bookmarks input.pdf

# 加密
acrobat-cli pdf encrypt input.pdf --user-password 123 --owner-password 456 -o encrypted.pdf

# 后台隐藏打开 Acrobat
acrobat-cli ui open input.pdf
acrobat-cli ui list
acrobat-cli ui close-all
```

## 技能

Claude Code 技能位于：

- 项目内：`skills/acrobat-cli/SKILL.md`
- 全局：`C:\Users\admin\.claude\skills\acrobat-cli\SKILL.md`

## Acrobat 提取页面后无法保存的已知问题

如果你遇到 Acrobat “提取页面”后无法另存为 PDF，这是 Acrobat 的已知问题/安装异常，和本 CLI 无关。可用以下方式绕过：

1. 在 Acrobat 中：`文件 → 打印 → Microsoft Print to PDF` 另存
2. 或使用本项目的书签提取方案：按 PDF 书签直接提取页面生成新文件，完全绕过 Acrobat 保存
3. 根治建议：在 D 盘 Acrobat 中执行 `帮助 → 修复安装`，或重新登录 Adobe 账号

## 测试

```powershell
npm test
```

当前测试覆盖：

- 后台状态文件管理
- PDF 信息/合并/拆分/旋转/删除/插入空白/裁剪/替换页/水印/压缩/PDF-A/书签提取/加密解密/书签输出
- 表单字段检测、注释、签名、OCR
- outline 临时 PDF 匹配与 self-close 注入

多轮压力测试：

```powershell
# 连续跑 3 轮
1..3 | ForEach-Object { Write-Host "=== Round $_ ==="; node --test tests/*.test.js }
```

## 回退

```powershell
npm unlink -g acrobat-cli
Remove-Item -Recurse -Force "C:\Users\admin\.claude\skills\acrobat-cli"
Remove-Item -Recurse -Force "D:\Coding工具专用文件夹\acrobat-cli"
```

## License

MIT License，详见 [LICENSE](LICENSE)。
