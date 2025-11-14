# Script para instalar Caddy en Windows

function Test-CommandExists {
    param($command)
    try {
        Get-Command $command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Instalador de Caddy + SSL/HTTPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si Caddy está instalado
if (Test-CommandExists "caddy") {
    Write-Host "✅ Caddy ya está instalado" -ForegroundColor Green
    Write-Host ""
    
    # Mostrar versión
    Write-Host "Versión:" -ForegroundColor Yellow
    caddy version
    Write-Host ""
} else {
    Write-Host "⚠️  Caddy no está instalado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opciones de instalación:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1️⃣  Usar Chocolatey (recomendado si lo tienes):" -ForegroundColor Green
    Write-Host "   choco install caddy -y" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2️⃣  Descargar manualmente desde:" -ForegroundColor Green
    Write-Host "   https://caddyserver.com/download" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3️⃣  Usar Scoop (gestor de paquetes para Windows):" -ForegroundColor Green
    Write-Host "   scoop install caddy" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Por favor, instala Caddy y ejecuta este script nuevamente." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Presiona Enter para continuar"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando Caddy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔐 URL: https://camarafarma.duckdns.org" -ForegroundColor Green
Write-Host "📡 Backend: http://localhost:4000" -ForegroundColor Green
Write-Host "🔌 Socket.IO: http://localhost:4001" -ForegroundColor Green
Write-Host ""
Write-Host "⏳ Caddy obtendrá un certificado SSL de Let's Encrypt..." -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  El puerto 80 y 443 deben estar abiertos en tu router" -ForegroundColor Yellow
Write-Host ""

# Ejecutar Caddy
Write-Host "Iniciando Caddy..." -ForegroundColor Cyan
Write-Host ""

caddy run -config C:\wppconnect2\Caddyfile

Write-Host ""
Write-Host "Caddy finalizado." -ForegroundColor Yellow
Write-Host ""
