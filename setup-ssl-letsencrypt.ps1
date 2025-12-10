# Setup SSL con Let's Encrypt para VARO Bot
# Requisitos: Tener Certbot instalado y un dominio válido

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VARO Bot - Instalación SSL Let's Encrypt" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar permisos de administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "ERROR: Debes ejecutar como ADMINISTRADOR" -ForegroundColor Red
    exit 1
}

# 1. Instalar Certbot si no existe
Write-Host "Verificando Certbot..." -ForegroundColor Yellow
$certbotPath = (Get-Command certbot -ErrorAction SilentlyContinue).Source

if (-not $certbotPath) {
    Write-Host "Instalando Certbot..." -ForegroundColor Yellow
    choco install certbot -y
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: No se pudo instalar Certbot" -ForegroundColor Red
        Write-Host "Intenta con: choco install certbot" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✓ Certbot instalado" -ForegroundColor Green
} else {
    Write-Host "✓ Certbot encontrado: $certbotPath" -ForegroundColor Green
}

Write-Host ""

# 2. Pedir datos del usuario
$domain = Read-Host "Ingresa tu dominio (ej: tudominio.com)"
$email = Read-Host "Ingresa tu email para Let's Encrypt"

if ([string]::IsNullOrWhiteSpace($domain) -or [string]::IsNullOrWhiteSpace($email)) {
    Write-Host "ERROR: Dominio y email son requeridos" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Certificando dominio: $domain" -ForegroundColor Yellow
Write-Host "Email: $email" -ForegroundColor Yellow
Write-Host ""

# 3. Generar certificado
Write-Host "Generando certificado SSL..." -ForegroundColor Yellow
$certPath = "C:\wppconnect2\certs"
if (-not (Test-Path $certPath)) {
    New-Item -ItemType Directory -Path $certPath -Force | Out-Null
}

# Usar Certbot para generar certificado
certbot certonly `
    --standalone `
    --non-interactive `
    --agree-tos `
    --email $email `
    --cert-path $certPath `
    -d $domain

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: No se pudo generar certificado" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "CERTIFICADO SSL INSTALADO CORRECTAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 4. Ubicación de certificados
$certDir = "C:\Certbot\live\$domain"
Write-Host "Certificados ubicados en:" -ForegroundColor Cyan
Write-Host "  Certificado: $certDir\cert.pem" -ForegroundColor Yellow
Write-Host "  Clave privada: $certDir\privkey.pem" -ForegroundColor Yellow
Write-Host ""

# 5. Configurar en Node.js
Write-Host "Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Actualizar tu código Node.js para usar HTTPS" -ForegroundColor Yellow
Write-Host "2. Configurar certificado en el puerto 443" -ForegroundColor Yellow
Write-Host "3. Renovar automáticamente cada 3 meses" -ForegroundColor Yellow
Write-Host ""

# 6. Crear tarea de renovación automática
Write-Host "Configurando renovación automática..." -ForegroundColor Yellow
$trigger = New-ScheduledTaskTrigger -Daily -At "03:00"
$action = New-ScheduledTaskAction -Execute "certbot" -Argument "renew --quiet"
Register-ScheduledTask -TaskName "RenovarCertificadoSSL" `
    -Trigger $trigger `
    -Action $action `
    -RunLevel Highest `
    -Description "Renovar certificado SSL Let's Encrypt automáticamente" `
    -Force | Out-Null

Write-Host "✓ Renovación automática configurada" -ForegroundColor Green
Write-Host ""
Write-Host "El certificado se renovará automáticamente cada día a las 03:00" -ForegroundColor Green
