@echo off
title Arcade Database Scraper Framework Loader
cls

echo ==========================================================
echo       ARCADE DATABASE SCRAPER HOOKS COMPILATION
echo ==========================================================
echo.

:: 1. Verify and force-install any missing tool dependencies
echo [STAGE 1] Checking environment package matrices...
pip install requests pillow --quiet
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Python or pip is not recognized on this computer system.
    echo Please make sure Python is installed and added to your System PATH variables.
    echo.
    pause
    exit /b
)
echo.

:: 2. Execute the python folder indexer and scraper core script
echo [STAGE 2] Running folder scanner and database asset scraper...
py -B generate_library.py
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: The script crashed during the extraction process loop.
    echo Check the error log tracker lines printed above to troubleshoot.
    echo.
    pause
    exit /b
)

:: 3. Clear compilation logs and hold terminal visibility on success
echo.
echo ==========================================================
echo ✅ SUCCESS: All assets synchronized and compiled perfectly!
echo ==========================================================
echo.
echo Press any key to exit this window context deck...
pause > nul
