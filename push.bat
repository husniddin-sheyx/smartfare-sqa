@echo off
chcp 65001 >nul
title DocConvert AI - GitHub Push
cd /d "%~dp0"
echo ========================================================
echo   GitHub'ga yuklash (husniddin-sheyx/smartfare-sqa)
echo ========================================================
echo.
git push -u origin main
echo.
echo Jarayon yakunlandi.
pause
