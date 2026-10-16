@echo off
chcp 65001 >nul
title DocConvert AI - GitHub & Vercel Deploy
cd /d "%~dp0"
echo ========================================================
echo   DocConvert AI - GitHub & Vercel Avto-Yuklash
echo ========================================================
echo.

git remote get-url origin >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Remote 'origin' topilmadi.
    set /p REPO_URL="GitHub URL manzilini kiriting: "
    if "%REPO_URL%"=="" (
        echo Bekor qilindi.
        pause
        exit /b
    )
    git remote add origin %REPO_URL%
)

echo Yangilanishlar tekshirilmoqda...
git add .
git commit -m "update: automatic deploy sync" >nul 2>&1
git branch -M main

echo GitHub'ga yuklanmoqda...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   ✓ Muvaffaqiyatli yuklandi!
    echo   Vercel yangilanishni avtomatik ravishda e'lon qiladi.
    echo ========================================================
) else (
    echo.
    echo [Xatolik] Yuklashda muammo yuz berdi. Internetni yoki ruxsatlarni tekshiring.
)

pause
