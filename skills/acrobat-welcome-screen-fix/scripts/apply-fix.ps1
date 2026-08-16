# Apply Adobe Acrobat DC Welcome/Login/Network popup suppression registry settings.
# Self-elevates with UAC when not run as Administrator.

$ErrorActionPreference = 'Stop'

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host 'Not elevated. Relaunching as Administrator...'
    Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', $PSCommandPath
    ) -Verb RunAs -Wait
    exit
}

$base = 'HKLM:\SOFTWARE\Policies\Adobe\Adobe Acrobat\DC\FeatureLockDown'
if (-not (Test-Path $base)) { New-Item -Path $base -Force | Out-Null }

$cWelcome = Join-Path $base 'cWelcomeScreen'
if (-not (Test-Path $cWelcome)) { New-Item -Path $cWelcome -Force | Out-Null }
Set-ItemProperty -Path $cWelcome -Name 'bShowWelcomeScreen' -Value 0 -Type DWord -Force

$cIPM = Join-Path $base 'cIPM'
if (-not (Test-Path $cIPM)) { New-Item -Path $cIPM -Force | Out-Null }
Set-ItemProperty -Path $cIPM -Name 'bDontShowMsgWhenViewingDoc' -Value 0 -Type DWord -Force
Set-ItemProperty -Path $cIPM -Name 'bShowMsgAtLaunch' -Value 0 -Type DWord -Force

$wf = 'HKCU:\Software\Adobe\Adobe Acrobat\DC\Workflows'
if (-not (Test-Path $wf)) { New-Item -Path $wf -Force | Out-Null }
Set-ItemProperty -Path $wf -Name 'bEnableAcrobatHS' -Value 0 -Type DWord -Force

Write-Host 'Applied Acrobat Welcome/Login/Network popup suppression settings.'
