@echo off
title Ping-Ping's server (do not close this window)
cd /d "%~dp0"
:loop
node --disable-warning=ExperimentalWarning server.js
echo.
echo The server stopped. Starting again in 5 seconds...
echo (To stop it for good, close this window.)
timeout /t 5 /nobreak >nul
goto loop
