@echo off
chcp 65001 >nul
title DocConvert AI - GitHub Push
cd /d "%~dp0"
echo ========================================================
echo   GitHub'ga yuklash (DocConvert AI)
echo ========================================================
echo.
git add app.js index.html style.css sw.js deploy.bat push.bat README.md robots.txt sitemap.xml
git commit -m "feat: complete document tools and icon updates"
git push -u origin main
echo.
echo Jarayon yakunlandi.
pause
