@echo off
setlocal enabledelayedexpansion
:: ============================================================================
::  LeaxPanel(os) - Windows launcher
:: ============================================================================
::  Starts the panel in the foreground. Use PM2 for a background service:
::    npm run pm2
:: ============================================================================

cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   ERROR: Node.js was not found in your PATH.
    echo   Install Node.js 22+ from https://nodejs.org/en/download
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [LeaxPanel] Dependencies are missing, running the installer first...
    node scripts\bootstrap.js
    if %errorlevel% neq 0 (
        echo.
        echo   ERROR: The bootstrap step failed.
        pause
        exit /b 1
    )
)

if not exist ".env" (
    echo [LeaxPanel] No .env found, generating one...
    node scripts\bootstrap.js
)

set "PORT=3000"
for /f "tokens=1,* delims==" %%p in ('findstr /B "PORT=" .env 2^>nul') do set "PORT=%%p"
if not defined PORT set "PORT=3000"

echo.
echo ============================================================================
echo   LeaxPanel(os) is starting...
echo   Dashboard:  http://localhost:%PORT%
echo   Health:     http://localhost:%PORT%/health
echo   Press CTRL+C to stop.
echo ============================================================================
echo.

node server.js

echo.
echo   LeaxPanel has stopped.
pause
