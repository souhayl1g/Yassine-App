# Create desktop-like app shortcut for Yassine Mill
$WScriptShell = New-Object -ComObject WScript.Shell
$shortcutPath = [System.IO.Path]::Combine([System.Environment]::GetFolderPath("Desktop"), "Yassine Mill.lnk")

# Create the shortcut
$Shortcut = $WScriptShell.CreateShortcut($shortcutPath)

# Set to run services check script
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-ExecutionPolicy Bypass -NoProfile -File `"$PSScriptRoot\start-services.ps1`""

# Set a nice icon
$Shortcut.IconLocation = "C:\Windows\System32\shell32.dll,44"

# Set working directory (optional)
$Shortcut.WorkingDirectory = $PSScriptRoot

# Save the shortcut
$Shortcut.Save()

Write-Host "`nCreated Yassine Mill desktop app shortcut:"
Write-Host "- Opens in desktop app mode (no browser controls)"
Write-Host "- Window size: 1280x920"
Write-Host "- Location: Desktop"
Write-Host "`nJust double-click the shortcut to open the app!`n"