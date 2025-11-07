# Start backend and ngrok services
$backendPath = Join-Path $PSScriptRoot "yassine_olive_mill_backend-fedi\yassine_olive_mill_backend-fedi"
$shortcutPath = [System.IO.Path]::Combine([System.Environment]::GetFolderPath("Desktop"), "Yassine Mill.lnk")

# Function to check if backend is responding
function Test-Backend {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -TimeoutSec 2
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Function to check if ngrok is running and get URL
function Get-NgrokUrl {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels"
        return $response.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -ExpandProperty public_url
    } catch {
        return $null
    }
}

Write-Host "`n🔍 Checking services before starting app..."

# Check and start backend
if (-not (Test-Backend)) {
    Write-Host "⚡ Starting backend service..."
    Push-Location $backendPath
    Start-Process "cmd.exe" -ArgumentList "/k echo Starting Backend && npm run start" -WindowStyle Normal
    Pop-Location
    
    # Wait for backend to start
    $attempts = 0
    $maxAttempts = 10
    do {
        Start-Sleep -Seconds 2
        $attempts++
        Write-Host "   Waiting for backend to start... (Attempt $attempts/$maxAttempts)"
    } while (-not (Test-Backend) -and $attempts -lt $maxAttempts)

    if (Test-Backend) {
        Write-Host "✅ Backend started successfully!"
    } else {
        Write-Host "❌ Backend failed to start after $maxAttempts attempts"
    }
} else {
    Write-Host "✅ Backend is already running"
}

# Check and start ngrok
$ngrokUrl = Get-NgrokUrl
if (-not $ngrokUrl) {
    Write-Host "🌐 Starting ngrok tunnel..."
    Start-Process "cmd.exe" -ArgumentList "/k echo Starting Ngrok && ngrok http 3000" -WindowStyle Normal
    
    # Wait for ngrok to start
    $attempts = 0
    $maxAttempts = 5
    do {
        Start-Sleep -Seconds 2
        $attempts++
        Write-Host "   Waiting for ngrok tunnel... (Attempt $attempts/$maxAttempts)"
        $ngrokUrl = Get-NgrokUrl
    } while (-not $ngrokUrl -and $attempts -lt $maxAttempts)

    if ($ngrokUrl) {
        Write-Host "✅ Ngrok tunnel established: $ngrokUrl"
    } else {
        Write-Host "❌ Failed to start ngrok tunnel"
    }
} else {
    Write-Host "✅ Ngrok tunnel is already running: $ngrokUrl"
}

Write-Host "`n🚀 Starting Yassine Mill app..."
Start-Process "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--app=https://yassine-app.vercel.app/ --window-size=1280,920"

Write-Host "`n📝 Status Summary:"
Write-Host "- Backend API: http://localhost:3000"
Write-Host "- Ngrok URL: $ngrokUrl"
Write-Host "- App URL: https://yassine-app.vercel.app"
Write-Host "`n❗ Keep these terminal windows open to maintain the services"
Write-Host "❗ Check the terminal windows if you encounter any issues`n"

Write-Host "Press any key to close this window..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')