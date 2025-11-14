# 🔐 Instalar SSL con Caddy - Guía Paso a Paso

## ¿Qué es Caddy?

Caddy es un servidor web moderno que:

- ✅ Obtiene certificados SSL de Let's Encrypt **automáticamente**
- ✅ Los renueva automáticamente antes de expirar
- ✅ Funciona como reverse proxy (redirecciona tráfico)
- ✅ No requiere configuración compleja

## Requisitos Previos

- ✅ Puerto 80 abierto en router (para validación)
- ✅ Puerto 443 abierto en router (para HTTPS)
- ✅ Tu dominio `camarafarma.duckdns.org` debe apuntar a tu IP
- ✅ Backend corriendo en `http://localhost:4000`
- ✅ Socket.IO corriendo en `http://localhost:4001`

## Paso 1: Instalar Caddy

### Opción A: Usar Chocolatey (Si lo tienes)

```powershell
choco install caddy -y
```

### Opción B: Usar Scoop

```powershell
scoop install caddy
```

### Opción C: Descarga Manual

1. Visita: https://caddyserver.com/download
2. Selecciona "Windows" y "amd64"
3. Descarga `caddy_windows_amd64.exe`
4. Extrae en una carpeta, ej: `C:\Caddy\`
5. Agrega `C:\Caddy\` al PATH:
   - Windows + X → Configuración del sistema
   - Variables de entorno
   - Variables del sistema → PATH
   - Agregar: `C:\Caddy\`
   - Reinicia la terminal

## Paso 2: Verificar Instalación

```powershell
caddy version
```

Deberías ver algo como: `v2.7.6`

## Paso 3: Ejecutar Caddy

### Opción A: Desde PowerShell

```powershell
# Navega a la carpeta del proyecto
cd C:\wppconnect2

# Ejecuta Caddy
caddy run -config C:\wppconnect2\Caddyfile
```

### Opción B: Usar el Script

```powershell
# En PowerShell, ejecuta:
powershell -ExecutionPolicy Bypass -File C:\wppconnect2\instalar-caddy.ps1
```

### Opción C: Usar el .bat

```cmd
C:\wppconnect2\instalar-caddy.bat
```

## Paso 4: Esperar a que Caddy Obtenga el Certificado

Verás en consola algo como:

```
admin.socat.enabled false
{"level":"info","ts":1700000000.000000,"logger":"tls","msg":"loading Caddy configuration","config_file":"C:\\wppconnect2\\Caddyfile","config_adapter":"caddyfile"}
{"level":"info","ts":1700000000.000000,"logger":"http","msg":"enabling HTTP/3 listener only for this site"}
{"level":"info","ts":1700000000.000000,"logger":"http.handlers.subroute","msg":"added handler","handler":"subroute"}
...
{"level":"info","ts":1700000000.000000,"logger":"tls.issuance.acme.acme_client","msg":"cleaning up","subdomain":"_acme-challenge","server":"camarafarma.duckdns.org"}
🔐 SSL activo en camarafarma.duckdns.org
```

¡Eso significa que tu certificado se obtuvo exitosamente!

## Paso 5: Verificar que Funciona

Abre tu navegador y visita:

```
https://camarafarma.duckdns.org
```

Deberías ver: `🔐 SSL activo en camarafarma.duckdns.org`

Y sin warnings de certificado inválido ✅

## Paso 6: Probar APIs

```bash
# Frontend (login)
https://camarafarma.duckdns.org:2107/login

# API
https://camarafarma.duckdns.org/api/conversations

# Socket.IO
https://camarafarma.duckdns.org/socket.io/
```

## Estructura después de instalar

```
C:\wppconnect2\
├── Caddyfile                 ← Configuración de Caddy
├── instalar-caddy.ps1        ← Script PowerShell
├── instalar-caddy.bat        ← Script Batch
├── .caddy/                   ← Carpeta con certificados (se crea automáticamente)
├── platform-backend/         ← Tu backend (localhost:4000)
└── platform-frontend/        ← Tu frontend (localhost:5173)
```

## Solución de Problemas

### Error: "Puerto 80 ya está en uso"

```powershell
# Encuentra qué está usando el puerto 80
Get-NetTCPConnection -LocalPort 80

# Si es IIS, deténlo o cambia el puerto en Caddyfile
```

### Error: "No se pudo validar el dominio"

- Verifica que `camarafarma.duckdns.org` apunta a tu IP pública
- Verifica que el puerto 80 está abierto en tu router
- Espera 1-2 minutos, a veces DuckDNS tarda en propagar

### Error: "Certificate request failed"

- Verifica que tienes internet funcional
- Verifica que Let's Encrypt no está bloqueado en tu red
- Intenta cambiar a staging en Caddyfile (menos restrictivo)

## Usar Staging (Para Pruebas)

Si tienes muchos problemas, puedes usar certificados de prueba (válidos pero con warnings):

```caddyfile
camarafarma.duckdns.org {
	# Usar Let's Encrypt staging (para pruebas)
	acme_ca https://acme-staging-v02.api.letsencrypt.org/directory

	reverse_proxy /api localhost:4000
	reverse_proxy /socket.io localhost:4001
}
```

Luego cuando funcione, cambia a producción (quita esa línea).

## Mantener Caddy Corriendo

Para ejecutar Caddy como servicio en segundo plano:

### Opción 1: NSSM (Gestor de Servicios)

```powershell
# Instala NSSM
choco install nssm

# Crea un servicio de Caddy
nssm install CaddyServer caddy "run" "-config" "C:\wppconnect2\Caddyfile"

# Inicia el servicio
nssm start CaddyServer

# Detener el servicio
nssm stop CaddyServer
```

### Opción 2: Task Scheduler de Windows

1. Presiona Win + X
2. Selecciona "Administrador de tareas"
3. Ve a "Crear tarea"
4. Programa: `C:\Program Files\Caddy\caddy.exe`
5. Argumentos: `run -config C:\wppconnect2\Caddyfile`
6. Marca "Ejecutar con privilegios más altos"

## Próximos Pasos

1. ✅ Instala Caddy
2. ✅ Ejecuta Caddy (verás logs de certificado)
3. ✅ Verifica https://camarafarma.duckdns.org
4. ✅ Prueba el frontend en HTTPS
5. ✅ Configura como servicio para que inicie automáticamente

¿Tienes dudas? Ejecuta el script PowerShell y dame feedback si hay algún error.
