# 🚀 SSL/HTTPS - Instalación Inmediata

## TL;DR (Muy Rápido)

```powershell
# 1. Instala Caddy
choco install caddy -y

# 2. Ejecuta Caddy
caddy run -config C:\wppconnect2\Caddyfile

# 3. Espera este mensaje:
# 🔐 SSL activo en camarafarma.duckdns.org

# 4. Abre en navegador:
# https://camarafarma.duckdns.org
```

**¡Eso es todo!** SSL está listo ✅

---

## ¿Qué Acabo de Instalar?

**Caddy** es un servidor web que automáticamente:

1. **Obtiene certificado SSL** de Let's Encrypt (gratis)
2. **Lo renueva automáticamente** antes de expirar
3. **Redirige tu tráfico** desde puerto 80/443 → localhost:4000/4001
4. **Cifra todas las conexiones** HTTPS

---

## URLs Finales

| URL       | Antes                                     | Después                                     |
| --------- | ----------------------------------------- | ------------------------------------------- |
| API       | `http://camarafarma.duckdns.org:4001/api` | `https://camarafarma.duckdns.org/api`       |
| Socket.IO | `http://camarafarma.duckdns.org:4002`     | `https://camarafarma.duckdns.org/socket.io` |
| Frontend  | `http://camarafarma.duckdns.org:2107`     | `https://camarafarma.duckdns.org:2107`      |

---

## Actualizar URLs del Frontend

**Antes de instalar Caddy, actualiza el archivo `.env` del frontend:**

```env
# Cambiar de:
VITE_API_URL="http://camarafarma.duckdns.org:4001/api"
VITE_SOCKET_URL="http://camarafarma.duckdns.org:4001"

# A:
VITE_API_URL="https://camarafarma.duckdns.org/api"
VITE_SOCKET_URL="https://camarafarma.duckdns.org"
```

Luego compila:

```bash
npm run build
```

---

## Servicios que Deben Estar Corriendo

```
✅ Backend:  http://localhost:4000 (node dist/index.js)
✅ Frontend: http://localhost:5173 (npm run dev)
✅ Caddy:    caddy run -config Caddyfile
```

---

## Problemas Frecuentes

### "Caddy command not found"

```powershell
# Instala Caddy
choco install caddy -y

# Abre una nueva terminal
# (el PATH se actualiza)
```

### "Port 80 already in use"

```powershell
# Detén IIS o el servicio que usa puerto 80
Get-NetTCPConnection -LocalPort 80
```

### "Domain validation failed"

- Verifica que puertos 80 y 443 están abiertos en router
- Espera 1-2 minutos
- Verifica que `camarafarma.duckdns.org` resuelve correctamente

---

## Verificar que Funciona

```powershell
# Terminal 1: Inicia Caddy
caddy run -config C:\wppconnect2\Caddyfile

# Terminal 2: Prueba
curl https://camarafarma.duckdns.org

# Deberías ver:
# 🔐 SSL activo en camarafarma.duckdns.org
```

---

## Siguiente Paso

Lee uno de estos archivos según tu interés:

- `SSL_GUIA_RAPIDA.md` - Guía rápida completa
- `SSL_INSTALACION_CADDY.md` - Paso a paso detallado
- `SSL_SETUP_COMPLETO.md` - Información profunda
- `CONFIGURACION_ROUTER_PUERTOS.md` - Configuración de router

---

## Confirmación Visual

Después de ejecutar `caddy run`, verás algo como:

```
{"level":"info","ts":1730000000.000000,"logger":"admin.api","msg":"started admin listener","address":"127.0.0.1:2019","protocols":["h2c","http/1.1"]}
{"level":"info","ts":1730000000.000000,"logger":"tls","msg":"loading Caddy configuration","config_file":"C:\\wppconnect2\\Caddyfile"}
{"level":"info","ts":1730000000.000000,"logger":"http","msg":"enabling HTTP/3 listener only for this site"}
{"level":"info","ts":1730000000.000000,"logger":"http.handlers.subroute","msg":"added handler","handler":"subroute"}
{"level":"info","ts":1730000000.000000,"logger":"tls.obtain","msg":"certificate obtained successfully","identifier":"camarafarma.duckdns.org","ca":"https://acme-v02.api.letsencrypt.org/directory","uri":"https://acme-v02.api.letsencrypt.org/acme/cert/xxxxx"}
{"level":"info","ts":1730000000.000000,"logger":"tls","msg":"cleaning up"}
✅ Caddy started successfully
🔐 SSL activo en camarafarma.duckdns.org
```

**Cuando veas "🔐 SSL activo", ¡tu certificado está listo!** ✅

---

## Mantener Caddy Ejecutándose

Para que Caddy inicie automáticamente cuando reinicies tu PC:

### Opción 1: NSSM (Simple)

```powershell
choco install nssm
nssm install CaddyService caddy run -config C:\wppconnect2\Caddyfile
nssm start CaddyService
```

### Opción 2: Task Scheduler (Windows)

1. Win + R → `taskschd.msc`
2. Nueva tarea básica
3. Dispara en: "Al iniciar el sistema"
4. Ejecuta: `caddy run -config C:\wppconnect2\Caddyfile`
5. ✓ Ejecutar con privilegios

---

## Costo

💰 **$0** - Completamente gratis

- Caddy: Gratis (código abierto)
- Let's Encrypt: Gratis (certificados)
- Renovación automática: Gratis

---

## ¿Qué Viene Después?

✅ SSL/HTTPS está configurado
✅ Certificado automático y renovación
✅ URLs HTTPS funcionales
✅ Aplicación lista para producción

**Próxima fase: Monitoreo y optimizaciones (si lo necesitas)**

---

## Comienza Ahora

```powershell
# Paso 1: Instala
choco install caddy -y

# Paso 2: Ejecuta
caddy run -config C:\wppconnect2\Caddyfile

# Paso 3: Abre navegador
# https://camarafarma.duckdns.org

# ¡Listo! 🎉
```

---

**¿Preguntas? Revisa los archivos .md en la carpeta raíz**
