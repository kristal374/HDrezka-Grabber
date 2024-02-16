echo off

goto(){
# Linux code here
bash dist/run-build.sh
}

goto $@
exit

:(){
rem Windows script here
call dist\run-build.bat
exit