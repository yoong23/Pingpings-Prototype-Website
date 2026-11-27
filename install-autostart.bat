@echo off
cd /d "%~dp0"
echo Making the server start by itself when you log in to Windows...
schtasks /create /tn "PingPings Server" /sc onlogon /delay 0000:20 /rl limited /f /tr "cmd /c start \"\" /min \"%~dp0run-server.bat\""
if %errorlevel%==0 (
  echo.
  echo Done. The server will start minimized, by itself, every time you log in.
  echo To start it right now, double-click run-server.bat
) else (
  echo.
  echo Could not create the task. Try again: right-click this file and choose "Run as administrator".
  echo Or use the Startup folder instead: press Win+R, type shell:startup, and put a shortcut to run-server.bat there.
)
echo.
pause
