@echo off
:: ============================================================================
:: LeaxPanel(os) - Windows Runner
:: ============================================================================
:: This script ensures Docker services are running, then starts the
:: LeaxPanel(os) server.
:: ============================================================================

setlocal enabledelayedexpansion

echo.
echo ============================================================================
echo   LeaxPanel(os) - Complete Cloud Operating System
echo   Starting Server...
echo ============================================================================
echo.

:: Check if node_modules exists
if not exist node_modules (
    echo node_modules not found. Running install first...
    call install.bat
    if %errorlevel% neq 0 (
        echo ERROR: Installation failed.
        pause
        exit /b 1
    )
)

:: Check if .env exists
if not exist .env (
    echo .env not found. Creating from .env.example...
    copy .env.example .env >nul
)

:: Check Docker and start services if available
where docker >nul 2>&1
if %errorlevel% equ 0 (
    echo Checking Docker services...
    docker compose ps --services 2>nul | findstr /c:"postgres" >nul 2>&1
    if %errorlevel% neq 0 (
        echo Starting Docker services (PostgreSQL, Redis, Minio)...
        docker compose up -d postgres redis minio
        if %errorlevel% neq 0 (
            echo Trying docker-compose...
            docker-compose up -d postgres redis minio
        )
    )

    :: Wait for PostgreSQL to be ready
    echo Waiting for PostgreSQL to be ready...
    set /a ATTEMPTS=0
    :pg_wait
    if %ATTEMPTS% geq 60 (
        echo WARNING: PostgreSQL did not become ready. Server will start in degraded mode.
        goto start_server
    )
    docker compose exec -T postgres pg_isready -U leaxos -d leaxos >nul 2>&1
    if %errorlevel% neq 0 (
        set /a ATTEMPTS+=1
        timeout /t 2 >nul
        goto pg_wait
    )
    echo PostgreSQL is ready.
) else (
    echo WARNING: Docker not found. Server will start in degraded mode (no PostgreSQL/Redis).
)

:start_server
:: Start the server
echo Starting LeaxPanel(os) server on port 3000...
echo Press Ctrl+C to stop the server.
echo.
node server.js

pause
