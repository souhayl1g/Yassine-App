# Start backend and ngrok services
$backendPath = Join-Path $PSScriptRoot "yassine_olive_mill_backend-fedi\yassine_olive_mill_backend-fedi"
$shortcutPath = [System.IO.Path]::Combine([System.Environment]::GetFolderPath("Desktop"), "Yassine Mill.lnk")

# Global variables to track spawned processes
$script:backendProcess = $null
$script:ngrokProcess = $null
$script:edgeProcess = $null

# Cleanup function to terminate all spawned processes
function Cleanup-Processes {
    Write-Host "Cleaning up processes..."
    
    if ($script:backendProcess -and !$script:backendProcess.HasExited) {
        try {
            $script:backendProcess.Kill()
            Write-Host "Backend process terminated"
        } catch {
            Write-Host "Could not terminate backend process: $($_.Exception.Message)"
        }
    }
    
    if ($script:ngrokProcess -and !$script:ngrokProcess.HasExited) {
        try {
            $script:ngrokProcess.Kill()
            Write-Host "Ngrok process terminated"
        } catch {
            Write-Host "Could not terminate ngrok process: $($_.Exception.Message)"
        }
    }
}

# Register cleanup on exit
Register-EngineEvent PowerShell.Exiting -Action { Cleanup-Processes }

