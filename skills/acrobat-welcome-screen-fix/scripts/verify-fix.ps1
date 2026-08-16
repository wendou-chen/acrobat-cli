# Verify Adobe Acrobat DC Welcome/Login/Network popup suppression registry settings.

$ErrorActionPreference = 'Continue'

$paths = @(
    @{ Name = 'bShowWelcomeScreen'; Path = 'HKLM:\SOFTWARE\Policies\Adobe\Adobe Acrobat\DC\FeatureLockDown\cWelcomeScreen' },
    @{ Name = 'bDontShowMsgWhenViewingDoc'; Path = 'HKLM:\SOFTWARE\Policies\Adobe\Adobe Acrobat\DC\FeatureLockDown\cIPM' },
    @{ Name = 'bShowMsgAtLaunch'; Path = 'HKLM:\SOFTWARE\Policies\Adobe\Adobe Acrobat\DC\FeatureLockDown\cIPM' },
    @{ Name = 'bEnableAcrobatHS'; Path = 'HKCU:\Software\Adobe\Adobe Acrobat\DC\Workflows' }
)

$allOk = $true
foreach ($item in $paths) {
    $value = (Get-ItemProperty -Path $item.Path -Name $item.Name -ErrorAction SilentlyContinue).$($item.Name)
    if ($null -eq $value) {
        Write-Host "$($item.Name) : NOT SET" -ForegroundColor Red
        $allOk = $false
    } else {
        Write-Host "$($item.Name) : $value"
        if ($value -ne 0) { $allOk = $false }
    }
}

if ($allOk) {
    Write-Host 'All settings OK.' -ForegroundColor Green
} else {
    Write-Host 'Some settings are missing or not 0.' -ForegroundColor Yellow
}
