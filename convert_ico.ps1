Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile("C:\Users\Imad Eddin\Desktop\Disk cleaner\branding\logo.png")
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fileStream = New-Object System.IO.FileStream("C:\Users\Imad Eddin\Desktop\Disk cleaner\branding\icon.ico", [System.IO.FileMode]::Create)
$icon.Save($fileStream)
$fileStream.Close()
$icon.Dispose()
$bmp.Dispose()
Write-Output "Successfully generated icon.ico!"
