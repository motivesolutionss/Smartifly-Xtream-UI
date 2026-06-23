Param(
    [int]$DurationMinutes = 30,
    [string]$OutputDir = ".\build\soak",
    [int]$MaxGcBlocksOver100Ms = 40,
    [int]$MaxGcBlocksOver150Ms = 10,
    [int]$MaxInputDispatchSlowEvents = 0,
    [switch]$RequireDownshiftSignal
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

function Extract-GcMs {
    param([string]$Line)
    $match = [regex]::Match($Line, "blocked .* for (?<ms>\d+(\.\d+)?)ms")
    if ($match.Success) {
        return [double]$match.Groups["ms"].Value
    }
    return $null
}

Ensure-Command -Name "adb"

if ($DurationMinutes -le 0) {
    throw "DurationMinutes must be > 0"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resolvedOutputDir = (Resolve-Path $OutputDir).Path
$logPath = Join-Path $resolvedOutputDir "soak-$stamp.log"
$summaryPath = Join-Path $resolvedOutputDir "soak-$stamp-summary.txt"
$stderrPath = Join-Path $resolvedOutputDir "soak-$stamp-stderr.log"

Write-Host "=== SmartiflyTV Soak Gate ===" -ForegroundColor Cyan
Write-Host "Duration: $DurationMinutes minute(s)"
Write-Host "Log file: $logPath"
Write-Host ""

adb start-server | Out-Null
$adbState = (& adb get-state 2>$null)
if ($adbState -notmatch "device") {
    throw "No connected adb device. Connect emulator/TV device and retry."
}

Write-Host "Clearing logcat buffer..."
adb logcat -c

Write-Host "Starting log capture. Use the app normally (Home/Live/Movies/Series navigation stress)."
$capture = Start-Process `
    -FilePath "adb" `
    -ArgumentList @("logcat", "-v", "time") `
    -NoNewWindow `
    -PassThru `
    -RedirectStandardOutput $logPath `
    -RedirectStandardError $stderrPath

$captureStartedAt = Get-Date
$captureExitedEarly = $false
$captureExitCode = $null

try {
    $deadline = (Get-Date).AddMinutes($DurationMinutes)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 5
        if ($capture.HasExited) {
            $captureExitedEarly = $true
            $captureExitCode = $capture.ExitCode
            break
        }
    }
} finally {
    if (-not $capture.HasExited) {
        Stop-Process -Id $capture.Id -Force
    }
}

if (Test-Path $stderrPath) {
    $stderrContent = @(Get-Content $stderrPath -ErrorAction SilentlyContinue)
    if ($stderrContent.Count -gt 0) {
        Write-Host "logcat stderr output saved to: $stderrPath" -ForegroundColor DarkYellow
    } else {
        Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Capture complete. Analyzing..." -ForegroundColor Yellow

$captureElapsedSeconds = [int]((Get-Date) - $captureStartedAt).TotalSeconds
$expectedSeconds = [int]($DurationMinutes * 60)

$lines = @()
if (Test-Path $logPath) {
    $lines = @(Get-Content $logPath)
}

$anrCount = @($lines | Select-String -Pattern "ANR in |Input dispatching timed out").Count
$inputSlowCount = @($lines | Select-String -Pattern "spent \d+ms processing (KeyEvent|MotionEvent)|Window .* is unresponsive").Count

$gcValues = @()
foreach ($line in $lines) {
    if ($line -match "WaitForGcToComplete blocked") {
        $ms = Extract-GcMs -Line $line
        if ($null -ne $ms) { $gcValues += $ms }
    }
}

$gcOver100 = @($gcValues | Where-Object { $_ -ge 100 }).Count
$gcOver150 = @($gcValues | Where-Object { $_ -ge 150 }).Count
$downshiftCount = @($lines | Select-String -Pattern "runtime_downshift level=|downshift_level=").Count

$failedChecks = @()
if ($anrCount -gt 0) { $failedChecks += "ANR events: $anrCount (must be 0)" }
if ($inputSlowCount -gt $MaxInputDispatchSlowEvents) { $failedChecks += "Input slow/unresponsive events: $inputSlowCount (max $MaxInputDispatchSlowEvents)" }
if ($gcOver100 -gt $MaxGcBlocksOver100Ms) { $failedChecks += "GC blocks >=100ms: $gcOver100 (max $MaxGcBlocksOver100Ms)" }
if ($gcOver150 -gt $MaxGcBlocksOver150Ms) { $failedChecks += "GC blocks >=150ms: $gcOver150 (max $MaxGcBlocksOver150Ms)" }
if ($RequireDownshiftSignal -and $downshiftCount -le 0) { $failedChecks += "No downshift telemetry observed (required by flag)." }
if (-not (Test-Path $logPath) -or $lines.Count -eq 0) { $failedChecks += "No log lines captured." }
if ($captureExitedEarly) { $failedChecks += "adb logcat exited early (exit code: $captureExitCode)." }
if ($captureElapsedSeconds -lt ($expectedSeconds - 10)) {
    $failedChecks += "Capture duration too short: ${captureElapsedSeconds}s captured vs expected ${expectedSeconds}s."
}

$status = if ($failedChecks.Count -eq 0) { "PASS" } else { "FAIL" }

$summary = @(
    "SmartiflyTV Soak Gate Summary",
    "Timestamp: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")",
    "DurationMinutes: $DurationMinutes",
    "CaptureElapsedSeconds: $captureElapsedSeconds",
    "CaptureExitedEarly: $captureExitedEarly",
    "CaptureExitCode: $captureExitCode",
    "Status: $status",
    "",
    "Metrics:",
    "- ANR events: $anrCount",
    "- Input slow/unresponsive events: $inputSlowCount",
    "- GC blocks >=100ms: $gcOver100",
    "- GC blocks >=150ms: $gcOver150",
    "- Downshift telemetry hits: $downshiftCount",
    "",
    "Thresholds:",
    "- MaxInputDispatchSlowEvents: $MaxInputDispatchSlowEvents",
    "- MaxGcBlocksOver100Ms: $MaxGcBlocksOver100Ms",
    "- MaxGcBlocksOver150Ms: $MaxGcBlocksOver150Ms",
    "- RequireDownshiftSignal: $RequireDownshiftSignal",
    ""
)

if ($failedChecks.Count -gt 0) {
    $summary += "Failed checks:"
    foreach ($item in $failedChecks) {
        $summary += "- $item"
    }
}

$summary | Set-Content -Path $summaryPath
$summary | ForEach-Object { Write-Host $_ }

if ($status -eq "PASS") {
    Write-Host ""
    Write-Host "Soak gate PASSED." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "Soak gate FAILED." -ForegroundColor Red
exit 1
