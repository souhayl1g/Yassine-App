# Yassine Olive Mill - Backend & Ngrok Auto-Start Script
# This script runs silently, monitors processes, and auto-restarts on failure

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
# If installed to ProgramData by installer, prefer that deployed path
$PossibleDeployed = "C:\ProgramData\Yassine-App\yassine_olive_mill_backend-fedi\yassine_olive_mill_backend-fedi"
if (Test-Path $PossibleDeployed) {
    $BackendDir = $PossibleDeployed
} else {
    $BackendDir = Join-Path $ScriptDir "yassine_olive_mill_backend-fedi\yassine_olive_mill_backend-fedi"
}
$LogDir = Join-Path $ScriptDir "logs"
$ConfigFile = Join-Path $ScriptDir "backend-ngrok-config.json"
$NgrokUrlFile = Join-Path $ScriptDir "ngrok-url.txt"
$BackendPort = 3000
$NgrokPort = 3000
$CheckInterval = 30  # seconds
$MaxRestartAttempts = 5
$RestartDelay = 10    # seconds

# Ensure log directory exists
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$LogFile = Join-Path $LogDir "automation.log"
$BackendLogFile = Join-Path $LogDir "backend.log"
$NgrokLogFile = Join-Path $LogDir "ngrok.log"

# Resolve absolute executables for node and ngrok
$NodeCmd = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $NodeCmd) { $NodeCmd = "node" }
$NgrokCmd = (Get-Command ngrok -ErrorAction SilentlyContinue).Source
if (-not $NgrokCmd) { $NgrokCmd = "ngrok" }

# Function to write log
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $LogMessage -ErrorAction SilentlyContinue
}

# Function to get ngrok URL from ngrok API
function Get-NgrokUrl {
    try {
        $Response = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -Method Get -TimeoutSec 5 -ErrorAction Stop
        if ($Response.tunnels -and $Response.tunnels.Count -gt 0) {
            $HttpsTunnel = $Response.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
            if ($HttpsTunnel) {
                return $HttpsTunnel.public_url
            }
            # Fallback to first tunnel if no HTTPS
            return $Response.tunnels[0].public_url
        }
    } catch {
        Write-Log "Failed to get ngrok URL: $($_.Exception.Message)" "WARN"
    }
    return $null
}

# Function to update ngrok URL file
function Update-NgrokUrlFile {
    $Url = Get-NgrokUrl
    if ($Url) {
        $CurrentUrl = if (Test-Path $NgrokUrlFile) { Get-Content $NgrokUrlFile -Raw | ForEach-Object { $_.Trim() } } else { "" }
        if ($CurrentUrl -ne $Url) {
            Set-Content -Path $NgrokUrlFile -Value $Url -NoNewline
            Write-Log "Ngrok URL updated: $Url" "INFO"
            # Also update config file if it exists
            if (Test-Path $ConfigFile) {
                $Config = Get-Content $ConfigFile | ConvertFrom-Json
                $Config.ngrokUrl = $Url
                $Config.lastUpdated = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
                $Config | ConvertTo-Json | Set-Content $ConfigFile
            }
        }
    }
}

# Function to check if process is running
function Test-ProcessRunning {
    param([string]$ProcessName)
    $Process = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    return $null -ne $Process
}

