# 🔧 Configuración de Puertos en el Router + SSL

## ⭐ NUEVA ARQUITECTURA CON CADDY + SSL

Ahora que tienes SSL configurado con Caddy, la arquitectura es más simple:

```
📱 Internet (Externo)
        ↓
  camarafarma.duckdns.org:80,443
        ↓
    🔓 Caddy (Puerto 80 para validación + 443 para HTTPS)
        ↓
  ↙─────────────────────────────────────────────────────→
  ↓                     ↓                     ↓
http://localhost:4000   http://localhost:4001   http://localhost:5173
(Backend API)          (Socket.IO)              (Frontend)
```

## Configuración de Puertos en el Router

Necesitas abrir **solo 2 puertos** para Caddy:

| Puerto Externo | Protocolo | Propósito                | Puerto Interno |
| -------------- | --------- | ------------------------ | -------------- |
| **80**         | TCP       | Validación Let's Encrypt | 80             |
| **443**        | TCP       | HTTPS (SSL)              | 443            |

### Pasos en tu Router

1. **Accede a tu router** (generalmente `192.168.1.1` o `192.168.0.1`)
2. **Ve a: Configuración > Reenvío de Puertos (Port Forwarding)**
3. **Crea estas reglas:**

```
Regla 1:
├─ Puerto Externo: 80 (HTTP)
├─ Puerto Interno: 80
├─ Protocolo: TCP
├─ IP Interna: 192.168.x.x (tu PC)
└─ Estado: ✅ Habilitado

Regla 2:
├─ Puerto Externo: 443 (HTTPS)
├─ Puerto Interno: 443
├─ Protocolo: TCP
├─ IP Interna: 192.168.x.x (tu PC)
└─ Estado: ✅ Habilitado
```

**Nota:** Mantén abierto el puerto 2107 para el frontend (Vite)

## URLs de Acceso

### Frontend (Vite con Caddy)

```
Interno: http://localhost:5173
Externo:
  - HTTP:  http://camarafarma.duckdns.org:2107 ✅
  - HTTPS: https://camarafarma.duckdns.org (en navegador)
```

### Backend API (Caddy como reverse proxy)

```
Interno: http://localhost:4000/api
Externo:
  - HTTP:  http://camarafarma.duckdns.org:4001/api (deprecated)
  - HTTPS: https://camarafarma.duckdns.org/api ✅ (RECOMENDADO)
```

### Socket.IO (Caddy reverse proxy)

```
Interno: http://localhost:4001
Externo:
  - HTTP:  http://camarafarma.duckdns.org:4002 (deprecated)
  - HTTPS: https://camarafarma.duckdns.org/socket.io ✅ (RECOMENDADO)
```

## Configuración de Caddy

El archivo `Caddyfile` en `C:\wppconnect2\` contiene:

```caddyfile
camarafarma.duckdns.org {
  reverse_proxy /api localhost:4000
  reverse_proxy /socket.io localhost:4001
  respond / "🔐 SSL activo"
}
```

**Caddy automáticamente:**

- Obtiene certificado SSL de Let's Encrypt
- Lo renueva automáticamente
- Redirige HTTP a HTTPS

## Actualizar Variables de Entorno

Después de instalar Caddy, actualiza:

### Frontend (.env)

```env
# Cambiar de:
VITE_API_URL="http://camarafarma.duckdns.org:4001/api"
VITE_SOCKET_URL="http://camarafarma.duckdns.org:4001"

# A:
VITE_API_URL="https://camarafarma.duckdns.org/api"
VITE_SOCKET_URL="https://camarafarma.duckdns.org"
```

### Backend (.env)

```env
# No cambiar, Caddy se encarga del HTTPS
PORT=4000
```

## Servicios que Necesitan Estar Corriendo

```
✅ Node.js Backend  → http://localhost:4000
✅ Node.js Frontend → http://localhost:5173
✅ Caddy Server     → http://localhost:80,443 (como reverse proxy)
```

## Verificación

```bash
# 1. Backend local
curl http://localhost:4000/api/conversations

# 2. Frontend local
curl http://localhost:5173

# 3. SSL externo (con Caddy)
curl https://camarafarma.duckdns.org/api/conversations

# 4. Frontend externo
https://camarafarma.duckdns.org (en navegador)
```

## Diferencia con la Anterior Configuración

### Antes (Solo HTTP)

```
Puerto 4001 (ext) → Puerto 4000 (int) - Manual
Puerto 4002 (ext) → Puerto 4001 (int) - Manual
```

### Ahora (Con Caddy + HTTPS)

```
Puerto 80,443 (ext) → Caddy → Redirecciona a localhost:4000,4001
SSL automático con Let's Encrypt ✅
```

## Ventajas

✅ Menos puertos abiertos (seguridad)
✅ HTTPS automático
✅ Certificado válido (sin warnings)
✅ Renovación automática
✅ Configuración simple

## Próximos Pasos

1. Abre puertos 80 y 443 en el router (solo estos dos)
2. Lee: `SSL_INSTALACION_CADDY.md`
3. Instala Caddy
4. Ejecuta Caddy
5. Verifica https://camarafarma.duckdns.org
