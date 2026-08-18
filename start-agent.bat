@echo off
setlocal
set "PROJECT_PATH=%~1"
if "%PROJECT_PATH%"=="" set "PROJECT_PATH=%CD%"
echo Starting Multiclass Agent for:
echo %PROJECT_PATH%
node "%~dp0agent\server.mjs" --project "%PROJECT_PATH%"
pause
