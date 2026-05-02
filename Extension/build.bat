@echo off
echo Building CyberBase Web Guard v1.0...

set OUTPUT=..\cyberbase-webguard-v1.0.zip

if exist %OUTPUT% (
    del %OUTPUT%
    echo Deleted existing ZIP.
)

powershell -Command "Compress-Archive -Path 'manifest.json','background.js','content.js','popup.html','popup.js','blocked.html','custom.css','lib','assets' -DestinationPath '%OUTPUT%' -Force"

if %ERRORLEVEL% == 0 (
    echo.
    echo SUCCESS: %OUTPUT% created.
    echo Load in Chrome: chrome://extensions -^> Developer mode -^> Load unpacked -^> select extracted folder.
) else (
    echo.
    echo ERROR: Build failed. Check that lib\sweetalert2.all.min.js exists.
)
