# Lifecycle and Root Cause Notes

This document records why Acrobat shows login/network popups and how the fix evolved.

## Symptoms

- Opening a PDF shows an Adobe ID login page.
- Opening a PDF shows "无法连接网络" / cannot connect to network.
- An embedded browser window appears inside Acrobat.
- Window classes observed: `EmbeddedWB`, `Internet Explorer_Server`, `Shell DocObject View`, `AcroMissingCompWClass`.

## Root cause

Acrobat tries to load online content (Welcome/Home/Login) on startup. If the embedded Chromium component `AcroCEF.exe` is missing, Acrobat falls back to an embedded Internet Explorer browser, which tries to reach Adobe servers. When the network is blocked/unavailable, it shows a network error popup. The login page is the same online content flow.

## Why registry settings are the correct fix

Adobe provides enterprise/STIG registry policies to disable the Welcome screen and startup messages. These are supported configurations, not cracks:

- `HKLM\SOFTWARE\Policies\Adobe\Adobe Acrobat\DC\FeatureLockDown\cWelcomeScreen\bShowWelcomeScreen = 0`
- `HKLM\SOFTWARE\Policies\Adobe\Adobe Acrobat\DC\FeatureLockDown\cIPM\bDontShowMsgWhenViewingDoc = 0`
- `HKLM\SOFTWARE\Policies\Adobe\Adobe Acrobat\DC\FeatureLockDown\cIPM\bShowMsgAtLaunch = 0`
- `HKCU\Software\Adobe\Adobe Acrobat\DC\Workflows\bEnableAcrobatHS = 0`

The `cWelcomeScreen\bShowWelcomeScreen` key is the one that finally stops the Welcome/Login screen from loading. The other keys suppress startup messages.

## What did NOT work / mistakes to avoid

- Only setting `bEnableAcrobatHS = 0` is not enough to stop the embedded browser network popup.
- Deleting `AcroCEF.exe` removes the Chromium component but does NOT stop Acrobat from trying to load online content; it just makes Acrobat fall back to an older embedded browser and can cause `AcroMissingCompWClass`.
- Deleting license/auth files to bypass login is not a supported fix and is outside the scope of this skill.
- Running Acrobat from a different install path (C vs D) can change which files are loaded and make the popup appear/disappear.

## Verification

After applying the registry keys:

1. Close all Acrobat processes.
2. Open a PDF with Acrobat.
3. Enumerate windows for the Acrobat process.
4. Confirm there are no visible `EmbeddedWB` / `Internet Explorer_Server` / `Shell DocObject View` windows and no login/network error titles.

The fix is verified when only the PDF document window and normal Acrobat UI are visible.

## Important findings from real debugging

- Opening Acrobat **with a PDF** does not show the login/Home popup after the registry keys are applied.
- Opening Acrobat **without a PDF** may still show the Home screen (visible `EmbeddedWB` / `Internet Explorer_Server` windows) on some versions, even with `bShowWelcomeScreen=0`, `HomeScreenOptionWhenDocClosed=0`, `bAddCustomFile=0`, and `bHideHelpWelcome=1`.
- In tests, `bEnableAcrobatHS` did **not** reset on normal close; the earlier reappearance was caused by the value being absent (e.g., after manual revert or an update).
- Deleting `AcroCEF.exe` is not a permanent fix. It does not remove the Home screen; it only forces Acrobat to use the embedded IE fallback.

## Keeping the fix durable

Because Acrobat/updates may remove HKCU values, install the scheduled tasks:

- `AcrobatWelcomeFix` (logon)
- `AcrobatWelcomeFixHourly` (every 30 minutes)

Both run `keep-alive.ps1`, which re-applies every registry value. HKLM policy values are the most durable because they live under `SOFTWARE\Policies\Adobe`.

## Revert

Delete the registry values listed in SKILL.md and remove the two scheduled tasks. No other system state is changed by this skill.
