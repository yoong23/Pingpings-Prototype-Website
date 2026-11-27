@echo off
title Ping-Ping's - make the website secure (one time only)
echo.
echo  Step 1 of 2: installing mkcert (a small free tool that makes a trusted certificate)...
echo.
winget install FiloSottile.mkcert -e --accept-package-agreements --accept-source-agreements
set "PATH=%PATH%;%LOCALAPPDATA%\Microsoft\WinGet\Links"
echo.
echo  Step 2 of 2: making this laptop trust the certificate.
echo  Click YES when Windows asks for permission.
echo.
mkcert -install
echo.
if errorlevel 1 (
  echo  Something went wrong. Please read README-SECURE.txt, "If winget does not work".
) else (
  echo  DONE. Now close ALL VS Code terminals, open a new one and run:  npm start
)
echo.
pause
