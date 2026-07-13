@echo off
cd /d "%~dp0"
echo Route Photo Map
echo.
echo Keep this window open while using the app.
echo Browser URL: http://127.0.0.1:5179/
echo.
"C:\Program Files\nodejs\node.exe" server.mjs
pause
