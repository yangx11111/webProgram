@echo off
echo ================================
echo   费曼学习助手 - 启动中...
echo ================================
echo.
start http://127.0.0.1:5001
cd /d %~dp0..
python app.py
pause
