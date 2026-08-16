# acrobat-cli

Windows 下用于 Acrobat 自动化的小型 CLI，重点解决 `outline-markdown-export-native-*.pdf` 临时 PDF 被 Acrobat 打开后无法自动关闭的问题。

参考 [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli) 的结构：CLI + `skills/acrobat-cli/SKILL.md` 技能说明。

## 安装

```powershell
cd D:\Coding工具专用文件夹\acrobat-cli
npm install
npm link
```

安装后全局命令：

```powershell
acrobat-cli version
acrobat-cli help
```

## 命令

| 命令 | 说明 |
|---|---|
| `acrobat-cli inject <pdf> [--output=<path>]` | 给 PDF 注入 `this.closeDoc(true)` OpenAction，打开后自动关闭 |
| `acrobat-cli watch [--dir=<path>] [--poll=<ms>] [--once]` | 监听目录中的 outline 临时 PDF，自动注入 self-close |
| `acrobat-cli list` | 列出 Acrobat 窗口 |
| `acrobat-cli close-outline` | 尽力关闭标题匹配 outline 的 Acrobat 标签（Ctrl+W） |
| `acrobat-cli status` | 显示 Acrobat 状态与 TEMP 中的 outline PDF |

## 示例

```powershell
# 手动给一个临时 PDF 注入自关闭动作
acrobat-cli inject "$env:TEMP\outline-markdown-export-native-abc.pdf"

# 持续监听系统 TEMP
acrobat-cli watch

# 只处理当前已存在的 outline PDF
acrobat-cli watch --once
```

## 技能

Claude Code 技能位于：

- 项目内：`skills/acrobat-cli/SKILL.md`
- 全局：`C:\Users\admin\.claude\skills\acrobat-cli\SKILL.md`

## 回退

```powershell
npm unlink -g acrobat-cli
Remove-Item -Recurse -Force "C:\Users\admin\.claude\skills\acrobat-cli"
Remove-Item -Recurse -Force "D:\Coding工具专用文件夹\acrobat-cli"
```
