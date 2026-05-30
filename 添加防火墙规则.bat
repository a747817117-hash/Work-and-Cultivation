@echo off
echo ========================================
echo    添加防火墙规则（需要管理员权限）
echo ========================================
echo.

netsh advfirewall firewall add rule name="Xianxia Game Port 3000" dir=in action=allow protocol=TCP localport=3000

echo.
echo 防火墙规则添加完成！
echo 现在同事可以访问: http://192.168.21.142:3000
echo.
pause
