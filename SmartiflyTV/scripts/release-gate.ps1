Param(
    [switch]$SkipLint,
    [switch]$SkipTests
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Step {
    param([string]$Name, [scriptblock]$Action)
    Write-Host ""
    Write-Host "=== $Name ===" -ForegroundColor Cyan
    & $Action
}

function Run-GradleStep {
    param(
        [string]$Name,
        [string]$Command
    )
    Write-Host "Running: $Command"
    & cmd /c $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE"
    }
    Write-Host "$Name passed." -ForegroundColor Green
}

Write-Host "SmartiflyTV Release Gate Runner" -ForegroundColor Yellow
Write-Host "Workspace: $(Get-Location)"

Step "Stop Gradle Daemons" {
    & .\gradlew.bat --stop
}

Step "Compile Gate" {
    Run-GradleStep -Name "Kotlin Compile" -Command ".\gradlew.bat :app:compileDebugKotlin --console=plain"
}

if (-not $SkipTests) {
    Step "Unit Test Gate" {
        Run-GradleStep -Name "Unit Tests" -Command ".\gradlew.bat :app:testDebugUnitTest --console=plain"
    }
} else {
    Write-Host "Unit tests skipped by flag." -ForegroundColor DarkYellow
}

if (-not $SkipLint) {
    Step "Lint Gate" {
        Run-GradleStep -Name "Lint Debug" -Command ".\gradlew.bat :app:lintDebug --console=plain"
    }
} else {
    Write-Host "Lint skipped by flag." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "All selected release gates passed." -ForegroundColor Green
Write-Host "Next: run manual QA checklist in docs/release-gate-checklist.md"

