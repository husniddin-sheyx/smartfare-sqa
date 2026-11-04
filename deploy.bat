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

echo [1/3] Fayllar tekshirilmoqda...
git add app.js index.html style.css sw.js deploy.bat push.bat README.md robots.txt sitemap.xml
git commit -m "feat: complete document tools, full icon overhaul and pdf/word fixes"
git branch -M main

echo.
echo [2/3] GitHub va Vercel ga yuborilmoqda...
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
