# 🚨 EMERGENCY: Pull from Fedi Without Losing Your Work

## ⚠️ CRITICAL: DO THIS BEFORE PULLING FROM FEDI

Fedi's repository will overwrite your automation files! Follow these steps to protect them:

---

## 📦 Step 1: Backup Everything (DO THIS FIRST!)

```powershell
# Create timestamped backup
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupDir = "D:\Yassine-App-Backup-$timestamp"

# Copy entire directory
Copy-Item -Path "D:\Yassine App" -Destination $backupDir -Recurse -Force

Write-Host "✅ Backup created at: $backupDir" -ForegroundColor Green
```

---

## 🔄 Step 2: Pull from Fedi's Repository

```powershell
cd "D:\Yassine App"

# See what branch Fedi is using
git remote -v
git fetch --all

# Pull from Fedi (this will overwrite files)
git pull origin main  # or whatever Fedi's branch name is
```

---

## 🔧 Step 3: Restore Your Automation Files

```powershell
# Navigate to your backup
cd "D:\Yassine-App-Backup-$timestamp"  # Use actual timestamp

# Copy your automation scripts back
$filesToRestore = @(
    "launch-app.ps1",
    "start-backend-ngrok.ps1",
    "update-vercel.ps1",
    "Yassine Olive Mill.vbs",
    "create-desktop-app.ps1",
    "setup-autostart.ps1",
    "uninstall-autostart.ps1",
    "SETUP-EVERYTHING.ps1",
    "logs\ngrok-url.txt",
    ".gitignore"
)

foreach ($file in $filesToRestore) {
    $sourcePath = Join-Path $backupDir $file
    $destPath = Join-Path "D:\Yassine App" $file
    
    if (Test-Path $sourcePath) {
        # Create directory if needed
        $destDir = Split-Path $destPath -Parent
        if (!(Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force
        }
        
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "✅ Restored: $file" -ForegroundColor Green
    }
}
```

---

## 🌍 Step 4: Restore Environment Variables

```powershell
cd "D:\Yassine App"

# Backend .env
$backendEnv = @"
DATABASE_URL=postgresql://postgres:97972002@localhost:5432/yassine-app
"@
$backendEnv | Out-File -FilePath "yassine_olive_mill_backend-fedi\.env" -Encoding UTF8 -Force

# Frontend .env (development)
$frontendEnv = @"
VITE_BASE_BACKEND_API=http://localhost:3000/api
"@
$frontendEnv | Out-File -FilePath "Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi\.env" -Encoding UTF8 -Force

# Frontend .env.production
# Get latest ngrok URL
$ngrokUrl = Get-Content "logs\ngrok-url.txt" -ErrorAction SilentlyContinue
if (!$ngrokUrl) { $ngrokUrl = "YOUR_NGROK_URL_HERE" }

$frontendProdEnv = @"
VITE_BASE_BACKEND_API=$ngrokUrl/api
VITE_APP_NAME=Yassine Olive Mill
VITE_ENV=production
VITE_ENABLE_ANALYTICS=false
VITE_DEBUG_MODE=false
"@
$frontendProdEnv | Out-File -FilePath "Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi\.env.production" -Encoding UTF8 -Force

Write-Host "✅ Environment files restored" -ForegroundColor Green
```

---

## 📱 Step 5: Restore Mobile Optimizations

```powershell
cd "D:\Yassine App"

# Copy back mobile optimization files
$mobileFiles = @(
    "Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi\public\manifest.json",
    "Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi\index.html",
    "Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi\src\index.css",
    "Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi\vite.config.ts"
)

foreach ($file in $mobileFiles) {
    $sourcePath = Join-Path $backupDir $file
    $destPath = Join-Path "D:\Yassine App" $file
    
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "✅ Restored mobile optimization: $file" -ForegroundColor Green
    }
}
```

---

## 🔄 Step 6: Reinstall Dependencies (If Package.json Changed)

```powershell
# Backend
cd "D:\Yassine App\yassine_olive_mill_backend-fedi\yassine_olive_mill_backend-fedi"
npm install

# Frontend
cd "D:\Yassine App\Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi"
npm install
```

---

## 🖥️ Step 7: Recreate Desktop Shortcut

```powershell
cd "D:\Yassine App"
.\create-desktop-app.ps1
```

---

## ✅ Step 8: Test Everything

```powershell
# Test backend + ngrok start
.\start-backend-ngrok.ps1

# Or just double-click desktop icon: "Yassine Olive Mill"
```

---

## 🤝 RECOMMENDED APPROACH: Merge from Fedi While Protecting Your Configs

This is the BEST way - merge Fedi's code updates while keeping all your automation, ngrok, and Vercel configs safe!

### Step-by-Step: Safe Merge from Fedi

```powershell
cd "D:\Yassine App"

# 1. BACKUP FIRST (just in case)
Copy-Item -Path "D:\Yassine App" -Destination "D:\Yassine-App-Backup-$(Get-Date -Format 'yyyy-MM-dd_HHmmss')" -Recurse

# 2. Check current remotes
git remote -v

# 3. Fetch from Fedi's branch (it's already in your repo)
git fetch origin fedi

# 4. See what will change
git diff souhayl origin/fedi

# 5. Merge Fedi's branch into yours
git merge origin/fedi

# 6. If conflicts appear, Git will tell you which files
# Your protected files (.env, automation scripts) won't conflict because they don't exist in Fedi's branch
```

