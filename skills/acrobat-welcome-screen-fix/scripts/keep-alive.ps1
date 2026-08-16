# Re-applies Acrobat Welcome/Login/Network popup suppression registry values.
# Use with Task Scheduler to keep the fix in place even if Acrobat resets values.

$ErrorActionPreference = 'Continue'

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

$av = 'HKCU:\Software\Adobe\Adobe Acrobat\DC\AVGeneral'
if (-not (Test-Path $av)) { New-Item -Path $av -Force | Out-Null }
Set-ItemProperty -Path $av -Name 'HomeScreenOptionWhenDocClosed' -Value 0 -Type DWord -Force
Set-ItemProperty -Path $av -Name 'bAddCustomFile' -Value 0 -Type DWord -Force
Set-ItemProperty -Path $av -Name 'bHideHelpWelcome' -Value 1 -Type DWord -Force
