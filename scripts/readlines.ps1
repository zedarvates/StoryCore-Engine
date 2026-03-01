$content = Get-Content "c:\storycore-engine\electron\ipcChannels.ts" -Raw
$lines = $content -split "`n"
$lines[1749..1800] -join "`n"
