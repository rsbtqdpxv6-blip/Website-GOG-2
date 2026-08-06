@echo off
title Arcade Database Unmatched Artwork Purge Utility
cls

echo ==========================================================
echo       ARCADE AUTOMATED ARTWORK PACK PURGE UTILITY
echo ==========================================================
echo.

:: 1. Verify that Python is available inside the local execution terminal environment
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Python is not recognized or active on this computer system.
    echo.
    pause
    exit /b
)

:: 2. Verify that your database file asset is available before deleting disk contents
if not exist "library.json" (
    echo.
    echo ❌ ERROR: 'library.json' database mapping layout trace not found.
    echo        Please run your main 'run_scraper.bat' builder file first
    echo        to establish your active game file listings registry.
    echo.
    pause
    exit /b
)

:: 3. Fire the localized cleanup processing script module
echo Running automated ghost artwork alignment scanner...
echo.
python -B cleanup_boxart.py
echo.

echo ==========================================================
echo ✅ Task Completed! Press any key to exit this interface window deck...
echo ==========================================================
pause > nul
