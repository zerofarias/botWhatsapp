# ✅ SSL/HTTPS - Guía Rápida

## 📋 Resumen

Tu aplicación ya está lista para HTTPS. Solo necesitas instalar **Caddy** como reverse proxy que automáticamente:

- Obtiene certificados de Let's Encrypt
- Los renueva automáticamente
- Maneja HTTPS en puerto 443

## ⚡ Pasos Rápidos

### 1️⃣ Abre Puertos en tu Router

Solo necesitas abrir estos 2 puertos (ya abiertos probablemente):

| Puerto  | Tipo | Propósito                 |
| ------- | ---- | ------------------------- |
| **80**  | TCP  | Validación de certificado |
| **443** | TCP  | HTTPS seguro              |

### 2️⃣ Instala Caddy

**Opción recomendada: Chocolatey**

```powershell
choco install caddy -y
```

Si no tienes Chocolatey, elige otra opción en `SSL_INSTALACION_CADDY.md`

### 3️⃣ Ejecuta Caddy

```powershell
cd C:\wppconnect2
caddy run -config C:\wppconnect2\Caddyfile
```

Espera a ver este mensaje:

```
🔐 SSL activo en camarafarma.duckdns.org
```

### 4️⃣ Prueba en Navegador

```
https://camarafarma.duckdns.org
```

✅ Sin warnings de certificado inválido

## 📁 Archivos Creados

- `Caddyfile` - Configuración de Caddy (ya configurada)
- `SSL_INSTALACION_CADDY.md` - Guía detallada
- `CONFIGURACION_ROUTER_PUERTOS.md` - Actualizado con Caddy
- `instalar-caddy.ps1` - Script PowerShell
- `instalar-caddy.bat` - Script Batch

## 🌐 URLs después de instalar Caddy

```
Producción (HTTPS):
├─ Frontend:  https://camarafarma.duckdns.org:2107
├─ API:       https://camarafarma.duckdns.org/api
└─ Socket.IO: https://camarafarma.duckdns.org/socket.io

Desarrollo local (HTTP):
├─ Frontend:  http://localhost:5173
├─ API:       http://localhost:4000/api
└─ Socket.IO: http://localhost:4001
```

## 🔄 Arquitectura

```
Internet (HTTPS en puerto 443)
    ↓
Caddy (Certificate automático + Reverse Proxy)
    ↓
├─ Backend    (localhost:4000)
├─ Socket.IO  (localhost:4001)
└─ Firewall de Windows (abiertos para localhost)
```

## ✨ Ventajas

✅ Certificado SSL válido
✅ Sin warnings en navegador
✅ Renovación automática
✅ Configuración automática
✅ Muy simple de instalar

## 🆘 Si Tienes Problemas

Lee `SSL_INSTALACION_CADDY.md` → Sección "Solución de Problemas"

## 📌 Checklist Final

- [ ] Puertos 80 y 443 abiertos en router
- [ ] Caddy instalado (`caddy version`)
- [ ] Ejecutar: `caddy run -config C:\wppconnect2\Caddyfile`
- [ ] Esperar mensaje: "🔐 SSL activo"
- [ ] Probar: `https://camarafarma.duckdns.org`
- [ ] ✅ ¡Certificado instalado!

## 🚀 Próximos Pasos

1. Instala Caddy (paso 2 arriba)
2. Ejecuta Caddy (paso 3 arriba)
3. Prueba en navegador (paso 4 arriba)
4. Lee `SSL_INSTALACION_CADDY.md` para hacer que Caddy inicie automáticamente

¿Necesitas ayuda? Mensajea después de ejecutar `caddy run`
