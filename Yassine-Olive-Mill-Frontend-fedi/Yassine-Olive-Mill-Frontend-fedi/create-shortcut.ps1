$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$Home\Desktop\Yassine Olive Mill.lnk")
$Shortcut.TargetPath = "http://192.168.1.31:5173"
$Shortcut.IconLocation = "$PSScriptRoot\public\olive_mill.ico"
$Shortcut.Description = "Yassine Olive Mill Management System"
$Shortcut.Save()