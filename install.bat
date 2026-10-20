@echo off
:: ============================================================================
:: LeaxPanel(os) - Windows Installer
:: ============================================================================
:: This script installs all dependencies, starts Docker services (PostgreSQL,
:: Redis, Minio), runs database migrations and seeds, and prepares the
:: environment for one-click run.
:: Run as Administrator if you encounter permission issues.
:: ============================================================================

setlocal enabledelayedexpansion

echo.
echo ============================================================================
echo   LeaxPanel(os) - Complete Cloud Operating System
echo   Windows Installer
echo ============================================================================
echo.

:: Check Node.js
echo [1/8] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js 22+ from https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo Node.js found.

:: Check npm
echo [2/8] Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available.
    pause
    exit /b 1
)
npm --version
echo npm found.

:: Check Docker (optional - for PostgreSQL, Redis, Minio)
echo [3/8] Checking Docker...
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Docker not found. PostgreSQL/Redis/Minio will not be auto-started.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop/
    echo Or install PostgreSQL and Redis manually and configure .env accordingly.
    set DOCKER_AVAILABLE=0
) else (
    echo Docker found.
    set DOCKER_AVAILABLE=1
)

:: Create .env from .env.example if not exists
echo [4/8] Setting up environment configuration...
if not exist .env (
    copy .env.example .env >nul
    echo Created .env from .env.example
    echo Please edit .env with your configuration settings.
) else (
    echo .env already exists, skipping.
)

:: Install npm dependencies
echo [5/8] Installing npm dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)
echo Dependencies installed successfully.

:: Start Docker services if available
if %DOCKER_AVAILABLE% equ 1 (
    echo [6/8] Starting Docker services (PostgreSQL, Redis, Minio)...
    docker compose up -d postgres redis minio
    if %errorlevel% neq 0 (
        echo WARNING: docker compose up failed. Trying docker-compose...
        docker-compose up -d postgres redis minio
        if %errorlevel% neq 0 (
            echo WARNING: Could not start Docker services. You may need to start them manually.
        )
    )

    :: Wait for PostgreSQL to be ready
    echo [7/8] Waiting for PostgreSQL to be ready...
    set /a ATTEMPTS=0
    :pg_wait
    if %ATTEMPTS% geq 60 (
        echo WARNING: PostgreSQL did not become ready in time. Migrations may fail.
        goto skip_migrate
    )
    docker compose exec -T postgres pg_isready -U leaxos -d leaxos >nul 2>&1
    if %errorlevel% neq 0 (
        set /a ATTEMPTS+=1
        timeout /t 2 >nul
        goto pg_wait
    )
    echo PostgreSQL is ready.

    :: Run database migrations
    echo [8/8] Running database migrations...
    node migrations/run.js
    if %errorlevel% neq 0 (
        echo WARNING: Migrations failed. You can run them manually later with: node migrations/run.js
    ) else (
        echo Migrations completed successfully.

        :: Run database seeds
        echo Running database seeds...
        node seeds/run.js
        if %errorlevel% neq 0 (
            echo WARNING: Seeds failed. You can run them manually later with: node seeds/run.js
        ) else (
            echo Seeds completed successfully.
        )
    )
    :skip_migrate
) else (
    echo [6/8] Skipping Docker services (Docker not available).
    echo [7/8] Skipping migrations (PostgreSQL not available).
    echo [8/8] Skipping seeds (PostgreSQL not available).
)

:: Optional: Fix vulnerabilities
echo Running npm audit fix (optional)...
npm audit fix --force >nul 2>&1

echo.
echo ============================================================================
echo   Installation complete!
echo ============================================================================
echo.
echo To start the server, run: run.bat
echo Or manually: node server.js
echo.
echo Default admin credentials (after seeding):
echo   Email:    owner@leaxos.local
echo   Password: (set during seed or first login)
echo.
pause
