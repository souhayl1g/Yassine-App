# Vercel + Local Backend Deployment Guide

## 🎯 Overview
This guide will help you deploy your frontend to Vercel while keeping the backend running locally on your PC. The app will work on phones connected to the same WiFi network with full offline support via PWA.

---

## 📋 Prerequisites

- ✅ Backend running on your PC (Windows)
- ✅ PC and phones on the same WiFi network (192.168.1.x)
- ✅ Vercel account (free tier works)
- ✅ GitHub account
- ✅ Node.js installed on your PC

---

## 🖥️ Your Network Configuration

**PC WiFi IP Address:** `192.168.1.19`  
**Backend Port:** `3000` (default)  
**Full Backend URL:** `http://192.168.1.19:3000/api`

---

## 🚀 Step-by-Step Setup

### 1️⃣ Prepare Backend for LAN Access

#### A. Configure Environment Variables

Create/update `.env` file in your backend folder:

```bash
# Backend: yassine_olive_mill_backend-fedi/.env

PORT=3000
HOST=0.0.0.0

# Allow Vercel and local network origins
ALLOWED_VERCEL_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app
CORS_EXTRA_ORIGINS=http://192.168.1.19:3000,https://localhost:5173,http://localhost:5173

# Your database config
DATABASE_URL=your_database_url_here
JWT_SECRET=your_secret_here
```

**Important:** Replace `your-app.vercel.app` with your actual Vercel URL after deployment.

#### B. Start Backend Server

```powershell
cd yassine_olive_mill_backend-fedi\yassine_olive_mill_backend-fedi
npm start
```

You should see:
```
✅ Database connection established successfully
🚀 Olive Oil Mill API server running on port 3000
🌐 If on LAN, try: http://192.168.1.19:3000
```

#### C. Test Backend from Your Phone

1. Connect your phone to the **same WiFi** as your PC
2. Open browser on phone and visit: `http://192.168.1.19:3000/api/health`
3. You should see: `{"status":"OK","message":"API is running"}`

**If it doesn't work:**
- Check Windows Firewall (see section below)
- Make sure backend is running
- Verify both devices are on same WiFi

---

### 2️⃣ Configure Windows Firewall

Your phone needs to access port 3000. Add a firewall rule:

```powershell
# Run PowerShell as Administrator

# Allow incoming connections on port 3000
New-NetFirewallRule -DisplayName "Olive Mill Backend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# Verify the rule was created
Get-NetFirewallRule -DisplayName "Olive Mill Backend"
```

---

### 3️⃣ Deploy Frontend to Vercel

#### A. Push Frontend to GitHub

```powershell
cd Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi

# Initialize git if not already done
git init
git add .
git commit -m "Deploy PWA to Vercel"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

#### B. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (or the frontend folder path)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

5. **Add Environment Variable:**
   - Key: `VITE_BASE_BACKEND_API`
   - Value: `http://192.168.1.19:3000/api`

6. Click **"Deploy"**

#### C. Get Your Vercel URL

After deployment completes, you'll get a URL like:
- `https://your-app-name.vercel.app`

Copy this URL - you'll need it for the next step.

---

### 4️⃣ Update Backend CORS with Vercel URL

Edit backend `.env` file and update `ALLOWED_VERCEL_ORIGINS`:

```env
ALLOWED_VERCEL_ORIGINS=https://your-actual-app.vercel.app,https://your-actual-app-*.vercel.app
```

**Then restart your backend server.**

---

### 5️⃣ Test the Full Setup

#### On Your Phone:

1. **Connect to WiFi:** Make sure phone is on `192.168.1.x` network
2. **Open Vercel App:** Visit `https://your-app.vercel.app`
3. **Test Login:** Try logging in
4. **Test Offline Mode:**
   - Turn on Airplane Mode
   - App should still work and show "You are offline" banner
   - Make some changes
   - Turn off Airplane Mode
   - Changes sync automatically

#### Expected Behavior:

✅ App loads from Vercel (fast, cached)  
✅ API calls go to `http://192.168.1.19:3000/api`  
✅ Offline mode works with queued changes  
✅ Auto-sync when back online  

---

