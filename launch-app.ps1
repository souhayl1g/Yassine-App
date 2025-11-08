# Start backend and ngrok services
$backendPath = Join-Path $PSScriptRoot "yassine_olive_mill_backend-fedi\yassine_olive_mill_backend-fedi"
$shortcutPath = [System.IO.Path]::Combine([System.Environment]::GetFolderPath("Desktop"), "Yassine Mill.lnk")

# Global variables to track spawned processes
$script:backendProcess = $null
$script:ngrokProcess = $null
$script:edgeProcess = $null
$script:monitoringNgrok = $true
$script:monitoringRunspace = $null
$script:monitoringPowerShell = $null
$script:monitoringHandle = $null

# Cleanup function to terminate all spawned processes
function Cleanup-Processes {
    Write-Host "`nCleaning up processes..."
    
    # Stop monitoring
    $script:monitoringNgrok = $false
    
    if ($script:monitoringPowerShell) {
        try {
            $script:monitoringPowerShell.Stop()
            if ($script:monitoringHandle) {
                $script:monitoringPowerShell.EndInvoke($script:monitoringHandle)
            }
            $script:monitoringPowerShell.Dispose()
        } catch {
            Write-Host "Error stopping monitoring: $($_.Exception.Message)"
        }
    }
    
    if ($script:monitoringRunspace) {
        try {
            $script:monitoringRunspace.Close()
            $script:monitoringRunspace.Dispose()
        } catch {
            Write-Host "Error disposing runspace: $($_.Exception.Message)"
        }
    }
    
    if ($script:backendProcess -and !$script:backendProcess.HasExited) {
        try {
            $script:backendProcess.Kill()
            Write-Host "Backend process terminated"
        } catch {
            Write-Host "Could not terminate backend process: $($_.Exception.Message)"
        }
    }
    
    # Kill all ngrok processes
    $ngrokProcesses = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
    foreach ($proc in $ngrokProcesses) {
        try {
            $proc.Kill()
            Write-Host "Ngrok process terminated (PID: $($proc.Id))"
        } catch {
            Write-Host "Could not terminate ngrok process: $($_.Exception.Message)"
        }
    }
    
    Write-Host "Cleanup complete."
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
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 3
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

# Robust function to start ngrok with multiple retry strategies
function Start-NgrokTunnel {
    param(
        [switch]$UsePooling
    )
    
    $maxRetries = 3
    $retryCount = 0
    
    while ($retryCount -lt $maxRetries) {
        try {
            # Kill any existing ngrok processes first
            $existingNgrok = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
            foreach ($proc in $existingNgrok) {
                try {
                    $proc.Kill()
                    Start-Sleep -Seconds 1
                } catch {
                    # Ignore errors when killing processes
                }
            }
            
            if ($UsePooling) {
                $script:ngrokProcess = Start-Process "ngrok" -ArgumentList "http", "3000", "--pooling-enabled" -WindowStyle Hidden -PassThru
            } else {
                $script:ngrokProcess = Start-Process "ngrok" -ArgumentList "http", "3000" -WindowStyle Hidden -PassThru
            }
            
            # Wait for ngrok to start with progressive backoff
            $attempts = 0
            $maxAttempts = 20
            $backoffSeconds = 1
            
            do {
                Start-Sleep -Seconds $backoffSeconds
                $attempts++
                Write-Host "   Waiting for ngrok tunnel... (Attempt $attempts/$maxAttempts)"
                
                # Progressive backoff
                if ($attempts -ge 5 -and $backoffSeconds -lt 2) { $backoffSeconds = 2 }
                if ($attempts -ge 10 -and $backoffSeconds -lt 3) { $backoffSeconds = 3 }
                
                $ngrokUrl = Get-NgrokUrl
                if ($ngrokUrl) { 
                    Write-Host "   Ngrok tunnel established!" -ForegroundColor Green
                    return $ngrokUrl 
                }
                
            } while ($attempts -lt $maxAttempts)
            
            # If we get here, ngrok didn't start properly
            Write-Host "   Ngrok failed to establish tunnel on attempt $($retryCount + 1)" -ForegroundColor Yellow
            
            # Kill the failed process
            if ($script:ngrokProcess -and !$script:ngrokProcess.HasExited) {
                try {
                    $script:ngrokProcess.Kill()
                    Start-Sleep -Seconds 2
                } catch {
                    # Ignore kill errors
                }
            }
            
            $retryCount++
            
            if ($retryCount -lt $maxRetries) {
                Write-Host "   Retrying ngrok start in 3 seconds... ($retryCount/$maxRetries)" -ForegroundColor Yellow
                Start-Sleep -Seconds 3
            }
            
        } catch {
            Write-Host "   Error starting ngrok: $($_.Exception.Message)" -ForegroundColor Red
            $retryCount++
            
            if ($retryCount -lt $maxRetries) {
                Write-Host "   Retrying in 3 seconds... ($retryCount/$maxRetries)" -ForegroundColor Yellow
                Start-Sleep -Seconds 3
            }
        }
    }
    
    Write-Host "   Failed to start ngrok after $maxRetries attempts" -ForegroundColor Red
    return $null
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
            Write-Host "Backend started successfully!" -ForegroundColor Green
        } else {
            Write-Host "Backend failed to start after $maxAttempts attempts" -ForegroundColor Red
            Write-Host "   Check if Node.js and dependencies are properly installed" -ForegroundColor Yellow
            if ($script:backendProcess -and !$script:backendProcess.HasExited) {
                Write-Host "   Backend process is running in background (PID: $($script:backendProcess.Id))" -ForegroundColor Cyan
            }
        }
    } catch {
        Write-Host "Failed to start backend process: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Ensure npm is installed and the backend directory exists" -ForegroundColor Yellow
    }
} else {
    Write-Host "Backend is already running" -ForegroundColor Green
}

