# Configure Windows Firewall for Backend Access

Write-Host "🔥 Configuring Windows Firewall..." -ForegroundColor Cyan
Write-Host ""

$existingRule = Get-NetFirewallRule -DisplayName "Olive Mill Backend - Port 3000" -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "✅ Firewall rule already exists!" -ForegroundColor Green
    Write-Host ""
    Get-NetFirewallRule -DisplayName "Olive Mill Backend - Port 3000" | Format-List Name,DisplayName,Enabled,Direction,Action
} else {
    Write-Host "Creating new firewall rule..." -ForegroundColor Yellow
    
    try {
        New-NetFirewallRule `
            -DisplayName "Olive Mill Backend - Port 3000" `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort 3000 `
            -Action Allow `
            -Profile Any `
            -Description "Allows access to Olive Mill backend API on port 3000"
        
        Write-Host ""
        Write-Host "✅ Firewall rule created successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📱 Phones can now access: http://192.168.1.19:3000" -ForegroundColor Cyan
    }
    catch {
        Write-Host ""
        Write-Host "❌ Error! Run PowerShell as Administrator" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Next: Start your backend on port 3000" -ForegroundColor Cyan
Write-Host ""
