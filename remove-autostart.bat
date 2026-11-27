@echo off
schtasks /delete /tn "PingPings Server" /f
echo.
echo Auto-start removed. (A server that is already running keeps running until you close its window.)
pause