## 🔧 Troubleshooting

### Problem: Phone can't reach backend

**Solution:**
1. Verify backend is running: `http://192.168.1.19:3000/api/health`
2. Check Windows Firewall rule exists
3. Verify both devices on same WiFi
4. Try pinging PC from phone (use network tools app)

### Problem: CORS errors in browser console

**Solution:**
1. Make sure backend `.env` has correct Vercel URL in `ALLOWED_VERCEL_ORIGINS`
2. Restart backend after changing `.env`
3. Check browser console for the exact origin being blocked

### Problem: Changes not syncing when back online

**Solution:**
1. Open DevTools → Application → Service Workers
2. Click "Unregister" and refresh page
3. Service worker will re-register and sync properly

### Problem: Backend not accessible from other devices

**Solution:**
1. Make sure `HOST=0.0.0.0` in backend `.env`
2. Verify Windows Firewall allows port 3000
3. Check if any antivirus is blocking connections

---

## 📱 Installing PWA on Phone

### Android:
1. Open app in Chrome
2. Tap menu (⋮) → "Add to Home screen"
3. App installs like native app

### iOS:
1. Open app in Safari
2. Tap Share → "Add to Home Screen"
3. App installs to home screen

---

## 🔄 Daily Usage Workflow

### Starting Your Work Day:

1. **Start Backend Server:**
   ```powershell
   cd yassine_olive_mill_backend-fedi\yassine_olive_mill_backend-fedi
   npm start
   ```

2. **Connect Devices:** Make sure all phones/tablets are on WiFi (192.168.1.x)

3. **Open App:** Workers open the PWA from their home screen

4. **Work Offline:** App works even when internet/backend is temporarily down

### Ending Your Work Day:

1. Make sure all devices have synced (check for offline banner)
2. You can stop the backend server
3. PWA remains installed on phones for next day

---

## 🌐 Alternative: Using Tailscale (Optional)

If you want to access the backend from anywhere (not just local WiFi):

1. Install [Tailscale](https://tailscale.com) on your PC and phones
2. Get your Tailscale IP (e.g., `100.x.x.x`)
3. Update `VITE_BASE_BACKEND_API` to use Tailscale IP
4. Access backend from anywhere securely

---

## 📊 Network Architecture

```
┌─────────────────┐
│   Vercel CDN    │  ← Frontend (Static Files)
│ (Global Edge)   │
└────────┬────────┘
         │ HTTPS
         ↓
┌─────────────────┐
│  Phone Browser  │  ← Progressive Web App
│  (192.168.1.x)  │
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐
│   PC Backend    │  ← API Server
│  192.168.1.19   │
│    Port 3000    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   PostgreSQL    │  ← Database
└─────────────────┘
```

---

## 🎉 Benefits of This Setup

✅ **Fast:** Frontend served from Vercel CDN globally  
✅ **Reliable:** Works offline with auto-sync  
✅ **Secure:** Backend stays on local network  
✅ **Cost-effective:** Free Vercel tier + local backend  
✅ **Simple:** No complex server management  
✅ **Scalable:** Add more phones easily  

---

## 📝 Environment Variables Summary

### Backend (.env):
```env
PORT=3000
HOST=0.0.0.0
ALLOWED_VERCEL_ORIGINS=https://your-app.vercel.app
CORS_EXTRA_ORIGINS=http://192.168.1.19:3000
```

### Frontend (Vercel Environment Variables):
```env
VITE_BASE_BACKEND_API=http://192.168.1.19:3000/api
```

---

## 🆘 Need Help?

- **Backend not starting?** Check logs and database connection
- **CORS errors?** Verify `.env` and restart backend
- **Firewall issues?** Run PowerShell commands as Administrator
- **Offline sync not working?** Clear service worker and reload

---

## 🔐 Security Notes

⚠️ **Important:**
- Backend is accessible only on local network (192.168.1.x)
- Don't expose port 3000 to the internet
- Keep JWT_SECRET secure
- Use HTTPS for production (consider reverse proxy)

---

**Last Updated:** October 18, 2025  
**Your PC IP:** 192.168.1.19  
**Backend Port:** 3000