# Check and handle ngrok
$ngrokUrl = Get-NgrokUrl
if (-not $ngrokUrl) {
    Write-Host "Starting ngrok tunnel (hidden)..."
    try {
        # Check if endpoint is already in use before starting
        if (Test-NgrokEndpointInUse) {
            Write-Host "   Ngrok endpoint is already in use by another process" -ForegroundColor Yellow
            Write-Host "   Attempting to use existing tunnel..." -ForegroundColor Yellow
            
            # Try to get the URL from existing ngrok process
            $attempts = 0
            $maxAttempts = 10
            do {
                Start-Sleep -Seconds 1
                $attempts++
                $ngrokUrl = Get-NgrokUrl
            } while (-not $ngrokUrl -and $attempts -lt $maxAttempts)
            
            if ($ngrokUrl) {
                Write-Host "   Using existing ngrok tunnel: $ngrokUrl" -ForegroundColor Green
            } else {
                Write-Host "   Could not detect existing ngrok tunnel" -ForegroundColor Yellow
                Write-Host "   Starting ngrok with pooling enabled..." -ForegroundColor Cyan
                $ngrokUrl = Start-NgrokTunnel -UsePooling
            }
        } else {
            # Start ngrok normally
            $ngrokUrl = Start-NgrokTunnel
        }

        if ($ngrokUrl) {
            Write-Host "Ngrok tunnel established: $ngrokUrl" -ForegroundColor Green
        } else {
            Write-Host "Failed to start ngrok tunnel initially" -ForegroundColor Red
            Write-Host "   Check if ngrok is installed and authenticated" -ForegroundColor Yellow
            Write-Host "   Robust monitoring will attempt to restart ngrok automatically" -ForegroundColor Cyan
            if ($script:ngrokProcess -and !$script:ngrokProcess.HasExited) {
                Write-Host "   Ngrok process is running in background (PID: $($script:ngrokProcess.Id))" -ForegroundColor Cyan
            }
        }
    } catch {
        Write-Host "Failed to start ngrok process: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Ensure ngrok is installed and authenticated" -ForegroundColor Yellow
    }
} else {
    Write-Host "Ngrok tunnel is already running: $ngrokUrl" -ForegroundColor Green
}

Write-Host "Starting Yassine Mill app..." -ForegroundColor Cyan
try {
    $script:edgeProcess = Start-Process "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ArgumentList "--app=https://yassine-app.vercel.app/ --window-size=1280,920" -PassThru
    Write-Host "App started successfully!" -ForegroundColor Green
} catch {
    Write-Host "Failed to start Edge app: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Please manually open: https://yassine-app.vercel.app/" -ForegroundColor Yellow
}

Write-Host "`nStatus Summary:" -ForegroundColor Cyan
Write-Host "- Backend API: http://localhost:3000" -ForegroundColor White
Write-Host "- Ngrok URL: $ngrokUrl" -ForegroundColor White
Write-Host "- App URL: https://yassine-app.vercel.app" -ForegroundColor White
Write-Host "`nServices are running in the background (hidden windows)" -ForegroundColor Cyan
Write-Host "Robust ngrok monitoring is active - it will auto-restart if it fails" -ForegroundColor Green
Write-Host "This window will remain open to monitor services" -ForegroundColor Cyan
Write-Host "Close this window to stop all services" -ForegroundColor Yellow

# Start robust ngrok monitoring in a separate runspace
Write-Host "`nStarting robust ngrok monitoring service..." -ForegroundColor Cyan
$script:monitoringRunspace = [runspacefactory]::CreateRunspace()
$script:monitoringRunspace.Open()
$script:monitoringPowerShell = [PowerShell]::Create()
$script:monitoringPowerShell.Runspace = $script:monitoringRunspace

