# Simple Yassine Mill Service Manager
$logPath = Join-Path $PSScriptRoot "logs"
$logFile = Join-Path $logPath "service.log"
$backendPath = Join-Path $PSScriptRoot "yassine_olive_mill_backend-fedi\yassine_olive_mill_backend-fedi"
$shortcutPath = [System.IO.Path]::Combine([System.Environment]::GetFolderPath("Desktop"), "Yassine Mill.lnk")

# Create log directory
if (-not (Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath | Out-Null
}

# Create desktop app shortcut
$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$Shortcut.Arguments = "--app=https://yassine-app.vercel.app/ --window-size=1280,920"
$Shortcut.IconLocation = "C:\Windows\System32\shell32.dll,44"
$Shortcut.Save()

Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - 📱 Created desktop app shortcut"

# Start backend if not running
if (-not (Get-Process "node" -ErrorAction SilentlyContinue)) {
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - 🔄 Starting backend service..."
    Start-Process "cmd.exe" -ArgumentList "/c cd `"$backendPath`" ; npm run start" -WindowStyle Hidden
    Start-Sleep -Seconds 5
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - ✅ Backend service started successfully"
}

# Start ngrok if not running
if (-not (Get-Process "ngrok" -ErrorAction SilentlyContinue)) {
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - 🔄 Starting ngrok service..."
    Start-Process "ngrok" -ArgumentList "http 3000" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - ✅ Ngrok service started successfully"
}

Write-Host "`n✨ All services started!"
Write-Host "🚀 Backend is running on port 3000"
Write-Host "📱 Desktop app shortcut is ready to use"
Write-Host "💡 The app will open in desktop mode when you click the shortcut`n"