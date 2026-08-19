@echo off
title KTG Tuna Operations & Yield System
echo ========================================================
echo   KTG TUNA OPERATIONS & DIGITAL TALLY ERP SYSTEM
echo ========================================================
echo Menjalankan aplikasi web lokal...
echo Buka browser di http://localhost:3000
echo.

where bun >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    bun run dev
) else (
    npm run dev
)
pause