# Enhanced function to check if backend is responding with detailed health check
function Test-Backend {
    param(
        [int]$TimeoutSec = 5
    )
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -TimeoutSec $TimeoutSec
        if ($response.StatusCode -eq 200) {
            # Additional check: ensure the response contains expected content
            if ($response.Content -and $response.Content.Length -gt 0) {
                Start-Sleep -Milliseconds 500  # Brief pause to ensure full initialization
                return $true
            }
        }
        return $false
    } catch [System.Net.WebException] {
        Write-Verbose "Backend health check failed: Connection refused or timeout"
        return $false
    } catch {
        Write-Verbose "Backend health check failed: $($_.Exception.Message)"
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

# Function to check if ngrok endpoint is already in use
function Test-NgrokEndpointInUse {
    try {
        $process = Start-Process "ngrok" -ArgumentList "http", "3000", "--log", "stdout" -WindowStyle Hidden -PassThru -RedirectStandardOutput "ngrok_temp.log"
        Start-Sleep 3
        if (!$process.HasExited) {
            $process.Kill()
        }
        if (Test-Path "ngrok_temp.log") {
            $logContent = Get-Content "ngrok_temp.log" -Raw
            Remove-Item "ngrok_temp.log" -Force
            return $logContent -like "*ERR_NGROK_334*" -or $logContent -like "*endpoint is already online*"
        }
        return $false
    } catch {
        return $false
    }
}

Write-Host "Checking services before starting app..."

# Check and start backend (hidden)
if (-not (Test-Backend)) {
    Write-Host "Starting backend service (hidden)..."
    try {
        Push-Location $backendPath
        # Start backend in hidden window
        $script:backendProcess = Start-Process "cmd.exe" -ArgumentList "/c", "npm run start" -WindowStyle Hidden -PassThru
        Pop-Location
        
        # Wait for backend to start with adaptive timeout
        $attempts = 0
        $maxAttempts = 30
        $backoffSeconds = 1
        do {
            Start-Sleep -Seconds $backoffSeconds
            $attempts++
            Write-Host "   Waiting for backend to start... (Attempt $attempts/$maxAttempts)"
            
            # Exponential backoff up to 3 seconds
            if ($attempts % 5 -eq 0 -and $backoffSeconds -lt 3) {
                $backoffSeconds++
            }
        } while (-not (Test-Backend -TimeoutSec 10) -and $attempts -lt $maxAttempts)

        if (Test-Backend) {
            Write-Host "Backend started successfully!"
        } else {
            Write-Host "Backend failed to start after $maxAttempts attempts"
            Write-Host "   Check if Node.js and dependencies are properly installed"
            if ($script:backendProcess -and !$script:backendProcess.HasExited) {
                Write-Host "   Backend process is running in background (PID: $($script:backendProcess.Id))"
            }
        }
    } catch {
        Write-Host "Failed to start backend process: $($_.Exception.Message)"
        Write-Host "   Ensure npm is installed and the backend directory exists"
    }
} else {
    Write-Host "Backend is already running"
}

# Check and handle ngrok
$ngrokUrl = Get-NgrokUrl
if (-not $ngrokUrl) {
    Write-Host "Starting ngrok tunnel (hidden)..."
    try {
        # Check if endpoint is already in use before starting
        if (Test-NgrokEndpointInUse) {
            Write-Host "   Ngrok endpoint is already in use by another process"
            Write-Host "   Attempting to use existing tunnel..."
            
            # Try to get the URL from existing ngrok process
            $attempts = 0
            $maxAttempts = 10
            do {
                Start-Sleep -Seconds 1
                $attempts++
                $ngrokUrl = Get-NgrokUrl
            } while (-not $ngrokUrl -and $attempts -lt $maxAttempts)
            
            if ($ngrokUrl) {
                Write-Host "   Using existing ngrok tunnel: $ngrokUrl"
            } else {
                Write-Host "   Could not detect existing ngrok tunnel"
                Write-Host "   Starting ngrok with pooling enabled..."
                # Start ngrok with pooling enabled to avoid conflicts
                $script:ngrokProcess = Start-Process "ngrok" -ArgumentList "http", "3000", "--pooling-enabled" -WindowStyle Hidden -PassThru
                
                # Wait for ngrok to start
                $attempts = 0
                $maxAttempts = 15
                $backoffSeconds = 1
                do {
                    Start-Sleep -Seconds $backoffSeconds
                    $attempts++
                    Write-Host "   Waiting for ngrok tunnel... (Attempt $attempts/$maxAttempts)"
                    
                    if ($attempts % 3 -eq 0 -and $backoffSeconds -lt 3) {
                        $backoffSeconds++
                    }
                    
                    $ngrokUrl = Get-NgrokUrl
                } while (-not $ngrokUrl -and $attempts -lt $maxAttempts)
            }
        } else {
            # Start ngrok normally
            $script:ngrokProcess = Start-Process "ngrok" -ArgumentList "http", "3000" -WindowStyle Hidden -PassThru
            
            # Wait for ngrok to start
            $attempts = 0
            $maxAttempts = 15
            $backoffSeconds = 1
            do {
                Start-Sleep -Seconds $backoffSeconds
                $attempts++
                Write-Host "   Waiting for ngrok tunnel... (Attempt $attempts/$maxAttempts)"
                
                if ($attempts % 3 -eq 0 -and $backoffSeconds -lt 3) {
                    $backoffSeconds++
                }
                
                $ngrokUrl = Get-NgrokUrl
            } while (-not $ngrokUrl -and $attempts -lt $maxAttempts)
        }

        if ($ngrokUrl) {
            Write-Host "Ngrok tunnel established: $ngrokUrl"
        } else {
            Write-Host "Failed to start ngrok tunnel after $maxAttempts attempts"
            Write-Host "   Check if ngrok is installed and authenticated"
            if ($script:ngrokProcess -and !$script:ngrokProcess.HasExited) {
                Write-Host "   Ngrok process is running in background (PID: $($script:ngrokProcess.Id))"
            }
        }
    } catch {
        Write-Host "Failed to start ngrok process: $($_.Exception.Message)"
        Write-Host "   Ensure ngrok is installed and authenticated"
    }
} else {
    Write-Host "Ngrok tunnel is already running: $ngrokUrl"
}

Write-Host "Starting Yassine Mill app..."
Start-Process "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--app=https://yassine-app.vercel.app/ --window-size=1280,920"

Write-Host "`nStatus Summary:"
Write-Host "- Backend API: http://localhost:3000"
Write-Host "- Ngrok URL: $ngrokUrl"
Write-Host "- App URL: https://yassine-app.vercel.app"
Write-Host "`nServices are running in the background (hidden windows)"
Write-Host "Use this window to monitor and control the services"
Write-Host "Close this window to stop all services"

Write-Host "`nPress any key to close this window and stop all services..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')