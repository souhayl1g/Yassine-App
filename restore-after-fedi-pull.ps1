# Quick Restore Script - Run After Pulling from Fedi
# This script will restore all your automation files from the most recent backup

param(
    [string]$BackupDir = "D:\Yassine-App-Backup-*"
)

Write-Host "🔄 Restore After Fedi Pull - Starting..." -ForegroundColor Cyan
Write-Host ""

# Find latest backup
$latestBackup = Get-ChildItem -Path "D:\" -Directory -Filter "Yassine-App-Backup-*" | Sort-Object Name -Descending | Select-Object -First 1

if (!$latestBackup) {
    Write-Host "❌ No backup found!" -ForegroundColor Red
    Write-Host "Please create a backup first:" -ForegroundColor Yellow
    Write-Host '   Copy-Item -Path "D:\Yassine App" -Destination "D:\Yassine-App-Backup-$(Get-Date -Format ''yyyy-MM-dd_HHmmss'')" -Recurse' -ForegroundColor White
    exit 1
}

Write-Host "📦 Using backup: $($latestBackup.FullName)" -ForegroundColor Green
Write-Host ""

$backupPath = $latestBackup.FullName
$targetPath = "D:\Yassine App"

# Critical files to restore
$criticalFiles = @(
    "launch-app.ps1",
    "start-backend-ngrok.ps1",
    "update-vercel.ps1",
    "Yassine Olive Mill.vbs",
    "create-desktop-app.ps1",
    "setup-autostart.ps1",
    "uninstall-autostart.ps1",
    "SETUP-EVERYTHING.ps1",
    "CONFIGURATION-BACKUP.md",
    "PULL-FROM-FEDI-GUIDE.md",
    "logs\ngrok-url.txt",
    "logs\backend.log",
    "logs\ngrok.log",
    "Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi\public\manifest.json",
    "Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi\.env",
    "Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi\.env.production",
    "yassine_olive_mill_backend-fedi\.env"
)

$restored = 0
$missing = 0

foreach ($file in $criticalFiles) {
    $sourcePath = Join-Path $backupPath $file
    $destPath = Join-Path $targetPath $file
    
    if (Test-Path $sourcePath) {
        # Create directory if needed
        $destDir = Split-Path $destPath -Parent
        if (!(Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "✅ Restored: $file" -ForegroundColor Green
        $restored++
    } else {
        Write-Host "⚠️  Not found in backup: $file" -ForegroundColor Yellow
        $missing++
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 Restoration Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Restored: $restored files" -ForegroundColor Green
if ($missing -gt 0) {
    Write-Host "   ⚠️  Missing: $missing files" -ForegroundColor Yellow
}
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "🎉 Restoration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Test if backend works:" -ForegroundColor White
Write-Host "      cd 'D:\Yassine App'" -ForegroundColor Gray
Write-Host "      .\launch-app.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. If npm dependencies changed, reinstall:" -ForegroundColor White
Write-Host "      cd 'D:\Yassine App\yassine_olive_mill_backend-fedi\yassine_olive_mill_backend-fedi'" -ForegroundColor Gray
Write-Host "      npm install" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Recreate desktop shortcut:" -ForegroundColor White
Write-Host "      .\create-desktop-app.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
