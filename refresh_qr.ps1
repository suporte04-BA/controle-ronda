param(
    [string]$TunnelUrl = "https://speak-washington-orleans-invention.trycloudflare.com",
    [string]$ApiKey = "transobra-evolution-2026-chave-secreta",
    [int]$IntervalSeconds = 25
)

Write-Host "=== Auto QR Code Refresher (background) ===" -ForegroundColor Green
Write-Host "Atualizando qr.js a cada $IntervalSeconds segundos (sem foco na janela)..."
Write-Host "Pressione Ctrl+C para parar"
Write-Host ""

while ($true) {
    try {
        $raw = (Invoke-WebRequest -Uri "$TunnelUrl/instance/connect/transobras" -Method GET -Headers @{"apikey" = $ApiKey} -TimeoutSec 10).Content
        $json = $raw | ConvertFrom-Json
        
        if ($json.base64) {
            $jsContent = "document.getElementById('qr').src = '" + $json.base64 + "';"
            [System.IO.File]::WriteAllText("C:\Users\usuario\Documents\controle-ronda\qr.js", $jsContent, (New-Object System.Text.UTF8Encoding $false))
            
            $time = Get-Date -Format "HH:mm:ss"
            Write-Host "[$time] QR Code atualizado!" -ForegroundColor Green
        } else {
            $time = Get-Date -Format "HH:mm:ss"
            Write-Host "[$time] QR vazio na resposta" -ForegroundColor Yellow
        }
    } catch {
        $time = Get-Date -Format "HH:mm:ss"
        Write-Host "[$time] Erro: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds $IntervalSeconds
}
