@echo off
setlocal enabledelayedexpansion

:: Automatic source directory detection
SET SOURCE_DIR=%~dp0
:: Remove trailing backslash if present
if "%SOURCE_DIR:~-1%"=="\" set SOURCE_DIR=%SOURCE_DIR:~0,-1%

SET DIST_DIR=%SOURCE_DIR%\production_package

echo ========================================================
echo   Next.js Production Packager (Generic Version)
echo ========================================================
echo Project Directory: %SOURCE_DIR%
echo Target Directory: %DIST_DIR%
echo.

:: Critical Check: Ensure build was run with standalone output
if not exist "%SOURCE_DIR%\.next\standalone" (
    echo [ERROR] .next/standalone folder not found!
    echo.
    echo Please ensure:
    echo 1. You ran "npm run build" successfully.
    echo 2. Your next.config.ts/js contains: output: 'standalone'
    echo.
    pause
    exit /b
)

echo Cleaning old package if exists...
if exist "%DIST_DIR%" rd /s /q "%DIST_DIR%"
mkdir "%DIST_DIR%"

echo [1/6] Copying standalone core files...
xcopy /E /I /H /Y "%SOURCE_DIR%\.next\standalone" "%DIST_DIR%" > nul

echo [2/6] Copying static assets (.next/static)...
mkdir "%DIST_DIR%\.next\static"
xcopy /E /I /H /Y "%SOURCE_DIR%\.next\static" "%DIST_DIR%\.next\static" > nul

echo [3/6] Copying public folder assets...
if exist "%SOURCE_DIR%\public" (
    mkdir "%DIST_DIR%\public"
    xcopy /E /I /H /Y "%SOURCE_DIR%\public" "%DIST_DIR%\public" > nul
)

echo [4/6] Handling environment variables...
if exist "%SOURCE_DIR%\.env" (
    copy "%SOURCE_DIR%\.env" "%DIST_DIR%\.env" > nul
    echo - .env file copied.
) else if exist "%SOURCE_DIR%\.env.local" (
    copy "%SOURCE_DIR%\.env.local" "%DIST_DIR%\.env" > nul
    echo - .env.local copied to .env.
)

echo [5/6] Preserving automation schedule (data folder)...
if exist "%SOURCE_DIR%\data" (
    xcopy /E /I /H /Y "%SOURCE_DIR%\data" "%DIST_DIR%\data" > nul
    echo - data\ folder copied (daily-report-automation.json if present).
)

echo [6/6] Creating run_server.bat...
set "RSB=%DIST_DIR%\run_server.bat"
echo @echo off > "%RSB%"
echo setlocal enabledelayedexpansion >> "%RSB%"
echo. >> "%RSB%"
echo SET PORT=8080 >> "%RSB%"
echo if not "%%1"=="" ( >> "%RSB%"
echo     SET PORT=%%1 >> "%RSB%"
echo ) else ( >> "%RSB%"
echo     echo. >> "%RSB%"
echo     set /p USR_PORT="Enter Port Number [Default 8080]: " >> "%RSB%"
echo     if not "^!USR_PORT^!"=="" SET PORT=^!USR_PORT^! >> "%RSB%"
echo ) >> "%RSB%"
echo. >> "%RSB%"
echo echo --------------------------------------------------- >> "%RSB%"
echo echo   Starting Next.js Server on Port: %%PORT%% >> "%RSB%"
echo echo   (Press Ctrl+C to stop) >> "%RSB%"
echo echo --------------------------------------------------- >> "%RSB%"
echo node server.js >> "%RSB%"

if not exist "%RSB%" (
    echo [ERROR] Failed to create run_server.bat!
    pause
)



echo.
echo ========================================================
echo   SUCCESS: Production package is ready!
echo ========================================================
echo Summary Location: %DIST_DIR%
echo.
echo To Deploy:
echo 1. Copy the "production_package" folder to your server.
echo 2. Ensure Node.js is installed on the server.
echo 3. Run: run_server.bat (default port 8080)
echo.
pause

