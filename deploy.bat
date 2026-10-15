@echo off
chcp 65001 >nul
echo ========================================================
echo   DocConvert AI - GitHub & Serverga yuklash yordamchisi
echo ========================================================
echo.
git status
echo.
echo Agar sizda allaqachon GitHub repozitoriy bo'lsa:
echo Manzilni kiriting (Masalan: https://github.com/username/docconvert.git)
echo.
set /p REPO_URL="GitHub URL: "
if "%REPO_URL%"=="" (
    echo Manzil kiritilmadi. Bekor qilindi.
    pause
    exit /b
)

git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%
git branch -M main
git push -u origin main

echo.
echo ========================================================
echo   Tabriklaymiz! Loyiha GitHub'ga yuklandi.
echo   Endi Vercel.com ga kirib "Add New Project" orqali ulab qo'yishingiz mumkin.
echo ========================================================
pause
