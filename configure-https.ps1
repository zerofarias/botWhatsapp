#!/usr/bin/env powershell
<#
.SYNOPSIS
    Script Maestro para Configuración HTTPS - VARO Bot
    
.DESCRIPTION
    Gestiona la configuración completa de HTTPS:
    - Generación de certificados (autofirmados o Let's Encrypt)
    - Configuración de variables de entorno
    - Recompilación del backend
    - Reinicio de servicios
    
.PARAMETER Mode
    'dev' para desarrollo (autofirmado)
    'prod' para producción (Let's Encrypt)
    
.PARAMETER Domain
    Dominio para Let's Encrypt (solo modo producción)
    
.PARAMETER Email
    Email para certificado Let's Encrypt (solo modo producción)
    
.EXAMPLE
    .\configure-https.ps1 -Mode dev
    .\configure-https.ps1 -Mode prod -Domain altheavn.duckdns.org -Email tu@email.com
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'prod')]
    [string]$Mode = 'dev',
    
    [string]$Domain = '',
    [string]$Email = '',
    [string]$ProjectRoot = 'C:\wppconnect2'
)

# Colores para output
function Write-Title { 
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $args -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Step { 
    Write-Host "▶ $args" -ForegroundColor Yellow 
}

function Write-Success { 
    Write-Host "✅ $args" -ForegroundColor Green 
}

function Write-Error { 
    Write-Host "❌ $args" -ForegroundColor Red 
}

function Write-Info { 
    Write-Host "ℹ️  $args" -ForegroundColor Cyan 
}

$ErrorActionPreference = 'Stop'

# ============================================
# 1. VALIDACIONES PREVIAS
# ============================================

Write-Title "VARO Bot - Configuración HTTPS"

Write-Step "Validando entorno..."

if (-not (Test-Path $ProjectRoot)) {
    Write-Error "Directorio de proyecto no encontrado: $ProjectRoot"
    exit 1
}

$backendPath = Join-Path $ProjectRoot "platform-backend"
$envFile = Join-Path $backendPath ".env"

if (-not (Test-Path $backendPath)) {
    Write-Error "Backend no encontrado en: $backendPath"
    exit 1
}

Write-Success "Proyecto encontrado"

# ============================================
# 2. MODO DESARROLLO (AUTOFIRMADO)
# ============================================

if ($Mode -eq 'dev') {
    Write-Title "MODO DESARROLLO - Certificados Autofirmados"
    
    Write-Step "Generando certificados autofirmados..."
    
    $scriptPath = Join-Path $ProjectRoot "setup-ssl-selfsigned.ps1"
    if (Test-Path $scriptPath) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath
    } else {
        Write-Error "Script de certificados no encontrado: $scriptPath"
        exit 1
    }
    
    Write-Step "Configurando .env para modo desarrollo..."
    
    $envContent = @"
NODE_ENV=development
ENABLE_SSL=false
PORT=4000
DATABASE_URL=mysql://root:@localhost:3306/wppconnect
"@

    Set-Content -Path $envFile -Value $envContent
    Write-Success ".env configurado"
    
    Write-Step "Compilando backend..."
    Push-Location $backendPath
    try {
        npm run build 2>&1 | Out-Null
        Write-Success "Backend compilado exitosamente"
    } catch {
        Write-Error "Error compilando backend: $_"
        exit 1
    } finally {
        Pop-Location
    }
    
    Write-Title "Configuración Completada"
    Write-Info "Modo: DESARROLLO (HTTP)"
    Write-Info "Backend: http://localhost:4000"
    Write-Info "Frontend: http://localhost:5173"
    Write-Info ""
    Write-Info "Para iniciar servicios ejecuta:"
    Write-Host "powershell -ExecutionPolicy Bypass -File $ProjectRoot\start-varo-services.ps1" -ForegroundColor Yellow
}

# ============================================
# 3. MODO PRODUCCIÓN (LET'S ENCRYPT)
# ============================================

elseif ($Mode -eq 'prod') {
    Write-Title "MODO PRODUCCIÓN - Let's Encrypt"
    
    # Validar parámetros
    if (-not $Domain) {
        $Domain = Read-Host "Ingresa el dominio (ej: altheavn.duckdns.org)"
    }
    
    if (-not $Email) {
        $Email = Read-Host "Ingresa tu email para renovación de certificados"
    }
    
    if (-not $Domain -or -not $Email) {
        Write-Error "Dominio y email son requeridos"
        exit 1
    }
    
    Write-Info "Dominio: $Domain"
    Write-Info "Email: $Email"
    Write-Info ""
    
    # Confirmar configuración
    $confirm = Read-Host "¿Deseas proceder? (s/n)"
    if ($confirm -ne 's' -and $confirm -ne 'S') {
        Write-Error "Operación cancelada"
        exit 0
    }
    
    Write-Step "Instalando certificado Let's Encrypt..."
    
    $scriptPath = Join-Path $ProjectRoot "setup-ssl-letsencrypt.ps1"
    if (Test-Path $scriptPath) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath
    } else {
        Write-Error "Script Let's Encrypt no encontrado: $scriptPath"
        exit 1
    }
    
    Write-Step "Configurando .env para modo producción..."
    
    $envContent = @"
NODE_ENV=production
ENABLE_SSL=true
DOMAIN_NAME=$Domain
GREENLOCK_CONFIG_DIR=./greenlock.d
STAGING=false
EMAIL=$Email
PORT=4000
DATABASE_URL=mysql://root:@localhost:3306/wppconnect
"@

    Set-Content -Path $envFile -Value $envContent
    Write-Success ".env configurado"
    
    Write-Step "Compilando backend..."
    Push-Location $backendPath
    try {
        npm run build 2>&1 | Out-Null
        Write-Success "Backend compilado exitosamente"
    } catch {
        Write-Error "Error compilando backend: $_"
        exit 1
    } finally {
        Pop-Location
    }
    
    Write-Title "Configuración Completada"
    Write-Info "Modo: PRODUCCIÓN (HTTPS)"
    Write-Info "Dominio: https://$Domain"
    Write-Info "Email: $Email"
    Write-Info "Certificados en: $backendPath\greenlock.d\"
    Write-Info ""
    Write-Info "Para iniciar servicios ejecuta:"
    Write-Host "powershell -ExecutionPolicy Bypass -File $ProjectRoot\start-varo-services.ps1" -ForegroundColor Yellow
}

Write-Host ""
Write-Info "Para más información, consulta: $ProjectRoot\HTTPS_SETUP_GUIDE.md"
Write-Host ""
