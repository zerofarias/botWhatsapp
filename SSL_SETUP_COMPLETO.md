# 🔐 SSL/HTTPS - Setup Completo para Producción

## Estado Actual

```
✅ Backend: http://localhost:4000 (corriendo)
✅ Socket.IO: http://localhost:4001 (corriendo)
✅ Frontend: http://localhost:5173 (Vite dev server)
✅ Puertos abiertos en router: 80, 443 (para Caddy)
✅ Dominio: camarafarma.duckdns.org
⏳ SSL: Pendiente de instalar Caddy
```

## Solución: Caddy + Let's Encrypt

### ¿Por qué Caddy?

| Solución               | Complejidad         | Costo  | SSL Automático | Renovación    |
| ---------------------- | ------------------- | ------ | -------------- | ------------- |
| **Caddy**              | ⭐ Muy Simple       | Gratis | ✅ Sí          | ✅ Automática |
| Nginx + Certbot        | ⭐⭐ Complejo       | Gratis | ✅ Sí          | ✅ Automática |
| Greenlock Express      | ⭐⭐⭐ Muy Complejo | Gratis | ✅ Sí          | ✅ Automática |
| Manuales Let's Encrypt | ⭐⭐ Complejo       | Gratis | ⚠️ Manual      | ⚠️ Manual     |

**Caddy es la mejor opción para tu caso**

## Instalación Completa

### Paso 1: Instalar Caddy

```powershell
# Opción A: Chocolatey (recomendado)
choco install caddy -y

# Opción B: Scoop
scoop install caddy

# Opción C: Descarga manual
# Visita https://caddyserver.com/download
# Descarga caddy_windows_amd64.exe
# Extrae en C:\Caddy
# Agrega C:\Caddy al PATH
```

Verifica:

```powershell
caddy version
```

### Paso 2: Asegúrate que Caddy esté en PATH

```powershell
# En PowerShell
$env:PATH
```

Debe contener la carpeta de Caddy.

### Paso 3: Inicia Caddy

```powershell
cd C:\wppconnect2
caddy run -config C:\wppconnect2\Caddyfile
```

**Espera a ver estos logs:**

```
admin.socat.enabled false
{"level":"info","ts":1700000000.000000,"logger":"tls","msg":"loading..."}
{"level":"info","ts":1700000000.000000,"logger":"tls.obtain","msg":"certificate obtained successfully"}
🔐 SSL activo en camarafarma.duckdns.org
```

Eso significa que **tu certificado fue obtenido exitosamente** ✅

### Paso 4: Verifica en Navegador

```
https://camarafarma.duckdns.org
```

Deberías ver: `🔐 SSL activo en camarafarma.duckdns.org`

**¡Sin warnings de certificado!** ✅

## Arquitectura Final

```
┌─────────────────────────────────────────────┐
│         Internet (HTTPS)                    │
│     https://camarafarma.duckdns.org         │
└──────────────┬──────────────────────────────┘
               │ Puerto 80 (HTTP → Validación)
               │ Puerto 443 (HTTPS)
               ▼
┌─────────────────────────────────────────────┐
│          Caddy Server                       │
│  (Reverse Proxy + SSL Let's Encrypt)        │
│  Puertos: 80, 443                           │
│  Configfile: C:\wppconnect2\Caddyfile       │
└──────────────┬──────────────────────────────┘
               │
        ┌──────┴────────────────┬──────────────┐
        ▼                       ▼              ▼
    /api/* → localhost:4000  /socket.io → localhost:4001  / → Status
    Backend API              WebSockets                    Check
```

## URLs de Acceso

### Desde Navegador

```
# Acceso público seguro (HTTPS)
https://camarafarma.duckdns.org                    → Status page
https://camarafarma.duckdns.org/api/conversations   → Backend API
https://camarafarma.duckdns.org:2107               → Frontend
https://camarafarma.duckdns.org/socket.io/         → Socket.IO test
```

### Desde localhost (desarrollo)

```
# Acceso local (HTTP)
http://localhost:5173                → Frontend Vite
http://localhost:4000/api/*          → Backend API
http://localhost:4001                → Socket.IO
```

## Configuración de Caddy (Caddyfile)

Ya está configurado en `C:\wppconnect2\Caddyfile`:

```caddyfile
camarafarma.duckdns.org {
	# Reverse proxy para API REST
	reverse_proxy /api localhost:4000 {
		header_uri /api /api
	}

	# Reverse proxy para Socket.IO
	reverse_proxy /socket.io localhost:4001 {
		header_uri /socket.io /socket.io
		header_up Connection *
		header_up Upgrade websocket
	}

	# Página de verificación
	respond / "🔐 SSL activo en camarafarma.duckdns.org"
}
```

## Certificado Let's Encrypt

Caddy automáticamente:

1. **Solicita certificado** a Let's Encrypt
2. **Valida dominio** mediante challenge HTTP-01
3. **Obtiene certificado** (generalmente en < 1 minuto)
4. **Lo almacena** en: `%APPDATA%\Caddy` o `./caddy`
5. **Lo renueva** 60 días antes de expirar

