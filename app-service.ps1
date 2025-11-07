# Yassine Mill Service Manager
$logPath = Join-Path $PSScriptRoot "logs"
$logFile = Join-Path $logPath "service.log"
$backendPath = Join-Path $PSScriptRoot "yassine_olive_mill_backend-fedi\yassine_olive_mill_backend-fedi"
$configPath = Join-Path $PSScriptRoot "backend-ngrok-config.json"
$shortcutPath = [System.IO.Path]::Combine([System.Environment]::GetFolderPath("Desktop"), "Yassine Mill.lnk")
$vbsPath = Join-Path $PSScriptRoot "silent-runner.vbs"

# Create necessary directories and files
if (-not (Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath | Out-Null
}

# Create VBScript for silent execution
@"
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run Chr(34) & WScript.Arguments(0) & Chr(34), 0
Set WshShell = Nothing
"@ | Set-Content $vbsPath

# Function to write to log
function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -Append -FilePath $logFile
    Write-Host "$timestamp - $Message"
}

# Function to get current ngrok URL
function Get-NgrokUrl {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels"
        $url = $response.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -ExpandProperty public_url
        return $url
    } catch {
        return $null
    }
}

# Function to update config with new URL
function Update-Config {
    param($NgrokUrl)
    if ([string]::IsNullOrEmpty($NgrokUrl)) { return }
    
    try {
        $config = Get-Content $configPath | ConvertFrom-Json
        if ($config.ngrokUrl -ne $NgrokUrl) {
            $config.ngrokUrl = $NgrokUrl
            $config | ConvertTo-Json | Set-Content $configPath
            Write-Log "✅ Successfully updated to new ngrok URL: $NgrokUrl"
        }
    } catch {
        Write-Log "❌ Error updating config: $_"
    }
}

# Function to check and start services
function Start-Services {
    # Check and start backend
    if (-not (Get-Process "node" -ErrorAction SilentlyContinue)) {
        Write-Log "🔄 Starting backend service..."
        Start-Process "cmd.exe" -ArgumentList "/c cd `"$backendPath`" && npm run start" -WindowStyle Hidden
        Start-Sleep -Seconds 5
        Write-Log "✅ Backend service started successfully"
    }

    # Check and start ngrok
    if (-not (Get-Process "ngrok" -ErrorAction SilentlyContinue)) {
        Write-Log "🔄 Starting ngrok service..."
        Start-Process "ngrok" -ArgumentList "http 3000" -WindowStyle Hidden
        Start-Sleep -Seconds 3
        Write-Log "✅ Ngrok service started successfully"
    }

    # Monitor and update ngrok URL
    $currentUrl = Get-NgrokUrl
    if ($currentUrl) {
        Update-Config $currentUrl
        Write-Host "`n✨ Services are running successfully!"
        Write-Host "🌐 Current ngrok URL: $currentUrl"
        Write-Host "🚀 Backend is running on port 3000"
        Write-Host "📱 Desktop app shortcut is ready to use`n"
    } else {
        Write-Log "⚠️ Could not get ngrok URL - checking again in 30 seconds..."
    }
}

# Create desktop shortcut that opens in desktop mode
$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$Shortcut.Arguments = "--app=https://yassine-app.vercel.app/ --window-size=1280,920"
$Shortcut.IconLocation = "C:\Windows\System32\shell32.dll,44"
$Shortcut.Save()

Write-Log "📱 Created desktop app shortcut"

# Initial service start
Start-Services

# Start URL monitoring loop
while ($true) {
    Start-Services
    Start-Sleep -Seconds 30
}