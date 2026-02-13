# Release Guide: Smartifly Xtream-UI

This guide covers the release process for the **Smartifly Xtream-UI** system, including the Backend, Admin Panel, Customer Portal, and the Mobile/TV App.

## 1. Backend Release (cPanel)
The backend uses Prisma and Express.

### Step 1.1: Automated Preparation
1. Open PowerShell and navigate to `backend`.
2. Run the deployment script:
   ```powershell
   ./deploy-backend.ps1
   ```
   *This script compiles TS, prepares the `dist` folder, and creates `backend-deploy.tar.gz`.*

### Step 1.2: cPanel Deployment
1. Upload `backend-deploy.tar.gz` to your cPanel and extract.
2. Run Prisma Migrations (if DB schema changed):
   ```bash
   npx prisma migrate deploy
   ```
3. Restart the Node.js application in cPanel.

---

## 2. Admin Panel & Customer Portal (Next.js)
Both are Next.js applications designed for web access.

### Step 2.1: Build & Deploy
1. Update `.env.production` with the live API URL.
2. Build locally:
   ```bash
   npm run build
   ```
3. Deploy to your hosting provider (Vercel/Netlify or cPanel).
   - If using cPanel, upload the `.next`, `public`, and `package.json` files.

---

## 3. Mobile / TV App Release (Android)
The app is built with React Native.

### Step 3.1: Generate Release APK
1. Navigate to the `SmartiflyApp` directory.
2. Update the backend URL in your config/environment file within `src/`.
3. Build the Android release:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
4. Find the output APK at: `android/app/build/outputs/apk/release/app-release.apk`.

### Step 3.2: Distribution
- Upload the APK to the **Enterprise Mobile Distribution Suite** (part of the Portfolio Backend) to allow users to download the update.

---

## 4. Environment Checklist
Ensure these variables are set in production for all services:
- `DATABASE_URL`: Connection string.
- `JWT_SECRET`: Secure random string.
- `REDIS_URL`: If caching is enabled.
- `NEXT_PUBLIC_API_BASE_URL`: For frontend-backend communication.
