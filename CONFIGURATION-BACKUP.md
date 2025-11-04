# 🔧 Complete Configuration Backup - Yassine Olive Mill App

**Last Updated:** November 4, 2025  
**Repository:** souhayl1g/Yassine-App  
**Branch:** souhayl

---

## 📋 Table of Contents
1. [Critical Files](#critical-files)
2. [Environment Variables](#environment-variables)
3. [Automation Scripts](#automation-scripts)
4. [Ngrok Configuration](#ngrok-configuration)
5. [Vercel Configuration](#vercel-configuration)
6. [Database Configuration](#database-configuration)
7. [Pull & Restore Instructions](#pull--restore-instructions)

---

## 🔐 Critical Files

All these files are tracked in Git and will be restored when you pull:

### Automation Scripts (Root Directory)
- ✅ `launch-app.ps1` - Main desktop launcher
- ✅ `start-backend-ngrok.ps1` - Backend + Ngrok starter (hidden windows)
- ✅ `update-vercel.ps1` - Automatic Vercel deployment
- ✅ `Yassine Olive Mill.vbs` - Silent VBS launcher
- ✅ `create-desktop-app.ps1` - Desktop icon creator
- ✅ `setup-autostart.ps1` - Windows startup automation
- ✅ `uninstall-autostart.ps1` - Remove autostart
- ✅ `SETUP-EVERYTHING.ps1` - Complete setup script

### Configuration Files
- ✅ `manifest.json` - PWA configuration (mobile app)
- ✅ `vite.config.ts` - Frontend build optimization
- ✅ `index.html` - Mobile viewport settings
- ✅ All CSS files with mobile responsive styles

### Backup Directories
- ✅ `config-backups/` - Timestamped configuration backups
- ✅ `backup-temp/` - Temporary config backups
- ✅ `Guides/` - All setup guides and script copies

---

## 🌍 Environment Variables

### Backend (.env) - `yassine_olive_mill_backend-fedi/.env`
```properties
DATABASE_URL=postgresql://postgres:97972002@localhost:5432/yassine-app
```

### Frontend Development (.env)
```properties
VITE_BASE_BACKEND_API=http://localhost:3000/api
```

### Frontend Production (.env.production)
```bash
# Current Ngrok URL (updates automatically via update-vercel.ps1)
VITE_BASE_BACKEND_API=https://preneuralgic-overexuberantly-marjorie.ngrok-free.dev/api

VITE_APP_NAME=Yassine Olive Mill
VITE_ENV=production
VITE_ENABLE_ANALYTICS=false
VITE_DEBUG_MODE=false
```

**⚠️ IMPORTANT:** These `.env` files are in `.gitignore` and will NOT be pushed to GitHub for security. You need to recreate them manually or restore from local backup.

---

## 🤖 Automation Scripts

### 1. Desktop Launcher Flow
```
Desktop Icon → Yassine Olive Mill.vbs → launch-app.ps1 → start-backend-ngrok.ps1
```

All windows run hidden (no terminal popups).

### 2. Backend + Ngrok Starter
**File:** `start-backend-ngrok.ps1`
- Starts Node.js backend on port 3000
- Starts Ngrok tunnel (free tier, changing URLs)
- Saves Ngrok URL to `logs/ngrok-url.txt`
- Logs: `logs/backend.log` and `logs/ngrok.log`
- Process monitoring every 30 seconds

### 3. Vercel Auto-Update
**File:** `update-vercel.ps1`
- Reads Ngrok URL from `logs/ngrok-url.txt`
- Updates `.env.production` with new URL
- Automatically deploys to Vercel
- Runs every time you launch the app

### 4. Launch App
**File:** `launch-app.ps1`
- Checks if backend is running
- Checks if Ngrok is running
- Starts them if needed (hidden)
- Updates Vercel with new Ngrok URL
- Opens browser to https://yassine-olive-mill-app.vercel.app
- Closes itself after 2 seconds

---

## 🌐 Ngrok Configuration

### Current Setup
- **Type:** Free tier (URL changes on restart)
- **Port:** 3000 (backend server)
- **Current URL:** https://preneuralgic-overexuberantly-marjorie.ngrok-free.dev
- **URL Storage:** `D:\Yassine App\logs\ngrok-url.txt`

### To Get Static URL (Optional - Paid Feature)
1. Sign up at https://ngrok.com
2. Get your authtoken
3. Run: `ngrok config add-authtoken YOUR_TOKEN`
4. Reserve a static domain in dashboard
5. Update `start-backend-ngrok.ps1` line ~85:
   ```powershell
   # Replace this:
   $ngrokProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c","ngrok http 3000 > `"$LogsDir\ngrok.log`" 2>&1"
   
   # With this (using your static domain):
   $ngrokProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c","ngrok http 3000 --domain=your-static-domain.ngrok-free.app > `"$LogsDir\ngrok.log`" 2>&1"
   ```

---

## 🚀 Vercel Configuration

### Deployment Info
- **Project:** yassine-olive-mill-app
- **URL:** https://yassine-olive-mill-app.vercel.app
- **Framework:** Vite + React + TypeScript
- **Node Version:** 18.x

### Environment Variables in Vercel Dashboard
Set these in: **Vercel Dashboard → Project Settings → Environment Variables**

```bash
VITE_BASE_BACKEND_API=https://your-ngrok-url.ngrok-free.dev/api
VITE_APP_NAME=Yassine Olive Mill
VITE_ENV=production
```

### Manual Deployment Commands
```bash
cd "D:\Yassine App\Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi"
npm run build
vercel --prod
```

### Automatic Deployment
The `update-vercel.ps1` script automatically deploys when:
1. You run `launch-app.ps1`
2. Ngrok URL changes
3. Manual run: `.\update-vercel.ps1`

---

## 💾 Database Configuration

### PostgreSQL
- **Host:** localhost
- **Port:** 5432
- **Database:** yassine-app
- **User:** postgres
- **Password:** 97972002

### Connection String
```
postgresql://postgres:97972002@localhost:5432/yassine-app
```

### Backup Database (Recommended)
```bash
# Backup
pg_dump -U postgres -d yassine-app -F c -b -v -f "D:\Yassine App\db-backup-$(Get-Date -Format 'yyyy-MM-dd').backup"

# Restore
pg_restore -U postgres -d yassine-app -v "D:\Yassine App\db-backup-2025-11-04.backup"
```

---

## 📥 Pull & Restore Instructions

### When Pulling from Another Machine:

#### 1. Clone Repository
```bash
cd D:\
git clone https://github.com/souhayl1g/Yassine-App.git "Yassine App"
cd "Yassine App"
git checkout souhayl
```

#### 2. Restore Environment Variables
Create these files manually (they're not in Git):

**Backend .env:**
```bash
# File: yassine_olive_mill_backend-fedi/.env
DATABASE_URL=postgresql://postgres:97972002@localhost:5432/yassine-app
```

**Frontend .env:**
```bash
# File: Yassine-Olive-Mill-Frontend-fedi/Yassine-Olive-Mill-Frontend-fedi/.env
VITE_BASE_BACKEND_API=http://localhost:3000/api
```

**Frontend .env.production:**
```bash
# File: Yassine-Olive-Mill-Frontend-fedi/Yassine-Olive-Mill-Frontend-fedi/.env.production
VITE_BASE_BACKEND_API=https://your-ngrok-url.ngrok-free.dev/api
VITE_APP_NAME=Yassine Olive Mill
VITE_ENV=production
```

#### 3. Install Dependencies
```bash
# Backend
cd "yassine_olive_mill_backend-fedi\yassine_olive_mill_backend-fedi"
npm install

# Frontend
cd "..\..\Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi"
npm install
```

#### 4. Setup PostgreSQL
1. Install PostgreSQL 14+
2. Create database: `yassine-app`
3. Run migrations:
```bash
cd "D:\Yassine App\yassine_olive_mill_backend-fedi\yassine_olive_mill_backend-fedi"
npx sequelize-cli db:migrate
```

#### 5. Install Ngrok
```bash
# Download from: https://ngrok.com/download
# Extract to: C:\ngrok\ngrok.exe
# Add to PATH or place in system32
```

#### 6. Install Vercel CLI
```bash
npm install -g vercel
vercel login
```

#### 7. Create Desktop Shortcut
```powershell
cd "D:\Yassine App"
.\create-desktop-app.ps1
```

#### 8. Test Everything
```powershell
# Double-click desktop icon: "Yassine Olive Mill"
# Should open browser with no terminal windows
```

---

## 🔄 Updating After Pull

After pulling latest changes:

```bash
cd "D:\Yassine App"
git pull origin souhayl

# If automation scripts changed, recreate desktop icon
.\create-desktop-app.ps1

# If dependencies changed
cd "yassine_olive_mill_backend-fedi\yassine_olive_mill_backend-fedi"
npm install

cd "..\..\Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi"
npm install
```

---

## 📱 Mobile Optimization (Latest Updates)

### What's Included:
- ✅ PWA manifest for iOS/Android home screen install
- ✅ Touch-friendly buttons (min 48px)
- ✅ Optimized input fields (16px font prevents iOS zoom)
- ✅ Responsive layouts for all screen sizes
- ✅ Safe area insets for notched devices
- ✅ Code splitting for faster mobile loading
- ✅ RTL support for Arabic
- ✅ Smooth scrolling and animations
- ✅ No lag, optimized performance

### Test on Mobile:
1. Open: https://yassine-olive-mill-app.vercel.app
2. iOS: Share → Add to Home Screen
3. Android: Menu → Install App

---

## 🆘 Emergency Restore

If something breaks:

### 1. Restore from Config Backup
```bash
cd "D:\Yassine App\config-backups"
# Find latest backup folder
# Copy files from backup to root directory
```

### 2. Restore from Guides Folder
```bash
cd "D:\Yassine App\Guides"
# All scripts have backup copies here
```

### 3. Reset Everything
```powershell
cd "D:\Yassine App"
.\SETUP-EVERYTHING.ps1
```

---

## 📞 Quick Reference

| Component | Status Check | Logs Location |
|-----------|-------------|---------------|
| Backend | http://localhost:3000/api | `logs/backend.log` |
| Ngrok | `logs/ngrok-url.txt` | `logs/ngrok.log` |
| Frontend | http://localhost:5173 | Browser console |
| Production | https://yassine-olive-mill-app.vercel.app | Vercel dashboard |

---

## ✅ Checklist After Pull

- [ ] Git pull completed
- [ ] `.env` files recreated
- [ ] npm install (backend)
- [ ] npm install (frontend)
- [ ] PostgreSQL running
- [ ] Database migrations run
- [ ] Ngrok installed
- [ ] Vercel CLI logged in
- [ ] Desktop icon created
- [ ] Test launch app
- [ ] Verify no errors

---

**🎉 You're all set! All your configurations are safe and will work after git pull.**
