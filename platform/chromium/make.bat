@echo off
setlocal enabledelayedexpansion

echo *** HDrezka-Grabber: HDrezka-Grabber.chromium: run build package

set DES=dist\build\HDrezka-Grabber.chromium
if exist "%DES%" rd /s /q "%DES%"
mkdir "%DES%"

echo HDrezka-Grabber.chromium: copying common files
xcopy /e /i "dist\build\HDrezka-Grabber.build\*" "%DES%" > nul
if errorlevel 1 (
    echo ~~~ Not found HDrezka-Grabber.build files ~~~
    exit
)

set all_requirements=img js _locales
for %%p in (%all_requirements%) do (
  xcopy /e /i "src\%%p" "%DES%\%%p" > nul
)
xcopy "LICENSE.md" "%DES%" > nul

echo HDrezka-Grabber.chromium: copy chromium-specific files
copy "platform\chromium\manifest.json" "%DES%" > nul

echo HDrezka-Grabber.chromium: generate meta
python "dist\make-meta.py" "%DES%"

echo HDrezka-Grabber.chromium: Creating package
pushd "%DES%\.." >nul
powershell Compress-Archive -Path HDrezka-Grabber.chromium\* -DestinationPath "HDrezka-Grabber.chromium.zip" -Force
popd >nul

echo HDrezka-Grabber.chromium: Package done.
echo.
exit /b