**No haces nada, sucede automáticamente** ✅

## Carpeta de Certificados

Los certificados se guardan automáticamente en:

```
Windows: %APPDATA%\Caddy\
O: C:\Users\TuUsuario\AppData\Roaming\Caddy\
```

Estructura:

```
Caddy/
├── certificates/
│   ├── acme-v02.api.letsencrypt.org-directory/
│   │   └── camarafarma.duckdns.org/
│   │       ├── camarafarma.duckdns.org.crt
│   │       ├── camarafarma.duckdns.org.key
│   │       └── camarafarma.duckdns.org.json
│   └── ...
└── ...
```

## Hacer Caddy un Servicio Windows

Para que Caddy inicie automáticamente:

### Opción 1: NSSM

```powershell
# Instala NSSM
choco install nssm

# Crea el servicio
nssm install CaddyService caddy run -config C:\wppconnect2\Caddyfile

# Inicia el servicio
nssm start CaddyService

# Detén el servicio
nssm stop CaddyService

# Desinstala (si lo necesitas)
nssm remove CaddyService confirm
```

### Opción 2: Task Scheduler

1. Presiona `Win + R`
2. Escribe: `taskschd.msc`
3. Haz clic en "Crear tarea básica"
4. Nombre: `Caddy Server`
5. Disparador: "Al iniciar el sistema"
6. Acción:
   - Programa: `C:\Program Files\chocolateyinstall\lib\caddy\tools\caddy.exe`
   - Argumentos: `run -config C:\wppconnect2\Caddyfile`
7. Marca: "Ejecutar con privilegios más altos"
8. OK

## Solución de Problemas

### Puerto 80 ya está en uso

```powershell
# Encuentra qué está usando puerto 80
Get-NetTCPConnection -LocalPort 80
```

Soluciones:

- Detén el servicio que lo usa
- Cambia puerto en Caddyfile (no recomendado)

### "Certificate request failed"

- Verifica que el puerto 80 está abierto en router
- Verifica que `camarafarma.duckdns.org` resuelve a tu IP:
  ```powershell
  nslookup camarafarma.duckdns.org
  ```
- Espera 1-2 minutos, a veces tarda

### "domain not validated"

- Verifica que la validación DNS está correcta
- Revisa logs de Caddy: busca "validation"
- Intenta acceder a `http://camarafarma.duckdns.org:80/`

### "ACME challenge failed"

- Generalmente es problema de validación
- Verifica que tu firewall no bloquea Let's Encrypt
- Usa staging si tienes muchos intentos fallidos

## Usar Staging (para pruebas)

Si tienes problemas, usa certificados de prueba:

```caddyfile
camarafarma.duckdns.org {
	# Let's Encrypt Staging (para pruebas, evita limits)
	acme_ca https://acme-staging-v02.api.letsencrypt.org/directory

	reverse_proxy /api localhost:4000
	reverse_proxy /socket.io localhost:4001
}
```

Luego cuando funcione, quita esa línea para producción.

## Verificación Final

```powershell
# 1. Caddy corriendo
caddy version

# 2. Caddy con config
caddy validate -config C:\wppconnect2\Caddyfile

# 3. Backend respondiendo
curl http://localhost:4000/api/conversations

# 4. Caddy reverse proxy (en otra terminal)
curl https://camarafarma.duckdns.org/api/conversations

# 5. Frontend
https://camarafarma.duckdns.org:2107
```

## Checklist Completo

- [ ] Puertos 80 y 443 abiertos en router
- [ ] Caddy instalado (`caddy version` funciona)
- [ ] Caddyfile en `C:\wppconnect2\`
- [ ] Backend corriendo en `http://localhost:4000`
- [ ] Ejecutar: `caddy run -config C:\wppconnect2\Caddyfile`
- [ ] Ver: "🔐 SSL activo en camarafarma.duckdns.org"
- [ ] Probar: `https://camarafarma.duckdns.org`
- [ ] Ver certificado válido (sin warnings)
- [ ] Probar frontend: `https://camarafarma.duckdns.org:2107`
- [ ] Probar API: `https://camarafarma.duckdns.org/api/conversations`

## Después de SSL

Tu aplicación ahora es:

✅ **Segura**: HTTPS con certificado válido
✅ **Confiable**: Certificado de Let's Encrypt reconocido
✅ **Automática**: Renovación de certificado automática
✅ **Escalable**: Caddy maneja múltiples dominios
✅ **Professional**: Listo para producción

## Documentos Relacionados

- `SSL_INSTALACION_CADDY.md` - Guía detallada paso a paso
- `CONFIGURACION_ROUTER_PUERTOS.md` - Setup de puertos (actualizado)
- `SSL_GUIA_RAPIDA.md` - Quick start
- `SSL_GUIA_COMPLETA.md` - Comparación de opciones

## Soporte

Si tienes problemas:

1. Lee el documento de "Solución de Problemas" arriba
2. Revisa los logs de Caddy (mensajes en consola)
3. Verifica que los puertos estén abiertos en router
4. Asegúrate que tu dominio resuelve correctamente

¿Ejecutamos Caddy ahora? 🚀
