$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut([Environment]::GetFolderPath("Desktop") + "\Yassine Olive Mill.lnk")
$Shortcut.TargetPath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$Shortcut.Arguments = "--app=https://yassine-app.vercel.app --start-fullscreen"
$Shortcut.Description = "Yassine Olive Mill Management System"
$Shortcut.WindowStyle = 3
$Shortcut.Save()

Write-Host "Shortcut created successfully on your desktop!"