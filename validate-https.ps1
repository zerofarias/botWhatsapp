#!/usr/bin/env powershell
<#
.SYNOPSIS
    Validador de Configuración HTTPS - VARO Bot
    
.DESCRIPTION
    Realiza diagnóstico completo del estado HTTPS:
    - Certificados generados
    - Puertos disponibles
    - Configuración de .env
    - Estado de servicios
    - Conectividad
#>

param(
    [string]$ProjectRoot = 'C:\wppconnect2'
)

# ============================================
# CONFIGURACIÓN
# ============================================

$backendPath = Join-Path $ProjectRoot "platform-backend"
$envFile = Join-Path $backendPath ".env"
$certsDir = Join-Path $ProjectRoot "certs"
$greenlockDir = Join-Path $backendPath "greenlock.d"

# Colores
$colors = @{
    Title = 'Cyan'
    Success = 'Green'
    Warning = 'Yellow'
    Error = 'Red'
    Info = 'Cyan'
}

function Print-Title {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor $colors.Title
    Write-Host "║   VALIDADOR HTTPS - VARO Bot             ║" -ForegroundColor $colors.Title
    Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor $colors.Title
    Write-Host ""
}

function Print-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "┌─ $Title" -ForegroundColor $colors.Info
    Write-Host "├" -ForegroundColor $colors.Info
}

function Print-Item {
    param([string]$Name, [string]$Value, [string]$Status)
    
    $statusColor = switch ($Status) {
        '✅' { $colors.Success }
        '⚠️' { $colors.Warning }
        '❌' { $colors.Error }
        default { 'Gray' }
    }
    
    Write-Host "│ $Status  $Name`: $Value" -ForegroundColor $statusColor
}

function Print-End {
    Write-Host "└" -ForegroundColor $colors.Info
}

# ============================================
# INICIO
# ============================================

Print-Title

# ============================================
# 1. CERTIFICADOS
# ============================================

Print-Section "CERTIFICADOS"

# Verificar autofirmados
$selfSignedExists = @(
    (Test-Path "$certsDir/varo-bot-cert.crt"),
    (Test-Path "$certsDir/varo-bot-cert.key"),
    (Test-Path "$certsDir/varo-bot-cert.pem")
) | Where-Object { $_ } | Measure-Object | Select-Object -ExpandProperty Count

if ($selfSignedExists -eq 3) {
    Print-Item "Certificados autofirmados" "Encontrados" "✅"
    $certInfo = Get-Item "$certsDir/varo-bot-cert.crt" -ErrorAction SilentlyContinue
    if ($certInfo) {
        Print-Item "  ↳ Tamaño" "$([math]::Round($certInfo.Length/1024, 2)) KB" "ℹ️"
        Print-Item "  ↳ Modificado" $certInfo.LastWriteTime "ℹ️"
    }
} elseif ($selfSignedExists -gt 0) {
    Print-Item "Certificados autofirmados" "Incompletos ($selfSignedExists/3)" "⚠️"
} else {
    Print-Item "Certificados autofirmados" "No encontrados" "❌"
}

# Verificar Let's Encrypt
if (Test-Path "$greenlockDir/certs") {
    $certCount = @(Get-ChildItem "$greenlockDir/certs" -Recurse -Filter "*.pem" -ErrorAction SilentlyContinue) | Measure-Object | Select-Object -ExpandProperty Count
    Print-Item "Certificados Let's Encrypt" "Encontrados ($certCount archivos)" "✅"
    
    $latestCert = Get-ChildItem "$greenlockDir/certs" -Recurse -Filter "*.pem" -ErrorAction SilentlyContinue | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -First 1
    
    if ($latestCert) {
        Print-Item "  ↳ Más reciente" $latestCert.LastWriteTime "ℹ️"
    }
} else {
    Print-Item "Certificados Let's Encrypt" "No encontrados" "❌"
}

Print-End

