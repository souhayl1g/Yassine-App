param(
	[string]$Url = "https://yassine-app.vercel.app",
	[string]$Name = "Yassine Olive Mill",
	[switch]$Fullscreen,
	[switch]$AppWindow,
	# Accept SVG (preferred) or ICO. Windows shortcuts only accept .ico; we'll fallback automatically.
	[string]$Icon = "$PSScriptRoot\public\olive_mill.svg"
)

# Default behavior: app window + fullscreen if not explicitly set
if (-not $PSBoundParameters.ContainsKey('AppWindow')) { $AppWindow = $true }
if (-not $PSBoundParameters.ContainsKey('Fullscreen')) { $Fullscreen = $true }

function Get-BrowserPath {
	$edgePaths = @(
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
	)
	foreach ($p in $edgePaths) { if (Test-Path $p) { return $p } }

	$chromePaths = @(
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
	)
	foreach ($p in $chromePaths) { if (Test-Path $p) { return $p } }

	throw "No supported browser found (Edge/Chrome)."
}

$browser = Get-BrowserPath

# Build arguments: app-style window and fullscreen if requested
$cmdArgs = @()
if ($AppWindow) { $cmdArgs += "--app=$Url" } else { $cmdArgs += $Url }
if ($Fullscreen) { $cmdArgs += "--start-fullscreen" }

$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$Home\Desktop\$Name.lnk")
$Shortcut.TargetPath = $browser
$Shortcut.Arguments = ($cmdArgs -join ' ')
# Figure out icon: prefer .ico; if .svg provided, try a sibling .ico or public\favicon.ico
if (Test-Path $Icon) {
	$ext = [System.IO.Path]::GetExtension($Icon)
	if ($ext -ieq ".ico") {
		$Shortcut.IconLocation = $Icon
	} elseif ($ext -ieq ".svg") {
		$icoCandidate = [System.IO.Path]::ChangeExtension($Icon, 'ico')
		if (Test-Path $icoCandidate) {
			$Shortcut.IconLocation = $icoCandidate
		} elseif (Test-Path "$PSScriptRoot\public\favicon.ico") {
			$Shortcut.IconLocation = "$PSScriptRoot\public\favicon.ico"
		} else {
			Write-Warning "SVG icons aren't supported for Windows shortcuts. Add an ICO at: $icoCandidate or public\\favicon.ico for a custom icon. Using default browser icon."
		}
	}
}
$Shortcut.Description = "Yassine Olive Mill Management System"
$Shortcut.WindowStyle = 3  # Maximized
$Shortcut.Save()

Write-Host "Shortcut created on Desktop: $Name"
Write-Host "Target: $browser $($Shortcut.Arguments)"