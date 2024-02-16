@echo off
setlocal enabledelayedexpansion

echo *** HDrezka-Grabber: run building packages %date% %time% ***
echo.

echo HDrezka-Grabber.build: npm run build
call npm run build -silent

echo HDrezka-Grabber.build: building done.
echo.

set PLATFORM=platform
for /D %%i in (%PLATFORM%\*) do (
    call "%%i\make.bat"
)

rd /s /q dist\build\HDrezka-Grabber.build
echo *** HDrezka-Grabber: building of all packages was successful %date% %time% ***
exit