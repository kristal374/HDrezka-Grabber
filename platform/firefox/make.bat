@echo off
setlocal enabledelayedexpansion

echo *** HDrezka-Grabber: HDrezka-Grabber.firefox: run build package

set DES=dist\build\HDrezka-Grabber.firefox
if exist "%DES%" rd /s /q "%DES%"
mkdir "%DES%"

echo HDrezka-Grabber.firefox: copying common files
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

echo HDrezka-Grabber.firefox: copy firefox-specific files
copy "platform\firefox\manifest.json" "%DES%" > nul

echo HDrezka-Grabber.firefox: generate meta
python "dist\make-meta.py" "%DES%"

echo HDrezka-Grabber.firefox: Creating package
pushd "%DES%\.." >nul
powershell Compress-Archive -Path HDrezka-Grabber.firefox\* -DestinationPath "HDrezka-Grabber.firefox.zip" -Force
if exist "HDrezka-Grabber.firefox.xpi" del "HDrezka-Grabber.firefox.xpi"
rename "HDrezka-Grabber.firefox.zip" "HDrezka-Grabber.firefox.xpi"
popd >nul

echo HDrezka-Grabber.firefox: Package done.
echo.
exit /b