# Function to start backend
function Start-Backend {
    if (Test-ProcessRunning "node") {
        # Check if backend is actually running on the port
        try {
            $Response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
            Write-Log "Backend is already running" "INFO"
            return $true
        } catch {
            Write-Log "Backend process exists but not responding, will restart" "WARN"
        }
    }

    Write-Log "Starting backend server..." "INFO"
    
    if (-not (Test-Path $BackendDir)) {
        Write-Log "Backend directory not found: $BackendDir" "ERROR"
        return $false
    }

    # Run backend using node directly (use package start if defined)
    try {
        if (Test-Path (Join-Path $BackendDir "package.json")) {
            # Run npm start via node - this will use the package.json scripts
            $npmCmd = (Get-Command npm -ErrorAction SilentlyContinue).Source
            if (-not $npmCmd) { $npmCmd = "npm" }
            Start-Process -FilePath $npmCmd -ArgumentList "start" -WorkingDirectory $BackendDir -WindowStyle Hidden -RedirectStandardOutput $BackendLogFile -RedirectStandardError $BackendLogFile -ErrorAction Stop
        } else {
            # Fallback: try running index.js or app.js
            $entry = Get-ChildItem -Path $BackendDir -Filter "app*.js" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($entry) {
                Start-Process -FilePath $NodeCmd -ArgumentList $entry.FullName -WorkingDirectory $BackendDir -WindowStyle Hidden -RedirectStandardOutput $BackendLogFile -RedirectStandardError $BackendLogFile -ErrorAction Stop
            } else {
                Write-Log "No package.json or entry script found in backend directory" "ERROR"
                return $false
            }
        }
        
    # Wait for backend to start
        $MaxWait = 30
        $Waited = 0
        while ($Waited -lt $MaxWait) {
            Start-Sleep -Seconds 2
            try {
                $Response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
                Write-Log "Backend started successfully" "INFO"
                return $true
            } catch {
                $Waited += 2
            }
        }
        
        Write-Log "Backend failed to start within timeout" "ERROR"
        return $false
    } catch {
        Write-Log "Failed to start backend: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Function to start ngrok
function Start-Ngrok {
    if (Test-ProcessRunning "ngrok") {
        Write-Log "Ngrok is already running" "INFO"
        Update-NgrokUrlFile
        return $true
    }

    Write-Log "Starting ngrok tunnel..." "INFO"
    
    # Check if ngrok is installed
    $NgrokPath = Get-Command ngrok -ErrorAction SilentlyContinue
    if (-not $NgrokPath) {
        Write-Log "Ngrok not found in PATH. Please install ngrok or add it to PATH." "ERROR"
        return $false
    }

    try {
        $NgrokScript = @"
            ngrok http $NgrokPort --log=stdout *> '$NgrokLogFile' 2>&1
"@

        Start-Process -FilePath $NgrokCmd `
            -ArgumentList "http", $NgrokPort, "--log=stdout" `
            -WindowStyle Hidden `
            -RedirectStandardOutput $NgrokLogFile `
            -RedirectStandardError $NgrokLogFile `
            -ErrorAction Stop
        
        # Wait for ngrok to start
        Start-Sleep -Seconds 5
        
        # Check if ngrok started
        if (Test-ProcessRunning "ngrok") {
            Write-Log "Ngrok started successfully" "INFO"
            Start-Sleep -Seconds 3
            Update-NgrokUrlFile
            return $true
        } else {
            Write-Log "Ngrok process not found after start attempt" "ERROR"
            return $false
        }
    } catch {
        Write-Log "Failed to start ngrok: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Function to stop processes
function Stop-AllProcesses {
    Write-Log "Stopping all processes..." "INFO"
    
    # Stop ngrok
    Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Stop node processes (be careful - this stops all node processes)
    # Better approach: find processes using the backend port
    $BackendProcesses = Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue | 
        Select-Object -ExpandProperty OwningProcess -Unique
    
    foreach ($PID in $BackendProcesses) {
        try {
            Stop-Process -Id $PID -Force -ErrorAction SilentlyContinue
        } catch {
            # Ignore errors
        }
    }
    
    Start-Sleep -Seconds 2
}

# Main monitoring loop
function Start-Monitoring {
    Write-Log "=== Automation Script Started ===" "INFO"
    Write-Log "Backend Directory: $BackendDir" "INFO"
    Write-Log "Backend Port: $BackendPort" "INFO"
    Write-Log "Ngrok Port: $NgrokPort" "INFO"
    
    $BackendRestartCount = 0
    $NgrokRestartCount = 0
    
    # Initial start
    $BackendRunning = Start-Backend
    $NgrokRunning = Start-Ngrok
    
    while ($true) {
        try {
            # Check backend
            $BackendHealthy = $false
            try {
                $Response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
                $BackendHealthy = $true
                $BackendRestartCount = 0  # Reset counter on success
            } catch {
                $BackendHealthy = $false
            }
            
            if (-not $BackendHealthy) {
                Write-Log "Backend is not responding, restarting..." "WARN"
                $BackendRestartCount++
                
                if ($BackendRestartCount -le $MaxRestartAttempts) {
                    Stop-AllProcesses
                    Start-Sleep -Seconds $RestartDelay
                    $BackendRunning = Start-Backend
                    if (-not $BackendRunning) {
                        Write-Log "Backend restart failed (attempt $BackendRestartCount/$MaxRestartAttempts)" "ERROR"
                    }
                } else {
                    Write-Log "Backend restart limit reached. Stopping monitoring." "ERROR"
                    break
                }
            }
            
            # Check ngrok
            $NgrokHealthy = Test-ProcessRunning "ngrok"
            if (-not $NgrokHealthy) {
                Write-Log "Ngrok is not running, restarting..." "WARN"
                $NgrokRestartCount++
                
                if ($NgrokRestartCount -le $MaxRestartAttempts) {
                    Start-Sleep -Seconds $RestartDelay
                    $NgrokRunning = Start-Ngrok
                    if (-not $NgrokRunning) {
                        Write-Log "Ngrok restart failed (attempt $NgrokRestartCount/$MaxRestartAttempts)" "ERROR"
                    }
                } else {
                    Write-Log "Ngrok restart limit reached. Stopping monitoring." "ERROR"
                    break
                }
            } else {
                $NgrokRestartCount = 0  # Reset counter on success
                # Update ngrok URL periodically
                Update-NgrokUrlFile
            }
            
            # Wait before next check
            Start-Sleep -Seconds $CheckInterval
            
        } catch {
            Write-Log "Error in monitoring loop: $($_.Exception.Message)" "ERROR"
            Start-Sleep -Seconds $CheckInterval
        }
    }
    
    Write-Log "=== Automation Script Stopped ===" "INFO"
}

# Handle script termination
$null = Register-EngineEvent PowerShell.Exiting -Action {
    Write-Log "Script is terminating, cleaning up..." "INFO"
    Stop-AllProcesses
}

# Start monitoring
Start-Monitoring