# ============================================
# 2. CONFIGURACIÓN .ENV
# ============================================

Print-Section "CONFIGURACIÓN"

if (Test-Path $envFile) {
    Print-Item "Archivo .env" "Existe" "✅"
    
    $envContent = Get-Content $envFile | Where-Object { $_ -and -not $_.StartsWith('#') }
    
    $enableSsl = $envContent | Where-Object { $_ -like "ENABLE_SSL=*" }
    if ($enableSsl) {
        $sslValue = $enableSsl.Split('=')[1]
        Print-Item "  ↳ ENABLE_SSL" $sslValue "ℹ️"
    }
    
    $nodEnv = $envContent | Where-Object { $_ -like "NODE_ENV=*" }
    if ($nodEnv) {
        $envValue = $nodEnv.Split('=')[1]
        Print-Item "  ↳ NODE_ENV" $envValue "ℹ️"
    }
    
    $port = $envContent | Where-Object { $_ -like "PORT=*" }
    if ($port) {
        $portValue = $port.Split('=')[1]
        Print-Item "  ↳ PORT" $portValue "ℹ️"
    }
    
    $domain = $envContent | Where-Object { $_ -like "DOMAIN_NAME=*" }
    if ($domain) {
        $domainValue = $domain.Split('=')[1]
        Print-Item "  ↳ DOMAIN_NAME" $domainValue "ℹ️"
    }
} else {
    Print-Item "Archivo .env" "No encontrado" "⚠️"
}

Print-End

# ============================================
# 3. PUERTOS
# ============================================

Print-Section "PUERTOS"

$ports = @(80, 443, 4000, 5173)

foreach ($port in $ports) {
    $connection = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    
    if ($connection.TcpTestSucceeded) {
        Print-Item "Puerto $port" "EN USO" "⚠️"
        
        $processInfo = netstat -ano -ErrorAction SilentlyContinue | 
            Select-String ":$port " | 
            Select-Object -First 1
        
        if ($processInfo) {
            $parts = $processInfo -split '\s+' | Where-Object { $_ }
            if ($parts.Count -gt 4) {
                $pid = $parts[-1]
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    Print-Item "  ↳ Proceso" "$($process.Name) (PID: $pid)" "ℹ️"
                }
            }
        }
    } else {
        Print-Item "Puerto $port" "Disponible" "✅"
    }
}

Print-End

# ============================================
# 4. SERVICIOS
# ============================================

Print-Section "SERVICIOS"

# Backend
$backendProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | 
    Where-Object { $_.CommandLine -like "*platform-backend*" } | 
    Select-Object -First 1

if ($backendProcess) {
    Print-Item "Backend" "Ejecutándose (PID: $($backendProcess.Id))" "✅"
    Print-Item "  ↳ Memoria" "$([math]::Round($backendProcess.WorkingSet/1MB, 2)) MB" "ℹ️"
} else {
    Print-Item "Backend" "No ejecutándose" "❌"
}

# Frontend
$frontendProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | 
    Where-Object { $_.CommandLine -like "*platform-frontend*" } | 
    Select-Object -First 1

if ($frontendProcess) {
    Print-Item "Frontend" "Ejecutándose (PID: $($frontendProcess.Id))" "✅"
    Print-Item "  ↳ Memoria" "$([math]::Round($frontendProcess.WorkingSet/1MB, 2)) MB" "ℹ️"
} else {
    Print-Item "Frontend" "No ejecutándose" "❌"
}

Print-End

# ============================================
# 5. CONECTIVIDAD
# ============================================

Print-Section "CONECTIVIDAD"

# Backend HTTP
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/health" `
        -ErrorAction SilentlyContinue -WarningAction SilentlyContinue -TimeoutSec 3
    if ($response.StatusCode -eq 200) {
        Print-Item "Backend HTTP" "Respondiendo" "✅"
    }
} catch {
    Print-Item "Backend HTTP" "No responde" "❌"
}

