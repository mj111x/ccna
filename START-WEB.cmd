@echo off
chcp 65001 >nul
cd /d "%~dp0"
start "CCNA Exam Server" /min python -m http.server 8765 --bind 127.0.0.1
ping 127.0.0.1 -n 2 >nul
start "" "http://localhost:8765"
