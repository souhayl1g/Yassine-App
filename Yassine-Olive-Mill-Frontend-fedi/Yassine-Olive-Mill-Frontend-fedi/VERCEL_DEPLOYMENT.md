# Vercel Deployment Guide - Yassine Olive Mill Frontend

## 🚀 Quick Setup

### Step 1: Create New Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Click **"Add New Project"**
3. Import your GitHub repository: `souhayl1g/Yassine-App`
4. Configure the project settings:

### Step 2: Project Configuration

#### **Root Directory**
```
Yassine-Olive-Mill-Frontend-fedi/Yassine-Olive-Mill-Frontend-fedi
```

#### **Framework Preset**
- Select: **Vite**

#### **Build & Development Settings**
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
- **Development Command:** `npm run dev`

#### **Node.js Version**
- **Version:** 20.x

### Step 3: Environment Variables

Add the following environment variable in Vercel Dashboard:

| Key | Value | Description |
|-----|-------|-------------|
| `BACKEND_BASE_URL` | `https://your-backend-url.com` | Your backend API URL (e.g., ngrok, Railway, etc.) |
| `NODE_ENV` | `production` | Node environment |

**To add environment variables:**
1. Go to your project in Vercel Dashboard
2. Click on **Settings** → **Environment Variables**
3. Add each variable above
4. Click **Save**

### Step 4: Deploy

After configuration, click **Deploy**. Vercel will:
1. Clone your repository
2. Install dependencies
3. Build the project
4. Deploy serverless functions
5. Provide you with a production URL

---

## 📁 Project Structure

```
Yassine-Olive-Mill-Frontend-fedi/
├── api/
│   └── [...path].ts          # Serverless function for API proxying
├── src/                       # React application source
├── dist/                      # Build output (generated)
├── public/                    # Static assets
├── package.json              # Dependencies & scripts
├── vite.config.ts            # Vite configuration
├── vercel.json               # Vercel deployment config
└── VERCEL_DEPLOYMENT.md      # This file
```

---

## 🔧 Configuration Files

### `vercel.json` (Already configured)

The `vercel.json` file is already set up with:
- ✅ Vite framework detection
- ✅ API routes proxying
- ✅ Serverless function configuration
- ✅ Build command optimization
- ✅ Node.js 20.x runtime

### `package.json` Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

---

## 🌐 Domains

### Default Domain
Vercel provides: `your-project-name.vercel.app`

### Custom Domain
1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

---

## 🔄 Continuous Deployment

### Automatic Deployments

Vercel automatically deploys when you push to GitHub:

- **Production:** `main` or `master` branch → Production URL
- **Preview:** Other branches (e.g., `dev`) → Preview URLs

### Branch Configuration
1. Go to **Settings** → **Git**
2. Set **Production Branch:** `main` (or your preferred branch)
3. Enable **Preview Deployments** for all branches

---

## 🐛 Troubleshooting

### Build Fails

**Issue:** "Could not read package.json"
- **Solution:** Ensure **Root Directory** is set to `Yassine-Olive-Mill-Frontend-fedi/Yassine-Olive-Mill-Frontend-fedi`

**Issue:** "npm ERR! code ENOENT"
- **Solution:** Verify the root directory path in Vercel settings

### API Routes Not Working

**Issue:** 500 error on `/api/*` routes
- **Solution:** Check that `BACKEND_BASE_URL` environment variable is set

**Issue:** CORS errors
- **Solution:** Ensure your backend allows requests from your Vercel domain

### Environment Variables Not Loading

- **Solution:** Redeploy after adding environment variables
- Go to **Deployments** → Click **...** → **Redeploy**

---

## 📊 Monitoring & Logs

### View Deployment Logs
1. Go to **Deployments**
2. Click on any deployment
3. View **Build Logs** and **Function Logs**

### Runtime Logs
- Click on **Functions** tab in deployment details
- View real-time logs for serverless functions

---

## 🔐 Security Best Practices

1. ✅ Never commit `.env` files to Git
2. ✅ Use Vercel Environment Variables for secrets
3. ✅ Set different variables for **Production**, **Preview**, and **Development**
4. ✅ Regularly update dependencies: `npm audit fix`
5. ✅ Use HTTPS for backend URL

---

## 📝 Deployment Checklist

Before deploying, ensure:

- [ ] `BACKEND_BASE_URL` is set in Vercel environment variables
- [ ] Root directory is correctly configured
- [ ] All dependencies are listed in `package.json`
- [ ] Build command works locally (`npm run build`)
- [ ] Backend API is accessible and allows CORS
- [ ] Environment-specific configs are set

---

## 🚀 Quick Deploy Commands

```bash
# Commit your changes
git add .
git commit -m "Configure Vercel deployment"

# Push to trigger deployment
git push origin dev  # or your branch name
```

Vercel will automatically deploy when you push!

---

## 📞 Support

- **Vercel Docs:** https://vercel.com/docs
- **Vite Docs:** https://vitejs.dev/guide/
- **Project Issues:** Open an issue in your GitHub repository

---

## 🎯 Next Steps

1. Push this configuration to GitHub
2. Create new Vercel project with settings above
3. Add `BACKEND_BASE_URL` environment variable
4. Deploy and test!

Good luck! 🍀
