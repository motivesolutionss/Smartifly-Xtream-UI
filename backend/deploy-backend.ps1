# Deploy Backend Script
# This script prepares the backend for cPanel deployment

Write-Host "Starting Backend Deployment Preparation..." -ForegroundColor Cyan

# 1. Clean previous builds
Write-Host "Cleaning previous build and archives..."
If (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }
If (Test-Path "backend-deploy.tar.gz") { Remove-Item "backend-deploy.tar.gz" -Force }
If (Test-Path "backend-deploy.zip") { Remove-Item "backend-deploy.zip" -Force }

# 2. Build TypeScript
Write-Host "Compiling TypeScript (npm run build)..."
cmd /c "npm run build"

If (-not (Test-Path "dist")) {
    Write-Error "Build failed! 'dist' folder was not created."
    Exit 1
}

# 3. Create Deployment Archive (tar.gz)
Write-Host "Creating 'backend-deploy.tar.gz'..."

# Use native tar command (available on Windows 10/11)
# We exclude node_modules explicitly just in case, though we are passing specific folders
tar -czf backend-deploy.tar.gz dist package.json prisma .env.example

If (Test-Path "backend-deploy.tar.gz") {
    Write-Host "Deployment archive created: backend-deploy.tar.gz" -ForegroundColor Green
    Write-Host "Upload this file to your cPanel File Manager."
} Else {
    Write-Error "Failed to create tar.gz archive."
}