### 🛡️ Files That Are SAFE (Won't Be Overwritten):

These files are in YOUR branch only, NOT in Fedi's branch:
- ✅ All `.env` files (gitignored)
- ✅ All automation scripts (`launch-app.ps1`, `start-backend-ngrok.ps1`, etc.)
- ✅ `Yassine Olive Mill.vbs` (desktop launcher)
- ✅ `logs/ngrok-url.txt` (your ngrok URL)
- ✅ Mobile optimizations (`manifest.json`, updated `index.html`)
- ✅ `CONFIGURATION-BACKUP.md`, `PULL-FROM-FEDI-GUIDE.md`

### ⚠️ Files That MIGHT Conflict:

If Fedi changed these files too, you'll need to choose which version to keep:

**Backend files:**
- `yassine_olive_mill_backend-fedi/yassine_olive_mill_backend-fedi/app.js`
- `yassine_olive_mill_backend-fedi/yassine_olive_mill_backend-fedi/package.json`
- Any controller or model files

**Frontend files:**
- `Yassine-Olive-Mill-Frontend-fedi/Yassine-Olive-Mill-Frontend-fedi/src/**/*.tsx`
- `Yassine-Olive-Mill-Frontend-fedi/Yassine-Olive-Mill-Frontend-fedi/package.json`

### 🔧 Resolving Conflicts (If They Happen):

If Git says there are conflicts:

```powershell
# Git will tell you which files have conflicts
# Example: CONFLICT in yassine_olive_mill_backend-fedi/yassine_olive_mill_backend-fedi/app.js

# Option 1: Keep YOUR version (recommended for app.js with ngrok config)
git checkout --ours yassine_olive_mill_backend-fedi/yassine_olive_mill_backend-fedi/app.js

# Option 2: Keep FEDI's version
git checkout --theirs yassine_olive_mill_backend-fedi/yassine_olive_mill_backend-fedi/app.js

# Option 3: Manually merge both (open file in VS Code, it shows conflicts clearly)
code yassine_olive_mill_backend-fedi/yassine_olive_mill_backend-fedi/app.js

# After resolving all conflicts:
git add .
git commit -m "Merged from Fedi branch - kept ngrok and automation configs"
git push origin souhayl
```

### 🎯 Special Case: app.js Conflicts

If `app.js` has conflicts (likely because of ngrok/CORS config), keep YOUR version:

```powershell
# Keep your app.js with ngrok configuration
git checkout --ours yassine_olive_mill_backend-fedi/yassine_olive_mill_backend-fedi/app.js
git add yassine_olive_mill_backend-fedi/yassine_olive_mill_backend-fedi/app.js
```

Your `app.js` has important configs:
- CORS settings for Vercel domain
- Ngrok header handling
- Production environment detection

### Option B: Cherry-Pick Specific Changes

```powershell
cd "D:\Yassine App"

# Fetch Fedi's changes
git fetch fedi

# See what changed
git log fedi/main --oneline

# Cherry-pick specific commits you want
git cherry-pick <commit-hash>
```

---

## 📋 Quick Restoration Script (All-in-One)

Save this as `restore-after-fedi-pull.ps1`:

```powershell
# Restore After Fedi Pull Script
param(
    [string]$BackupDir = "D:\Yassine-App-Backup-*"
)

# Find latest backup
$latestBackup = Get-ChildItem -Path (Split-Path $BackupDir) -Directory -Filter (Split-Path $BackupDir -Leaf) | Sort-Object Name -Descending | Select-Object -First 1

if (!$latestBackup) {
    Write-Host "❌ No backup found!" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Using backup: $($latestBackup.FullName)" -ForegroundColor Cyan

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
    "logs\ngrok-url.txt",
    "logs\backend.log",
    "logs\ngrok.log",
    "Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi\public\manifest.json",
    "Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi\.env",
    "Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi\.env.production",
    "yassine_olive_mill_backend-fedi\.env"
)

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
    } else {
        Write-Host "⚠️  Not found in backup: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎉 Restoration complete!" -ForegroundColor Green
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Check if everything works: .\launch-app.ps1" -ForegroundColor White
Write-Host "   2. Reinstall dependencies if needed: npm install" -ForegroundColor White
Write-Host "   3. Recreate desktop shortcut: .\create-desktop-app.ps1" -ForegroundColor White
```

---

## 🎯 Summary: Before Pulling from Fedi

1. **Backup first:** `Copy-Item -Path "D:\Yassine App" -Destination "D:\Yassine-App-Backup-$(Get-Date -Format 'yyyy-MM-dd_HHmmss')" -Recurse`
2. **Pull from Fedi:** `git pull origin main`
3. **Restore automation:** Copy back your scripts from backup
4. **Restore .env files:** Recreate environment variables
5. **Restore mobile optimizations:** Copy back manifest.json, index.html, etc.
6. **Test:** Double-click desktop icon

---

**⚠️ IMPORTANT:** Always backup before pulling from Fedi! Your automation scripts are NOT in Fedi's repository.
