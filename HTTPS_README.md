# 🔒 HTTPS - VARO Bot

## Scripts de Configuración

### 1. **configure-https.ps1** ⭐ RECOMENDADO
Script maestro que gestiona todo el proceso HTTPS de forma interactiva.

**Modo Desarrollo (Autofirmado):**
```powershell
powershell -ExecutionPolicy Bypass -File "configure-https.ps1" -Mode dev
```

**Modo Producción (Let's Encrypt):**
```powershell
powershell -ExecutionPolicy Bypass -File "configure-https.ps1" -Mode prod -Domain altheavn.duckdns.org -Email tu@email.com
```

**Qué hace:**
- ✅ Genera/instala certificados
- ✅ Configura archivo .env
- ✅ Recompila backend
- ✅ Muestra instrucciones de siguiente paso

---

### 2. **setup-ssl-selfsigned.ps1**
Script individual para certificados autofirmados.

```powershell
powershell -ExecutionPolicy Bypass -File "setup-ssl-selfsigned.ps1"
```

**Parámetros:**
- `-Subject`: Nombre del certificado (default: "VARO Bot Certificate")
- `-DaysValid`: Días de validez (default: 365)
- `-CertPath`: Ruta de salida (default: ./certs)

**Crea:**
- `certs/varo-bot-cert.crt` - Certificado público
- `certs/varo-bot-cert.key` - Clave privada
- `certs/varo-bot-cert.pem` - Formato combinado

---

### 3. **setup-ssl-letsencrypt.ps1**
Script individual para certificados Let's Encrypt.

```powershell
powershell -ExecutionPolicy Bypass -File "setup-ssl-letsencrypt.ps1"
```

**Parámetros (interactivos):**
- Dominio
- Email
- Modo staging (para pruebas)

**Crea:**
```
greenlock.d/
├── accounts/ (datos de cuenta)
├── certs/ (certificados)
└── renewal/ (configuración automática)
```

**Características:**
- Renovación automática 60 días antes de vencimiento
- Tarea de Windows Scheduler para renovación diaria
- Redireccionamiento HTTP → HTTPS

---

### 4. **setup-https.ps1**
Script interactivo con instrucciones paso a paso.

```powershell
powershell -ExecutionPolicy Bypass -File "setup-https.ps1"
```

Muestra opciones y guía al usuario a través de cada paso.

---

## Guías Rápidas

### ⚡ Desarrollo Rápido (5 minutos)
```powershell
# 1. Ejecuta el script
powershell -ExecutionPolicy Bypass -File "configure-https.ps1" -Mode dev

# 2. Reinicia servicios
powershell -ExecutionPolicy Bypass -File "start-varo-services.ps1"

# 3. Accede
# Backend: http://localhost:4000
# Frontend: http://localhost:5173
```

### 🚀 Producción (10 minutos)
```powershell
# 1. Asegúrate que el dominio resuelva tu IP
nslookup altheavn.duckdns.org

# 2. Configura HTTPS
powershell -ExecutionPolicy Bypass -File "configure-https.ps1" -Mode prod `
  -Domain altheavn.duckdns.org -Email tu@email.com

# 3. Reinicia servicios
powershell -ExecutionPolicy Bypass -File "start-varo-services.ps1"

# 4. Accede
# https://altheavn.duckdns.org
```

---

## Configuración Manual (Avanzado)

### Editar .env Backend

**Desarrollo (HTTP):**
```env
NODE_ENV=development
ENABLE_SSL=false
PORT=4000
```

**Producción (HTTPS):**
```env
NODE_ENV=production
ENABLE_SSL=true
DOMAIN_NAME=altheavn.duckdns.org
GREENLOCK_CONFIG_DIR=./greenlock.d
STAGING=false
EMAIL=tu@email.com
PORT=4000
```

### Recompila y Reinicia
```powershell
cd platform-backend
npm run build
cd ..
powershell -ExecutionPolicy Bypass -File "start-varo-services.ps1"
```

---

## Verificación

### ✅ HTTP (Desarrollo)
```powershell
# Backend
Invoke-WebRequest -Uri "http://localhost:4000/api/health" -ErrorAction SilentlyContinue

# Frontend
Invoke-WebRequest -Uri "http://localhost:5173" -ErrorAction SilentlyContinue
```

### ✅ HTTPS (Producción)
```powershell
# Permite certificados autofirmados/Let's Encrypt
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Verifica certificado
Invoke-WebRequest -Uri "https://altheavn.duckdns.org:443" `
  -SkipCertificateCheck -ErrorAction SilentlyContinue
```

---

## Troubleshooting

### ❌ "Access Denied" ejecutando scripts
```powershell
# Ejecuta como administrador
Start-Process powershell -Verb RunAs

# Luego ejecuta el script
powershell -ExecutionPolicy Bypass -File "configure-https.ps1" -Mode dev
```

### ❌ "Port X already in use"
```powershell
# Encuentra el proceso
netstat -ano | findstr ":<puerto>"

# Termina el proceso (reemplaza <PID>)
Stop-Process -Id <PID> -Force

# Ejemplo para puerto 4000:
netstat -ano | findstr ":4000" | ForEach-Object {
    $PID = $_.Split()[-1]
    Write-Host "Terminando proceso PID $PID"
    Stop-Process -Id $PID -Force -ErrorAction SilentlyContinue
}
```

### ❌ "npm: command not found"
Asegúrate que Node.js está instalado:
```powershell
node --version
npm --version
```

### ❌ Certificado Let's Encrypt falla
```powershell
# 1. Verifica el dominio
nslookup altheavn.duckdns.org

# 2. Verifica puertos 80 y 443
netstat -ano | findstr ":80"
netstat -ano | findstr ":443"

# 3. Intenta modo staging primero
# Edita setup-ssl-letsencrypt.ps1 y establece STAGING=true
```

### ❌ "Your connection is not private" (Autofirmado)
Esto es **normal** para certificados autofirmados.
- Haz clic en "Advanced"
- Selecciona "Proceed to localhost"

---

## Monitoreo

### Logs de Servicios
```powershell
# Backend
Get-Content "platform-backend/dist/*.log" -Tail 50

# Frontend
Get-EventLog -LogName "Application" -Source "npm" | Select -Last 50
```

### Estado de Certificados

**Autofirmado:**
```powershell
dir certs/
Get-Item certs/*.crt | Select Name, LastWriteTime, Length
```

**Let's Encrypt:**
```powershell
dir greenlock.d/certs/ -Recurse
Get-EventLog -LogName "System" -Source "Task Scheduler" | 
  Where { $_.Message -like "*greenlock*" } | Select -Last 10
```

### Renovación Automática (Let's Encrypt)
```powershell
# Ver tarea programada
Get-ScheduledTask | Where { $_.TaskName -like "*greenlock*" }

# Ver historial de renovaciones
Get-EventLog -LogName "System" -Source "Task Scheduler" | 
  Where { $_.EventID -eq 201 } | Select -Last 20
```

---

## Próximos Pasos

1. **Elige modo:** Desarrollo o Producción
2. **Ejecuta:** `configure-https.ps1`
3. **Espera:** Completación del script
4. **Reinicia:** `start-varo-services.ps1`
5. **Verifica:** Accede desde navegador

---

## Referencia Rápida

| Tarea | Comando |
|------|---------|
| **Configurar HTTPS (Dev)** | `powershell -ExecutionPolicy Bypass -File "configure-https.ps1" -Mode dev` |
| **Configurar HTTPS (Prod)** | `powershell -ExecutionPolicy Bypass -File "configure-https.ps1" -Mode prod -Domain altheavn.duckdns.org -Email tu@email.com` |
| **Generar Autofirmado** | `powershell -ExecutionPolicy Bypass -File "setup-ssl-selfsigned.ps1"` |
| **Instalar Let's Encrypt** | `powershell -ExecutionPolicy Bypass -File "setup-ssl-letsencrypt.ps1"` |
| **Iniciar Servicios** | `powershell -ExecutionPolicy Bypass -File "start-varo-services.ps1"` |
| **Ver Puertos Activos** | `netstat -ano \| findstr ":4000"` |
| **Terminar Proceso** | `Stop-Process -Id <PID> -Force` |

---

**🔒 Tu VARO Bot está listo para HTTPS. Elige tu configuración y comienza!**