# Backend HTTPS
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $response = Invoke-WebRequest -Uri "https://localhost:4000/api/health" `
        -SkipCertificateCheck -ErrorAction SilentlyContinue -WarningAction SilentlyContinue -TimeoutSec 3
    if ($response.StatusCode -eq 200) {
        Print-Item "Backend HTTPS" "Respondiendo" "✅"
    }
} catch {
    Print-Item "Backend HTTPS" "No responde" "⚠️"
}

# Frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" `
        -ErrorAction SilentlyContinue -WarningAction SilentlyContinue -TimeoutSec 3
    if ($response.StatusCode -eq 200) {
        Print-Item "Frontend" "Respondiendo" "✅"
    }
} catch {
    Print-Item "Frontend" "No responde" "❌"
}

Print-End

# ============================================
# 6. COMPILACIÓN
# ============================================

Print-Section "COMPILACIÓN"

$distPath = Join-Path $backendPath "dist"
if (Test-Path "$distPath/index.js") {
    $fileInfo = Get-Item "$distPath/index.js"
    Print-Item "Backend compilado" "Sí" "✅"
    Print-Item "  ↳ Tamaño" "$([math]::Round($fileInfo.Length/1024, 2)) KB" "ℹ️"
    Print-Item "  ↳ Modificado" $fileInfo.LastWriteTime "ℹ️"
} else {
    Print-Item "Backend compilado" "No" "❌"
}

$frontendDistPath = Join-Path $ProjectRoot "platform-frontend" "dist"
if (Test-Path "$frontendDistPath/index.html") {
    $fileInfo = Get-Item "$frontendDistPath/index.html"
    Print-Item "Frontend compilado" "Sí" "✅"
    Print-Item "  ↳ Modificado" $fileInfo.LastWriteTime "ℹ️"
} else {
    Print-Item "Frontend compilado" "No" "❌"
}

Print-End

# ============================================
# 7. RESUMEN Y RECOMENDACIONES
# ============================================

Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor $colors.Title
Write-Host "║   RESUMEN                                ║" -ForegroundColor $colors.Title
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor $colors.Title
Write-Host ""

$issues = @()

if (-not (Test-Path "$certsDir/varo-bot-cert.crt") -and -not (Test-Path "$greenlockDir/certs")) {
    $issues += "⚠️  No hay certificados SSL configurados"
}

if (-not $backendProcess) {
    $issues += "⚠️  Backend no está ejecutándose"
}

if (-not $frontendProcess) {
    $issues += "⚠️  Frontend no está ejecutándose"
}

if ($issues.Count -eq 0) {
    Write-Host "✅ Configuración HTTPS: CORRECTA" -ForegroundColor $colors.Success
    Write-Host ""
    Write-Host "Todo está correctamente configurado. Puedes acceder:" -ForegroundColor $colors.Success
    Write-Host "   • Frontend: http://localhost:5173" -ForegroundColor Gray
    Write-Host "   • Backend: http://localhost:4000" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Configuración HTTPS: CON PROBLEMAS" -ForegroundColor $colors.Warning
    Write-Host ""
    Write-Host "Problemas detectados:" -ForegroundColor $colors.Warning
    foreach ($issue in $issues) {
        Write-Host "   $issue" -ForegroundColor $colors.Warning
    }
}

Write-Host ""
Write-Host "Para configurar HTTPS:" -ForegroundColor $colors.Info
Write-Host "   powershell -ExecutionPolicy Bypass -File 'configure-https.ps1' -Mode dev" -ForegroundColor Gray
Write-Host "   powershell -ExecutionPolicy Bypass -File 'configure-https.ps1' -Mode prod -Domain altheavn.duckdns.org -Email tu@email.com" -ForegroundColor Gray
Write-Host ""
Write-Host "Para más información: consulta HTTPS_README.md" -ForegroundColor $colors.Info
Write-Host ""
