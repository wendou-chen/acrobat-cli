---
name: acrobat-welcome-screen-fix
description: Fix Adobe Acrobat DC startup popups including Adobe ID login, "无法连接网络" network error, Welcome screen, and embedded browser windows. Use when Acrobat opens with a login page, cannot-connect-to-network dialog, Welcome/Home screen, or EmbeddedWB/Internet Explorer_Server popups. Applies official Adobe enterprise/STIG registry policies to suppress online content; includes apply and verify scripts.
---

# Acrobat Welcome Screen Fix

## Overview

Adobe Acrobat DC may show popups on startup:

- Adobe ID login / sign-in prompt
- "无法连接网络" / cannot connect to network dialog
- Welcome / Home screen
- Embedded browser windows (`EmbeddedWB`, `Internet Explorer_Server`, `Shell DocObject View`)

These appear because Acrobat tries to load online content. The fix below uses **official Adobe enterprise/STIG registry policies** to disable the Welcome screen and startup messages. It is not a crack and does not touch license/auth files.

## When to use

- Acrobat opens but immediately shows a login page or network error popup.
- The PDF document opens, but an extra embedded browser window appears.
- User wants Acrobat to open directly to the PDF without online popups.

## Apply the fix

Run as Administrator:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/apply-fix.ps1
```

If not elevated, the script will relaunch itself with UAC.

## Verify

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-fix.ps1
```

Expected output:

```text
bShowWelcomeScreen        : 0
bDontShowMsgWhenViewingDoc: 0
bShowMsgAtLaunch          : 0
bEnableAcrobatHS          : 0
```

## Make it permanent

The HKCU value `bEnableAcrobatHS` may be removed by Acrobat/updates. To keep the fix applied, install scheduled tasks that re-apply all values at logon and every 30 minutes:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-scheduled-task.ps1
```

This creates:

- `AcrobatWelcomeFix` — runs at logon
- `AcrobatWelcomeFixHourly` — runs every 30 minutes

Both execute `scripts/keep-alive.ps1`.

## Registry keys set

| Key | Value | Type |
|---|---|---|
| `HKLM\SOFTWARE\Policies\Adobe\Adobe Acrobat\DC\FeatureLockDown\cWelcomeScreen` | `bShowWelcomeScreen` = `0` | REG_DWORD |
| `HKLM\SOFTWARE\Policies\Adobe\Adobe Acrobat\DC\FeatureLockDown\cIPM` | `bDontShowMsgWhenViewingDoc` = `0` | REG_DWORD |
| `HKLM\SOFTWARE\Policies\Adobe\Adobe Acrobat\DC\FeatureLockDown\cIPM` | `bShowMsgAtLaunch` = `0` | REG_DWORD |
| `HKCU\Software\Adobe\Adobe Acrobat\DC\Workflows` | `bEnableAcrobatHS` = `0` | REG_DWORD |
| `HKCU\Software\Adobe\Adobe Acrobat\DC\AVGeneral` | `HomeScreenOptionWhenDocClosed` = `0` | REG_DWORD |
| `HKCU\Software\Adobe\Adobe Acrobat\DC\AVGeneral` | `bAddCustomFile` = `0` | REG_DWORD |
| `HKCU\Software\Adobe\Adobe Acrobat\DC\AVGeneral` | `bHideHelpWelcome` = `1` | REG_DWORD |

## Important limitation

Opening Acrobat **without a PDF** may still show the Home screen (embedded browser) on some versions, even with these settings. Opening Acrobat **with a PDF** does not show it. For automation, always pass a PDF file path.

## Revert

Delete the values created by this skill:

```powershell
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Adobe\Adobe Acrobat\DC\FeatureLockDown\cWelcomeScreen' -Name 'bShowWelcomeScreen'
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Adobe\Adobe Acrobat\DC\FeatureLockDown\cIPM' -Name 'bDontShowMsgWhenViewingDoc'
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Adobe\Adobe Acrobat\DC\FeatureLockDown\cIPM' -Name 'bShowMsgAtLaunch'
Remove-ItemProperty -Path 'HKCU:\Software\Adobe\Adobe Acrobat\DC\Workflows' -Name 'bEnableAcrobatHS'
Remove-ItemProperty -Path 'HKCU:\Software\Adobe\Adobe Acrobat\DC\AVGeneral' -Name 'HomeScreenOptionWhenDocClosed'
Remove-ItemProperty -Path 'HKCU:\Software\Adobe\Adobe Acrobat\DC\AVGeneral' -Name 'bAddCustomFile'
Remove-ItemProperty -Path 'HKCU:\Software\Adobe\Adobe Acrobat\DC\AVGeneral' -Name 'bHideHelpWelcome'
```

To remove the scheduled tasks:

```powershell
schtasks /delete /tn "AcrobatWelcomeFix" /f
schtasks /delete /tn "AcrobatWelcomeFixHourly" /f
```

## Resources

- `scripts/apply-fix.ps1` — applies all registry settings (self-elevating)
- `scripts/verify-fix.ps1` — verifies registry settings
- `scripts/keep-alive.ps1` — re-applies settings (used by scheduled tasks)
- `scripts/install-scheduled-task.ps1` — installs the logon/hourly scheduled tasks
- `references/lifecycle.md` — full lifecycle and root-cause notes from real debugging
