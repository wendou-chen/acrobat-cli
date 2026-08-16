# acrobat-cli

Windows 下用于 Acrobat 自动化的小型 CLI，重点解决 `outline-markdown-export-native-*.pdf` 临时 PDF 被 Acrobat 打开后无法自动关闭的问题。

参考 [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli) 的结构：CLI + `skills/acrobat-cli/SKILL.md` 技能说明。

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
| `acrobat-cli pdf extract <file> --chapter <kw> --sections a,b -o out.pdf` | 按书签提取章节页面 |
| `acrobat-cli pdf encrypt <file> --user-password <p> --owner-password <p> -o out.pdf` | 加密 PDF |
| `acrobat-cli pdf decrypt <file> --password <p> -o out.pdf` | 解密 PDF |
| `acrobat-cli pdf bookmarks <file>` | 输出书签树 |
| `acrobat-cli pdf inject <file>` | 注入 self-close OpenAction |
| `acrobat-cli ui open <pdf>` | 以隐藏后台实例打开 PDF |
| `acrobat-cli ui save <pdf>` | 用隐藏 Acrobat COM 保存 PDF |
| `acrobat-cli ui save-as <pdf> <output>` | 用隐藏 Acrobat COM 另存 PDF |
| `acrobat-cli ui print <pdf> [--pages 1-3]` | 用隐藏 Acrobat COM 打印 PDF |
| `acrobat-cli ui close --pid <pid>` | 关闭指定隐藏实例 |
| `acrobat-cli ui list` | 列出 CLI 启动的隐藏实例 |
| `acrobat-cli ui status --pid <pid>` | 查看隐藏实例状态 |
| `acrobat-cli ui close-all` | 关闭所有 CLI 启动的隐藏实例 |
| `acrobat-cli watch [--dir=<path>] [--poll=<ms>] [--once]` | 监听目录中的 outline 临时 PDF，自动注入 self-close |
| `acrobat-cli list` | 列出 Acrobat 窗口 |
| `acrobat-cli close-outline` | 尽力关闭标题匹配 outline 的 Acrobat 标签（Ctrl+W） |
| `acrobat-cli status` | 显示 Acrobat 状态与 TEMP 中的 outline PDF |

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
acrobat-cli version   # 应输出 0.1.0
npm test              # 应 2 个测试全部通过
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

## 回退

```powershell
npm unlink -g acrobat-cli
Remove-Item -Recurse -Force "C:\Users\admin\.claude\skills\acrobat-cli"
Remove-Item -Recurse -Force "D:\Coding工具专用文件夹\acrobat-cli"
```

## License

MIT License，详见 [LICENSE](LICENSE)。
