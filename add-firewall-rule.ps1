# 以管理员身份运行此脚本
# 右键点击 -> 使用 PowerShell 运行

# 删除旧规则（如果存在）
Remove-NetFirewallRule -DisplayName "Xianxia Game" -ErrorAction SilentlyContinue

# 添加新规则
New-NetFirewallRule -DisplayName "Xianxia Game" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Any

Write-Host "========================================" -ForegroundColor Green
Write-Host "防火墙规则添加成功！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "同事现在可以访问: http://192.168.21.142:3000" -ForegroundColor Yellow
Write-Host ""
Read-Host "按回车键退出"
