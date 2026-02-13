# Master Guide: Deploying Backend to cPanel (Node 18+)

This guide provides a robust, professional workflow for deploying your Node.js backends to cPanel, keeping them synchronized with GitHub.

---

## 1. Important Q&A

### How many projects can I deploy?
- **Answer**: You can deploy multiple projects using **Subdomains** (e.g., `api.portfolio.com`, `api.xtream.com`).
- **Limit**: The limit is usually your hosting plan's **RAM** and **Disk Space**. Each Node.js app consumes roughly 50MB-150MB of RAM. If you have 1GB RAM, 3-4 apps are safe.

### Speed & Efficiency
- **Railway vs. cPanel**: Railway is **faster** because it uses modern container orchestration (Docker) and dedicated CPU slices. cPanel is **shared hosting**, meaning you share resources with other users.
- **Fetching**: Fetching data from the DB is usually faster on cPanel if the DB and App are on the same server (Localhost).
- **Efficiency**: Railway wins on "Developer Experience" (auto-deploy), but cPanel wins on "Cost" (Fixed price, no surprises).

---

## 2. GitHub to cPanel Synchronization (The Best Way)

The most professional way is using **GitHub Actions**. Every time you `git push`, your code automatically updates on cPanel.

### Step 2.1: Create GitHub Action
In your project, create a file: `.github/workflows/deploy.yml`

```yaml
name: Deploy to cPanel
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.CPANEL_HOST }}
          username: ${{ secrets.CPANEL_USER }}
          key: ${{ secrets.CPANEL_SSH_KEY }}
          script: |
            cd /home/your_user/path_to_app
            git pull origin main
            npm install --production
            # Reload the app via cPanel's passenger-config if available
            touch tmp/restart.txt 
```

---

## 3. Step-by-Step Manual Deployment (Starting Slow)

If you have errors, follow this **"Clean Build"** method:

### Step 3.1: Local Preparation
1. **Clean**: Delete `node_modules` and `dist` (if any).
2. **Build**: 
   - For Xtream-UI: `npm run build` (This creates the `dist` folder).
   - For Portfolio: No build needed (uses `src`).
3. **Archive**: Create a `.zip` or `.tar.gz` containing:
   - `package.json`
   - `dist` (for Xtream-UI) or `src` (for Portfolio)
   - `.env` (Make sure it has production values)
   - `prisma/schema.prisma` (for Xtream-UI)

### Step 3.2: cPanel Configuration
1. **Setup Node.js App**:
   - Choose **Node.js version 18 or 20**.
   - **Application Root**: Folder where you uploaded the files (e.g., `api`).
   - **Application URL**: Your subdomain.
   - **Startup File**: 
     - Xtream-UI: `dist/app.js`
     - Portfolio: `src/server.js`
2. **Setup Environment**:
   - Add your `.env` variables manually in the "Environment variables" section if you didn't upload the file.
3. **Run Package Install**:
   - After uploading files, click **"Run JS Install"**.

---

## 4. Solving Common Errors (Common "Too many errors" fix)

1. **"Module Not Found"**: Usually happens because `npm install` didn't run correctly on the server. Try running it via the **cPanel Terminal** instead of the UI button.
2. **Port Error**: Don't use a specific port like `5000` in code. cPanel sets the port automatically. Use `process.env.PORT || 3000`.
3. **Prisma Errors**: 
   - cPanel might lack the binaries. Run `npx prisma generate` inside the **cPanel Terminal**.
4. **Database Connection**: 
   - Use `localhost` as the DB Host if your database is also on the same cPanel account.
