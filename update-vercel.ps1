# Auto-Update Vercel with Ngrok URL
# This script automatically updates Vercel environment variable and deploys

param(
    [string]$NgrokUrl = ""
)

$FrontendPath = "D:\Yassine App\Yassine-Olive-Mill-Frontend-fedi\Yassine-Olive-Mill-Frontend-fedi"
$LogPath = "D:\Yassine App\logs"
$LastUrlFile = "$LogPath\last-vercel-url.txt"

# Create logs directory if needed
if (-not (Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
}

# Get ngrok URL if not provided
if ($NgrokUrl -eq "") {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction Stop
        if ($response.tunnels -and $response.tunnels.Count -gt 0) {
            $NgrokUrl = $response.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1 -ExpandProperty public_url
        }
    } catch {
        Write-Host "Error: Could not get ngrok URL" -ForegroundColor Red
        Write-Host "Make sure ngrok is running" -ForegroundColor Yellow
        return $false
    }
}

if ($NgrokUrl -eq "") {
    Write-Host "Error: No ngrok URL available" -ForegroundColor Red
    return $false
}

# Check if URL has changed
$lastUrl = ""
if (Test-Path $LastUrlFile) {
    $lastUrl = (Get-Content $LastUrlFile -Raw).Trim()
}

if ($NgrokUrl -eq $lastUrl) {
    Write-Host "URL unchanged, skipping Vercel update" -ForegroundColor Gray
    return $true
}

Write-Host "Updating Vercel with new URL..." -ForegroundColor Yellow
Write-Host "URL: $NgrokUrl" -ForegroundColor Cyan

# Change to frontend directory
Push-Location $FrontendPath

try {
    # Check if vercel is logged in
    $vercelUser = & vercel whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Not logged in to Vercel" -ForegroundColor Red
        Write-Host "Run: vercel login" -ForegroundColor Yellow
        Pop-Location
        return $false
    }
    
    # Remove old environment variable (suppress errors if it doesn't exist)
    Write-Host "Removing old environment variable..." -ForegroundColor Gray
    & vercel env rm VITE_BASE_BACKEND_API production --yes 2>&1 | Out-Null
    
    # Add new environment variable
    Write-Host "Adding new environment variable..." -ForegroundColor Gray
    $apiUrl = "$NgrokUrl/api"
    $envValue = $apiUrl | & vercel env add VITE_BASE_BACKEND_API production
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to add environment variable" -ForegroundColor Red
        Pop-Location
        return $false
    }
    
    # Deploy to production
    Write-Host "Deploying to Vercel..." -ForegroundColor Yellow
    & vercel --prod --yes 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Vercel updated successfully!" -ForegroundColor Green
        
        # Save the URL
        Set-Content -Path $LastUrlFile -Value $NgrokUrl
        
        Pop-Location
        return $true
    } else {
        Write-Host "Error: Vercel deployment failed" -ForegroundColor Red
        Pop-Location
        return $false
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Pop-Location
    return $false
}
