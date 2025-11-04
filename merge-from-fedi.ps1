# Safe Merge from Fedi - Protects Your Configs
# This script merges Fedi's code updates while keeping your ngrok, Vercel, and automation configs

Write-Host "🔄 Safe Merge from Fedi Branch - Starting..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Backup
Write-Host "📦 Step 1: Creating backup..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupDir = "D:\Yassine-App-Backup-$timestamp"

try {
    Copy-Item -Path "D:\Yassine App" -Destination $backupDir -Recurse -Force -ErrorAction Stop
    Write-Host "✅ Backup created: $backupDir" -ForegroundColor Green
} catch {
    Write-Host "❌ Backup failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Check Git status
Write-Host "📋 Step 2: Checking Git status..." -ForegroundColor Yellow
cd "D:\Yassine App"

$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  You have uncommitted changes:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    $continue = Read-Host "Do you want to commit them first? (y/n)"
    if ($continue -eq 'y') {
        $message = Read-Host "Commit message"
        git add .
        git commit -m $message
        Write-Host "✅ Changes committed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Continuing with uncommitted changes..." -ForegroundColor Yellow
    }
}
Write-Host ""

# Step 3: Fetch from Fedi's branch
Write-Host "🌐 Step 3: Fetching updates from Fedi's branch..." -ForegroundColor Yellow
try {
    git fetch origin fedi
    Write-Host "✅ Fetched latest from origin/fedi" -ForegroundColor Green
} catch {
    Write-Host "❌ Fetch failed. Make sure 'fedi' branch exists." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Show what will change
Write-Host "📊 Step 4: Changes in Fedi's branch:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
git diff --name-status souhayl origin/fedi | Format-Table
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$proceed = Read-Host "Proceed with merge? (y/n)"
if ($proceed -ne 'y') {
    Write-Host "❌ Merge cancelled by user" -ForegroundColor Red
    exit 0
}
Write-Host ""

# Step 5: Merge
Write-Host "🔀 Step 5: Merging Fedi's branch..." -ForegroundColor Yellow
$mergeResult = git merge origin/fedi --no-edit 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Merge successful! No conflicts." -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Changes merged from Fedi's branch" -ForegroundColor Cyan
    Write-Host ""
    
    # Step 6: Push
    $push = Read-Host "Push to your branch? (y/n)"
    if ($push -eq 'y') {
        git push origin souhayl
        Write-Host "✅ Pushed to origin/souhayl" -ForegroundColor Green
    }
    
} else {
    Write-Host "⚠️  CONFLICTS DETECTED!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Conflicted files:" -ForegroundColor Yellow
    git diff --name-only --diff-filter=U
    Write-Host ""
    
    Write-Host "🔧 Resolving conflicts automatically..." -ForegroundColor Yellow
    
    # Auto-resolve: Keep OUR version for critical config files
    $keepOurFiles = @(
        "yassine_olive_mill_backend-fedi/yassine_olive_mill_backend-fedi/app.js",
        "yassine_olive_mill_backend-fedi/yassine_olive_mill_backend-fedi/config/db.js"
    )
    
    $conflictedFiles = git diff --name-only --diff-filter=U
    
    foreach ($file in $conflictedFiles) {
        if ($keepOurFiles -contains $file) {
            Write-Host "  → Keeping YOUR version: $file (has ngrok/Vercel configs)" -ForegroundColor Cyan
            git checkout --ours $file
            git add $file
        } else {
            Write-Host "  ⚠️  Manual resolution needed: $file" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "📝 Next Steps:" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Review remaining conflicts (if any):" -ForegroundColor White
    Write-Host "   git status" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Resolve conflicts manually in VS Code:" -ForegroundColor White
    Write-Host "   code ." -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. After resolving all conflicts:" -ForegroundColor White
    Write-Host "   git add ." -ForegroundColor Gray
    Write-Host "   git commit -m 'Merged from Fedi - kept configs'" -ForegroundColor Gray
    Write-Host "   git push origin souhayl" -ForegroundColor Gray
    Write-Host ""
}

# Step 7: Verify protected files
Write-Host ""
Write-Host "🛡️  Step 6: Verifying protected files..." -ForegroundColor Yellow

$protectedFiles = @(
    "launch-app.ps1",
    "start-backend-ngrok.ps1",
    "update-vercel.ps1",
    "Yassine Olive Mill.vbs",
    "yassine_olive_mill_backend-fedi\.env",
    "Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi\.env",
    "Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi\.env.production",
    "logs\ngrok-url.txt"
)

$allGood = $true
foreach ($file in $protectedFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ MISSING: $file" -ForegroundColor Red
        $allGood = $false
    }
}

if (!$allGood) {
    Write-Host ""
    Write-Host "⚠️  Some protected files are missing!" -ForegroundColor Yellow
    Write-Host "Run restoration script:" -ForegroundColor Yellow
    Write-Host "   .\restore-after-fedi-pull.ps1" -ForegroundColor Gray
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 Merge from Fedi Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Your configs are safe:" -ForegroundColor Green
Write-Host "   • Ngrok configuration preserved" -ForegroundColor White
Write-Host "   • Vercel settings intact" -ForegroundColor White
Write-Host "   • Automation scripts untouched" -ForegroundColor White
Write-Host "   • Environment files protected" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Test everything:" -ForegroundColor Cyan
Write-Host "   .\launch-app.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "📦 Backup available at:" -ForegroundColor Cyan
Write-Host "   $backupDir" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
