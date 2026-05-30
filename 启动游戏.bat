@echo off
echo ========================================
echo    挂机修仙游戏 - 启动中...
echo ========================================
echo.

cd /d "%~dp0"

echo 正在启动服务器...
echo.
echo 启动完成后，本机访问: http://localhost:3000
echo 同事访问: http://192.168.21.142:3000
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

node server/index.js

pause