$null = $script:monitoringPowerShell.AddScript({
    param($parentPID)
    
    function Get-NgrokUrl {
        try {
            $response = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction SilentlyContinue -TimeoutSec 2
            if ($response -and $response.tunnels) {
                return $response.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -ExpandProperty public_url -First 1
            }
            return $null
        } catch {
            return $null
        }
    }
    
    function Start-NgrokTunnel {
        $maxRetries = 5
        $retryCount = 0
        
        while ($retryCount -lt $maxRetries) {
            try {
                # Kill any existing ngrok processes first
                $existingNgrok = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
                foreach ($proc in $existingNgrok) {
                    try {
                        $proc.Kill()
                        Start-Sleep -Seconds 1
                    } catch {
                        # Ignore kill errors
                    }
                }
                
                # Start new ngrok process
                $process = Start-Process "ngrok" -ArgumentList "http", "3000" -WindowStyle Hidden -PassThru -ErrorAction Stop
                Start-Sleep -Seconds 3
                
                $attempts = 0
                while ($attempts -lt 15) {
                    $url = Get-NgrokUrl
                    if ($url) {
                        return @{ Success = $true; Url = $url; Process = $process }
                    }
                    Start-Sleep -Seconds 1
                    $attempts++
                }
                
                # If we get here, ngrok started but no URL yet - wait a bit more
                Start-Sleep -Seconds 2
                $url = Get-NgrokUrl
                if ($url) {
                    return @{ Success = $true; Url = $url; Process = $process }
                }
                
                # Retry
                $retryCount++
                if ($retryCount -lt $maxRetries) {
                    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Retrying ngrok start (attempt $retryCount/$maxRetries)..." -ForegroundColor Yellow
                    Start-Sleep -Seconds 2
                }
            } catch {
                $retryCount++
                if ($retryCount -lt $maxRetries) {
                    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Error starting ngrok, retrying... ($retryCount/$maxRetries)" -ForegroundColor Red
                    Start-Sleep -Seconds 2
                }
            }
        }
        
        return @{ Success = $false; Url = $null; Process = $null }
    }
    
    $lastUrl = $null
    $consecutiveFailures = 0
    $maxConsecutiveFailures = 3

    while ($true) {
        # Check if parent process is still running
        try {
            $parentProcess = Get-Process -Id $parentPID -ErrorAction SilentlyContinue
            if (-not $parentProcess) {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Parent process ended, stopping monitor..." -ForegroundColor Cyan
                break  # Parent process ended, exit monitoring
            }
        } catch {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Cannot access parent process, stopping monitor..." -ForegroundColor Cyan
            break  # Can't check parent, exit to be safe
        }
        
        Start-Sleep -Seconds 5
        
        $url = Get-NgrokUrl
        $ngrokProcess = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Select-Object -First 1
        
        # Always ensure ngrok is running - be very aggressive about keeping it alive
        if (-not $ngrokProcess -or $ngrokProcess.HasExited) {
            # No process or process exited - MUST restart
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Ngrok process not running! Restarting immediately..." -ForegroundColor Red
            $result = Start-NgrokTunnel
            if ($result.Success) {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Ngrok restarted successfully: $($result.Url)" -ForegroundColor Green
                $lastUrl = $result.Url
                $consecutiveFailures = 0
            } else {
                $consecutiveFailures++
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Failed to restart ngrok (consecutive failures: $consecutiveFailures)" -ForegroundColor Red
                
                if ($consecutiveFailures -ge $maxConsecutiveFailures) {
                    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Too many consecutive failures, waiting 30 seconds before next attempt..." -ForegroundColor Red
                    Start-Sleep -Seconds 30
                    $consecutiveFailures = 0
                }
            }
        } elseif (-not $url) {
            # Process exists but no URL - this is a problem, restart
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Ngrok process running but no tunnel URL! Restarting..." -ForegroundColor Yellow
            try {
                $ngrokProcess.Kill()
                Start-Sleep -Seconds 2
            } catch {
                # Ignore kill errors
            }
            $result = Start-NgrokTunnel
            if ($result.Success) {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Ngrok restarted: $($result.Url)" -ForegroundColor Green
                $lastUrl = $result.Url
                $consecutiveFailures = 0
            } else {
                $consecutiveFailures++
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Failed to restart (consecutive failures: $consecutiveFailures)" -ForegroundColor Red
            }
        } else {
            # Everything is good
            if ($url -ne $lastUrl) {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Ngrok URL: $url" -ForegroundColor Cyan
                $lastUrl = $url
            }
            $consecutiveFailures = 0  # Reset failure counter on success
        }
    }
}).AddArgument($PID)

$script:monitoringHandle = $script:monitoringPowerShell.BeginInvoke()

Write-Host "Robust ngrok monitoring started! (Checking every 5 seconds)" -ForegroundColor Green
Write-Host "`nServices are running continuously. Close this window to stop all services." -ForegroundColor Cyan
Write-Host "Ngrok will auto-restart if it fails - robust monitoring is active 24/7" -ForegroundColor Green

# Keep the script running and monitor services continuously
# Only exit when window is closed (not on key press)
try {
    # Continuous monitoring loop - only exits when window is closed
    while ($true) {
        Start-Sleep -Seconds 60
        
        # Optional: Periodically check and display status (less frequent to reduce noise)
        $currentUrl = Get-NgrokUrl
        $backendStatus = Test-Backend -TimeoutSec 2
        
        if (-not $backendStatus) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Warning: Backend not responding" -ForegroundColor Yellow
        }
        
        if (-not $currentUrl) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Warning: Ngrok URL not available (monitoring will restart)" -ForegroundColor Yellow
        }
    }
} finally {
    # Cleanup will be handled by the PowerShell.Exiting event
    Write-Host "Shutting down services..."
}