# Setup SSL con Certificado Autofirmado (para desarrollo/pruebas)
# Genera un certificado válido por 365 días

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VARO Bot - Certificado SSL Autofirmado" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar permisos
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "ERROR: Debes ejecutar como ADMINISTRADOR" -ForegroundColor Red
    exit 1
}

# Crear carpeta de certificados
$certPath = "C:\wppconnect2\certs"
if (-not (Test-Path $certPath)) {
    New-Item -ItemType Directory -Path $certPath -Force | Out-Null
    Write-Host "✓ Carpeta de certificados creada: $certPath" -ForegroundColor Green
}

# Variables
$certName = "varo-bot-cert"
$subject = "CN=localhost"
$keyFile = "$certPath\$certName.key"
$certFile = "$certPath\$certName.crt"
$pfxFile = "$certPath\$certName.pfx"

Write-Host ""
Write-Host "Generando certificado autofirmado..." -ForegroundColor Yellow
Write-Host "  Ruta: $certPath" -ForegroundColor Gray
Write-Host "  Validez: 365 días" -ForegroundColor Gray
Write-Host ""

# Generar certificado autofirmado usando OpenSSL
# Si no tienes OpenSSL, usaremos PowerShell

try {
    # Verificar si OpenSSL está disponible
    $openssl = (Get-Command openssl -ErrorAction SilentlyContinue).Source
    
    if ($openssl) {
        Write-Host "Usando OpenSSL..." -ForegroundColor Yellow
        
        # Generar clave privada
        & openssl genrsa -out $keyFile 2048 2>&1 | Out-Null
        
        # Generar certificado
        & openssl req -new -x509 -key $keyFile -out $certFile -days 365 `
            -subj "/CN=localhost/O=VARO Bot/C=AR" 2>&1 | Out-Null
        
        # Generar PFX
        & openssl pkcs12 -export -out $pfxFile -inkey $keyFile -in $certFile -passin pass: -passout pass: 2>&1 | Out-Null
        
        Write-Host "✓ Certificado generado con OpenSSL" -ForegroundColor Green
    } else {
        throw "OpenSSL no disponible"
    }
}
catch {
    Write-Host "Usando PowerShell para generar certificado..." -ForegroundColor Yellow
    
    # Usar PowerShell para generar certificado
    $cert = New-SelfSignedCertificate `
        -CertStoreLocation Cert:\CurrentUser\My `
        -DnsName "localhost", "127.0.0.1", "altheavn.duckdns.org" `
        -Subject $subject `
        -NotAfter (Get-Date).AddDays(365) `
        -FriendlyName "VARO Bot Development Certificate"
    
    Write-Host "✓ Certificado generado con PowerShell" -ForegroundColor Green
    Write-Host "  Thumbprint: $($cert.Thumbprint)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "CERTIFICADO SSL CREADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Mostrar ubicación
Write-Host "Archivos de certificado:" -ForegroundColor Cyan
if (Test-Path $certFile) {
    Write-Host "  Certificado: $certFile" -ForegroundColor Yellow
}
if (Test-Path $keyFile) {
    Write-Host "  Clave privada: $keyFile" -ForegroundColor Yellow
}
if (Test-Path $pfxFile) {
    Write-Host "  Formato PFX: $pfxFile" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Uso en Node.js:" -ForegroundColor Cyan
Write-Host "  const https = require('https');" -ForegroundColor Gray
Write-Host "  const fs = require('fs');" -ForegroundColor Gray
Write-Host "  const options = {" -ForegroundColor Gray
Write-Host "    key: fs.readFileSync('$keyFile')," -ForegroundColor Gray
Write-Host "    cert: fs.readFileSync('$certFile')" -ForegroundColor Gray
Write-Host "  };" -ForegroundColor Gray
Write-Host "  https.createServer(options, app).listen(443);" -ForegroundColor Gray

Write-Host ""
Write-Host "⚠️  NOTA IMPORTANTE:" -ForegroundColor Yellow
Write-Host "  - Este certificado es AUTOFIRMADO (solo para desarrollo)" -ForegroundColor Yellow
Write-Host "  - Válido por 365 días" -ForegroundColor Yellow
Write-Host "  - Para producción usa Let's Encrypt o un CA certificado" -ForegroundColor Yellow
Write-Host "  - Los navegadores mostrarán advertencia de seguridad" -ForegroundColor Yellow

Write-Host ""
Write-Host "Para aceptar el certificado en Windows:" -ForegroundColor Cyan
Write-Host "  1. Abre MMC (presiona Win+R, escribe mmc)" -ForegroundColor Gray
Write-Host "  2. File → Add/Remove Snap-in" -ForegroundColor Gray
Write-Host "  3. Selecciona 'Certificates'" -ForegroundColor Gray
Write-Host "  4. Importa el certificado en 'Trusted Root Certification Authorities'" -ForegroundColor Gray

Write-Host ""
