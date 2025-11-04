# Yassine Olive Mill - Desktop App Icon Creator
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Yassine Olive Mill" -ForegroundColor Green
Write-Host "   Desktop App Icon Creator" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$appPath = "D:\Yassine App"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$startMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
$vbsFile = "$appPath\Yassine Olive Mill.vbs"

if (-not (Test-Path $vbsFile)) {
    Write-Host "Error: Launcher not found at $vbsFile" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Creating desktop shortcut..." -ForegroundColor Yellow

$WshShell = New-Object -ComObject WScript.Shell

# Desktop shortcut
$shortcut1 = "$desktopPath\Yassine Olive Mill.lnk"
$Shortcut = $WshShell.CreateShortcut($shortcut1)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$vbsFile`""
$Shortcut.WorkingDirectory = $appPath
$Shortcut.Description = "Yassine Olive Mill Management System"
$Shortcut.IconLocation = "imageres.dll,108"
$Shortcut.Save()

Write-Host "Desktop icon created!" -ForegroundColor Green
Write-Host ""

# Start Menu shortcut
Write-Host "Creating Start Menu shortcut..." -ForegroundColor Yellow
$shortcut2 = "$startMenuPath\Yassine Olive Mill.lnk"
$Shortcut2 = $WshShell.CreateShortcut($shortcut2)
$Shortcut2.TargetPath = "wscript.exe"
$Shortcut2.Arguments = "`"$vbsFile`""
$Shortcut2.WorkingDirectory = $appPath
$Shortcut2.Description = "Yassine Olive Mill Management System"
$Shortcut2.IconLocation = "imageres.dll,108"
$Shortcut2.Save()

Write-Host "Start Menu icon created!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   DONE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Launch from Desktop or Start Menu" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
