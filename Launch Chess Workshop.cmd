@echo off
cd /d "%~dp0"
if exist "runtime\node.exe" (
  "runtime\node.exe" "scripts\serve.mjs" --open
) else (
  node "scripts\serve.mjs" --open
)
if errorlevel 1 pause
