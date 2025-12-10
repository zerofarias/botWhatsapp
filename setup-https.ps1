# Script para habilitar HTTPS en VARO Bot Backend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VARO Bot - Configuración HTTPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Opciones:" -ForegroundColor Yellow
Write-Host "1. Instalar certificado autofirmado (desarrollo)" -ForegroundColor Green
Write-Host "2. Instalar certificado Let's Encrypt (producción)" -ForegroundColor Blue
Write-Host ""

$option = Read-Host "Selecciona una opción (1 o 2)"

if ($option -eq "1") {
    Write-Host ""
    Write-Host "Generando certificado autofirmado..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"C:\wppconnect2\setup-ssl-selfsigned.ps1`"" -Verb RunAs -Wait
}
elseif ($option -eq "2") {
    Write-Host ""
    Write-Host "Configurando Let's Encrypt..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"C:\wppconnect2\setup-ssl-letsencrypt.ps1`"" -Verb RunAs -Wait
}
else {
    Write-Host "Opción no válida" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "PASOS SIGUIENTES:" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "1. Modifica platform-backend/src/index.ts:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   import https from 'https';" -ForegroundColor Gray
Write-Host "   import fs from 'fs';" -ForegroundColor Gray
Write-Host "   " -ForegroundColor Gray
Write-Host "   const options = {" -ForegroundColor Gray
Write-Host "     key: fs.readFileSync('./certs/varo-bot-cert.key')," -ForegroundColor Gray
Write-Host "     cert: fs.readFileSync('./certs/varo-bot-cert.crt')" -ForegroundColor Gray
Write-Host "   };" -ForegroundColor Gray
Write-Host "   " -ForegroundColor Gray
Write-Host "   const server = https.createServer(options, app);" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Recompila el backend:" -ForegroundColor Cyan
Write-Host "   npm run build" -ForegroundColor Gray

Write-Host ""
Write-Host "3. Reinicia los servicios:" -ForegroundColor Cyan
Write-Host "   powershell -ExecutionPolicy Bypass -File start-varo-services.ps1" -ForegroundColor Gray

Write-Host ""
Write-Host "4. Accede via HTTPS:" -ForegroundColor Cyan
Write-Host "   https://localhost:4000" -ForegroundColor Yellow
Write-Host ""
