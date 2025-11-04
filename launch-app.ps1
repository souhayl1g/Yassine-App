# Yassine Olive Mill - Desktop App Launcher
$FrontendUrl = "https://yassine-olive-mill-app.vercel.app"
$BackendStartScript = "D:\Yassine App\start-backend-ngrok.ps1"
$VercelUpdateScript = "D:\Yassine App\update-vercel.ps1"
$LogPath = "D:\Yassine App\logs"
$NgrokUrlFile = "$LogPath\ngrok-url.txt"

$Host.UI.RawUI.WindowTitle = "Yassine Olive Mill"
Clear-Host

Write-Host ""
Write-Host "    " -ForegroundColor Green
Write-Host "          YASSINE OLIVE MILL          " -ForegroundColor Green
Write-Host "        Management System Launcher        " -ForegroundColor Cyan
Write-Host "    " -ForegroundColor Green
Write-Host ""

function Test-BackendRunning {
    try {
        Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 2 -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Test-NgrokRunning {
    return $null -ne (Get-Process -Name "ngrok" -ErrorAction SilentlyContinue)
}

function Get-NgrokUrl {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction Stop
        if ($response.tunnels -and $response.tunnels.Count -gt 0) {
            $httpsUrl = $response.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1 -ExpandProperty public_url
            return $httpsUrl
        }
    } catch {
        if (Test-Path $NgrokUrlFile) {
            return (Get-Content $NgrokUrlFile -Raw).Trim()
        }
    }
    return $null
}

Write-Host " Checking system status..." -ForegroundColor Yellow
Write-Host ""

$backendRunning = Test-BackendRunning
$ngrokRunning = Test-NgrokRunning

if ($backendRunning -and $ngrokRunning) {
    Write-Host " Backend is running" -ForegroundColor Green
    Write-Host " Ngrok tunnel is active" -ForegroundColor Green
    
    $ngrokUrl = Get-NgrokUrl
    if ($ngrokUrl) {
        Write-Host " Backend URL: $ngrokUrl" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host " Checking deployment..." -ForegroundColor Yellow
    & $VercelUpdateScript -NgrokUrl $ngrokUrl
    
    Write-Host ""
    Write-Host " Everything is ready!" -ForegroundColor Green
    Write-Host " Opening app..." -ForegroundColor Yellow
    Start-Process $FrontendUrl
    Start-Sleep -Seconds 2
    exit 0
} else {
    Write-Host "  Backend is not running" -ForegroundColor Yellow
    Write-Host " Starting backend and ngrok..." -ForegroundColor Yellow
    Write-Host ""
    
    Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$BackendStartScript`"" -WindowStyle Hidden
    
    Write-Host " Waiting for services..." -ForegroundColor Yellow
    
    $attempts = 0
    $maxAttempts = 30
    $ready = $false
    
    while ($attempts -lt $maxAttempts -and -not $ready) {
        Start-Sleep -Seconds 2
        $attempts++
        Write-Host "." -NoNewline -ForegroundColor Gray
        
        if (Test-BackendRunning -and Test-NgrokRunning) {
            $ready = $true
        }
    }
    
    Write-Host ""
    Write-Host ""
    
    if ($ready) {
        Write-Host " Backend started successfully!" -ForegroundColor Green
        $ngrokUrl = Get-NgrokUrl
        if ($ngrokUrl) {
            Write-Host " Backend URL: $ngrokUrl" -ForegroundColor Cyan
        }
        
        Write-Host ""
        Write-Host " Updating deployment..." -ForegroundColor Yellow
        & $VercelUpdateScript -NgrokUrl $ngrokUrl
        
        Write-Host ""
        Write-Host " System is ready!" -ForegroundColor Green
        Write-Host " Opening app..." -ForegroundColor Yellow
        Start-Process $FrontendUrl
        Start-Sleep -Seconds 3
    } else {
        Write-Host " Failed to start backend" -ForegroundColor Red
        Write-Host "Check logs at: $LogPath" -ForegroundColor Cyan
        Read-Host "Press Enter to exit"
        exit 1
    }
}
