@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo लोकल एडमिन सर्वर शुरू हो रहा है...
where python >nul 2>nul
if %errorlevel%==0 (
  python serve.py
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    py serve.py
  ) else (
    echo Python नहीं मिला। https://www.python.org/downloads/ से इंस्टॉल करें ^(Add Python to PATH चुनें^)।
  )
)
pause
