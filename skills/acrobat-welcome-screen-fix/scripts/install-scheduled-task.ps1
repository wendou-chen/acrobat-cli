# Installs scheduled tasks that keep the Acrobat popup suppression fix applied.
# Run as Administrator (self-elevates if needed).

$ErrorActionPreference = 'Stop'

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', $PSCommandPath
    ) -Verb RunAs -Wait
    exit
}

$runner = Join-Path $PSScriptRoot 'keep-alive.ps1'
$cmd = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$runner`""

schtasks /create /tn "AcrobatWelcomeFix" /tr $cmd /sc ONLOGON /rl HIGHEST /f
schtasks /create /tn "AcrobatWelcomeFixHourly" /tr $cmd /sc MINUTE /mo 30 /rl HIGHEST /f

Write-Host 'Scheduled tasks installed: AcrobatWelcomeFix (logon), AcrobatWelcomeFixHourly (every 30 min).'
