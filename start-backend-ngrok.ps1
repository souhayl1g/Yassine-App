# Start-backend-ngrok.ps1 (sanitized ASCII-only version)

param(
    [string]$NgrokAuthToken = "",
    [switch]$Install
)

Write-Host "================================"
Write-Host "Yassine Olive Mill - Backend + Ngrok Starter"
Write-Host "================================"

# Paths
$BackendPath = 'D:\Yassine App\yassine_olive_mill_backend-fedi\yassine_olive_mill_backend-fedi'
$LogPath = 'D:\Yassine App\logs'
$NgrokLogFile = Join-Path $LogPath 'ngrok.log'
$BackendLogFile = Join-Path $LogPath 'backend.log'
$NgrokUrlFile = Join-Path $LogPath 'ngrok-url.txt'

if (-not (Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
    Write-Host "Created logs directory: $LogPath"
}

if ($Install) {
    Write-Host "Installation mode"
    if ($NgrokAuthToken -eq "") {
        Write-Host "No authtoken provided. Run with -Install -NgrokAuthToken 'TOKEN'"
        exit 1
    }
    & ngrok config add-authtoken $NgrokAuthToken
    if ($LASTEXITCODE -ne 0) { Write-Host "Failed to configure ngrok authtoken"; exit 1 }
    Write-Host "Ngrok authtoken configured"
    exit 0
}

function Test-ProcessRunning { param([string]$ProcessName) (Get-Process -Name $ProcessName -ErrorAction SilentlyContinue) -ne $null }

function Get-NgrokUrl {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -ErrorAction Stop
        if ($response.tunnels -and $response.tunnels.Count -gt 0) {
            $httpsUrl = $response.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1 -ExpandProperty public_url
            return $httpsUrl
        }
    } catch { return $null }
    return $null
}

function Update-BackendEnv { param([string]$NgrokUrl)
    $envPath = Join-Path $BackendPath '.env'
    if (-not (Test-Path $envPath)) { return }
    $envContent = Get-Content $envPath -Raw
    if ($envContent -match 'CORS_ORIGINS=([^\r\n]*)') {
        $current = $Matches[1]
        $origins = $current -split ',' | Where-Object { $_ -notmatch '\.ngrok-free\.app' -and $_ -notmatch '\.ngrok\.io' }
        $origins += $NgrokUrl
        $new = ($origins | Where-Object { $_ } | Select-Object -Unique) -join ','
        $envContent = $envContent -replace 'CORS_ORIGINS=[^\r\n]*', "CORS_ORIGINS=$new"
    }
    $envContent = $envContent -replace 'NGROK_URL=[^\r\n]*', "NGROK_URL=$NgrokUrl"
    $envContent = $envContent -replace 'API_URL=[^\r\n]*', "API_URL=$NgrokUrl"
    Set-Content -Path $envPath -Value $envContent -NoNewline
}

Write-Host "Checking for existing processes..."
if (Test-ProcessRunning 'node') {
    Write-Host 'Stopping existing node processes...'
    Get-Process -Name node -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
}
if (Test-ProcessRunning 'ngrok') { Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue }

Write-Host "Starting backend in background..."
Set-Location $BackendPath
$backendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c","npm start > `"$BackendLogFile`" 2>&1" -WorkingDirectory $BackendPath -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 5

try {
    Invoke-WebRequest -Uri 'http://localhost:3000' -Method GET -TimeoutSec 5 -ErrorAction Stop | Out-Null
    Write-Host 'Backend is responding'
} catch { Write-Host 'Backend not ready yet' }

Write-Host 'Starting ngrok in background...'
$ngrokProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c","ngrok http 3000 --log=stdout > `"$NgrokLogFile`" 2>&1" -WindowStyle Hidden -PassThru

$ngrokUrl = $null; $attempt = 0
while ($attempt -lt 10 -and -not $ngrokUrl) { $ngrokUrl = Get-NgrokUrl; if (-not $ngrokUrl) { Start-Sleep -Seconds 2; $attempt++ } }

if ($ngrokUrl) {
    Write-Host "Ngrok URL: $ngrokUrl"
    Set-Content -Path $NgrokUrlFile -Value $ngrokUrl
    Update-BackendEnv -NgrokUrl $ngrokUrl
} else {
    Write-Host 'Failed to get ngrok URL'; exit 1
}

Write-Host 'Backend and ngrok started in background.'
Write-Host 'Monitoring processes. Press Ctrl+C to stop.'
try {
    while ($true) {
        Start-Sleep -Seconds 10
        $bk = -not $backendProcess.HasExited
        $ng = -not $ngrokProcess.HasExited
        if (-not $bk -or -not $ng) { 
            Write-Host 'Process stopped unexpectedly'
            break 
        }
    }
} catch {
    Write-Host 'Stopping processes...'
} finally {
    if ($backendProcess -and -not $backendProcess.HasExited) { Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue }
    if ($ngrokProcess -and -not $ngrokProcess.HasExited) { Stop-Process -Id $ngrokProcess.Id -Force -ErrorAction SilentlyContinue }
    Write-Host 'All processes stopped'
}
