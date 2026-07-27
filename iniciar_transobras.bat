@echo off
title Transobras - Iniciando...
echo ============================================
echo  Transobras - Inicializacao Automatica
echo ============================================
echo.

echo [1/5] Abrindo Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo       Aguardando containers...
timeout /t 30 /nobreak >nul

echo [2/5] Verificando containers...
docker ps --format "table {{.Names}}\t{{.Status}}" 2>nul
echo.

echo [3/5] Iniciando Cloudflare Tunnel...
start /min "" "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:8080
timeout /t 12 /nobreak >nul

echo [4/5] Iniciando auto-refresh QR code...
start /min powershell -WindowStyle Hidden -File "C:\Users\usuario\Documents\controle-ronda\refresh_qr.ps1"
timeout /t 3 /nobreak >nul

echo [5/5] Abrindo QR code no Edge...
start "" msedge "--inprivate --new-window C:\Users\usuario\Documents\controle-ronda\qr_whatsapp.html"

echo.
echo ============================================
echo  Tudo pronto! Escaneie o QR code no Edge.
echo ============================================
echo.
pause