@echo off
setlocal enabledelayedexpansion
:: ============================================================================
::  LeaxPanel(os) - Windows Installer
:: ============================================================================
::  One-command install straight from GitHub:
::
::    iwr -useb https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.bat | iex
::
::  Or clone and run:
::
::    git clone https://github.com/netblood/LeaxPanel-OS-.git
::    cd LeaxPanel-OS-
::    install.bat
::
::  The installer checks Node.js, generates every secret, installs the npm
::  dependencies, applies the database migrations and seeds the administrator.
:: ============================================================================

cd /d "%~dp0"

echo.
echo ============================================================================
echo   LeaxPanel(os) - Complete Cloud Platform Operating System
echo   Windows Installer - One Command Setup
echo ============================================================================
echo.

:: ---------------------------------------------------------------- Node.js ---
echo [1/5] Checking Node.js runtime...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   ERROR: Node.js was not found in your PATH.
    echo   LeaxPanel requires Node.js 22 or newer.
    echo   Download: https://nodejs.org/en/download
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set "NODE_VERSION=%%v"
echo     Found Node.js !NODE_VERSION!

node -e "const m=parseInt(process.versions.node.split('.')[0],10); if(m<22){console.error('Node.js 22+ required, found '+process.versions.node); process.exit(1);}"
if %errorlevel% neq 0 (
    echo.
    echo   ERROR: Node.js 22 or newer is required. Found !NODE_VERSION!
    echo   Download: https://nodejs.org/en/download
    echo.
    pause
    exit /b 1
)

:: ------------------------------------------------------------------- npm ---
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo     ERROR: npm was not found in your PATH. Reinstall Node.js with npm included.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('npm --version') do echo     Found npm %%v

:: --------------------------------------------------------------- firewall ---
echo [2/5] Opening the required firewall ports...
netsh advfirewall firewall add rule name="LeaxPanel HTTP 3000" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo     Firewall rule created for TCP 3000.
) else (
    echo     WARNING: could not create the firewall rule automatically.
    echo     Open TCP 3000 manually if the panel is not reachable.
)

:: ----------------------------------------------------------- port in use ---
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo     WARNING: something is already listening on port 3000.
    echo     Stop that process or change PORT in .env before starting LeaxPanel.
)

:: -------------------------------------------------------------- bootstrap ---
echo [3/5] Running the LeaxPanel bootstrap (dependencies, migrations, seeds)...
node scripts\bootstrap.js
if %errorlevel% neq 0 (
    echo.
    echo   ERROR: The bootstrap step failed. Check the output above.
    pause
    exit /b 1
)

:: ----------------------------------------------------------------- doctor ---
echo [4/5] Verifying the installation...
node scripts\verify.js
if %errorlevel% neq 0 (
    echo     WARNING: some verification checks did not pass.
    echo     Run http://localhost:3000/doctor after starting the panel.
)

:: -------------------------------------------------------------- shortcuts ---
echo [5/5] Finalising...
if not exist "data" mkdir "data" >nul 2>&1
if not exist "logs" mkdir "logs" >nul 2>&1
if not exist "backups" mkdir "backups" >nul 2>&1
echo     Working directories ready.

echo.
echo ============================================================================
echo   Ready to run.
echo ============================================================================
echo.
echo   Start the panel:   run.bat      (or: npm start)
echo   Open:              http://localhost:3000
echo   Health check:      http://localhost:3000/doctor
echo   Setup wizard:      http://localhost:3000/setup
echo.
echo   Admin email:       owner@leaxos.local
echo   Admin password:    see INSTALL_CREDENTIALS.txt in this folder
echo.
echo   Docs:    https://github.com/netblood/LeaxPanel-OS-
echo   Issues:  https://github.com/netblood/LeaxPanel-OS-/issues
echo ============================================================================
echo.
pause
