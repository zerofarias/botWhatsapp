# 🏗️ Arquitectura Final de tu Aplicación

## Diagrama Completo

```
┌────────────────────────────────────────────────────────────────────┐
│                         INTERNET (WAN)                             │
│              Acceso: https://camarafarma.duckdns.org               │
└──────────────┬─────────────────────────────────────────────────────┘
               │
        ┌──────┴─────────────────┐
        │ Tu Router              │
        │ ISP Port Forwarding    │
        ├──────────────────────┬─┴────────────────────┐
        │ Puerto 80  → PC:80    │ Puerto 443 → PC:443  │
        │ Puerto 2107→ PC:5173  │ (Caddy)              │
        └───────────┬──────────┬┴────────────────────┘
                    │          │
        ┌───────────┴──────────┴────────┐
        │   Tu PC (Windows)              │
        │  IP Local: 192.168.x.x        │
        │                               │
        │  Firewall Windows Abierto:    │
        │  ✅ Puertos 80, 443           │
        │  ✅ Puerto 5173 (localhost)   │
        └───────────┬─────────┬─────────┴────────┐
                    │         │                  │
        ┌───────────▼──┐  ┌───▼─────────┐  ┌───▼──────────┐
        │ Caddy Server │  │   Node.js   │  │   Node.js    │
        │ (HTTPS)      │  │  Backend    │  │  Frontend    │
        │              │  │  (API)      │  │   (Vite)     │
        │ Puerto: 80   │  │             │  │              │
        │ Puerto: 443  │  │ Port: 4000  │  │ Port: 5173   │
        │              │  │             │  │              │
        │ ✨ Maneja:   │  │ Express     │  │ React        │
        │ • HTTPS      │  │ Prisma      │  │ TypeScript   │
        │ • SSL        │  │ MySQL       │  │ Tailwind     │
        │ • Certs      │  │ Socket.IO   │  │ Vite         │
        │ • Reverse    │  │ WhatsApp    │  │              │
        │   proxy      │  │             │  │              │
        └───┬─────────┬┘  └───┬─────────┘  └──────────────┘
            │         │       │
            │    ┌────┴───────┤
            └────┤            │
                 │            │
            ┌────▼──┐  ┌──────▼─────┐
            │ Caché │  │  Filesys   │
            │ Certs │  │ Uploads/   │
            │       │  │ Tokens     │
            └───────┘  └────────────┘
                    │
            ┌───────▼──────────────┐
            │  MySQL Database      │
            │  wppconnect_platform │
            │                      │
            │ • Conversations      │
            │ • Messages           │
            │ • Orders             │
            │ • Users              │
            │ • Sessions           │
            └──────────────────────┘
```

## Flujo de una Solicitud HTTPS

```
1. Usuario en navegador escribe:
   https://camarafarma.duckdns.org/api/conversations
                    │
                    ▼
2. ISP resuelve dominio a tu IP pública
                    │
                    ▼
3. Router recibe en puerto 443
   (Port Forwarding)
                    │
                    ▼
4. Caddy en tu PC recibe la solicitud HTTPS
   - Valida certificado SSL (Let's Encrypt)
   - Descifra datos
                    │
                    ▼
5. Caddy ve que es /api/*
   Redirecciona a: http://localhost:4000/api/conversations
                    │
                    ▼
6. Backend Express recibe, procesa
   - Consulta MySQL
   - Ejecuta lógica
                    │
                    ▼
7. Respuesta va a Caddy
   Caddy cifra con SSL
                    │
                    ▼
8. Respuesta llega al navegador del usuario
   (segura y cifrada) ✅
```

## Componentes

### 1. Caddy (Reverse Proxy + SSL)

```
Función: Punto de entrada HTTPS
Ubicación: Tu PC (Windows)
Escucha: Puerto 80 (HTTP) y 443 (HTTPS)
Configuración: C:\wppconnect2\Caddyfile

Rutas:
┌─ /api/*          → localhost:4000
├─ /socket.io/*    → localhost:4001
└─ /               → Status page
```

### 2. Backend (Express + Node.js)

```
Función: API REST y lógica de negocio
Ubicación: Tu PC
Escucha: Puerto 4000 (localhost)
Tecnologías: Express, Prisma, Socket.IO, WhatsApp

Rutas principales:
├─ POST   /api/auth/login
├─ GET    /api/conversations
├─ POST   /api/messages
├─ GET    /api/orders
├─ PATCH  /api/orders/:id/status
└─ Socket.IO /socket.io
```

### 3. Frontend (React + Vite)

```
Función: Interfaz de usuario
Ubicación: Tu PC
Escucha: Puerto 5173 (localhost)
Acceso externo: Puerto 2107 (router) → 5173

Tecnologías: React, TypeScript, Tailwind, Vite
Conexiones:
├─ API REST → https://camarafarma.duckdns.org/api
└─ Socket.IO → https://camarafarma.duckdns.org/socket.io
```

### 4. Base de Datos (MySQL)

```
Función: Almacenamiento persistente
Motor: MySQL
Base de datos: wppconnect_platform

Tablas principales:
├─ conversations
├─ messages
├─ orders
├─ users
├─ sessions
└─ ...
```

## URLs de Acceso

### Desarrollo Local (HTTP)

```
Frontend:  http://localhost:5173
API:       http://localhost:4000/api
Socket.IO: http://localhost:4001
```

### Producción Externa (HTTPS via Caddy)

```
Frontend:  https://camarafarma.duckdns.org:2107
API:       https://camarafarma.duckdns.org/api
Socket.io: https://camarafarma.duckdns.org/socket.io
Status:    https://camarafarma.duckdns.org
```

## Flujo WebSocket (Socket.IO)

```
Cliente (Navegador)
     │
     ├─ Conecta a: wss://camarafarma.duckdns.org/socket.io
     │                    │
     │                    ▼ (HTTPS/WSS via Caddy)
     │
     ├─ Caddy recibe en puerto 443
     │    Valida SSL
     │    Redirige a localhost:4001
     │                    │
     │                    ▼
     │              Backend Socket.IO
     │                    │
     └─ Escucha eventos en tiempo real:
        • message:new
        • order:status-changed
        • conversation:updated
```

## Flujo de Certificado SSL

```
1. Ejecutas: caddy run -config C:\wppconnect2\Caddyfile
                    │
                    ▼
2. Caddy lee config, ve dominio: camarafarma.duckdns.org
                    │
                    ▼
3. Caddy contacta a Let's Encrypt
   Solicita: Certificado para camarafarma.duckdns.org
                    │
                    ▼
4. Let's Encrypt requiere validación:
   Verifica que controlas el dominio
   Envía challenge HTTP a puerto 80
                    │
                    ▼
5. Caddy responde al challenge
   (tu router tiene puerto 80 abierto)
                    │
                    ▼
6. Let's Encrypt valida, emite certificado
   Válido por 90 días
                    │
                    ▼
7. Caddy almacena certificado:
   C:\Users\YourUser\AppData\Roaming\Caddy\
                    │
                    ▼
8. Caddy sirve HTTPS usando certificado
                    │
                    ▼
9. 60 días antes de expirar:
   Caddy automáticamente renueva
   (sin intervención manual)
```

## Puertos Abiertos

### Router (Forwarding Externo → Interno)

```
Puerto Externo  │ Protocolo │ Puerto Interno │ Destino
────────────────┼───────────┼────────────────┼──────────────────
80              │ TCP       │ 80             │ Caddy (HTTP)
443             │ TCP       │ 443            │ Caddy (HTTPS)
2107            │ TCP       │ 5173           │ Frontend Vite
```

### Firewall Windows (Localhost solo)

```
Puerto │ Protocolo │ Destino         │ Usar
───────┼───────────┼─────────────────┼──────────────────
4000   │ TCP       │ localhost:4000  │ Backend API
4001   │ TCP       │ localhost:4001  │ Socket.IO
5173   │ TCP       │ localhost:5173  │ Frontend Vite
```

## Seguridad

```
Internet (Usuario) → [HTTPS Cifrado] → Router → [Localhost - No Cifrado] → Backend
                    (SSL/TLS)
                    Let's Encrypt
                    Caddy se encarga
```

### Cadena de Cifrado

```
Usuarios externos (Internet)
    ↓
Caddy: Cifra/Descifra HTTPS
    ↓ (HTTPS ↔ HTTP)
Backend: Recibe HTTP puro en localhost
    ↓
Responde en localhost (seguro, sin internet)
    ↓
Caddy: Cifra respuesta con SSL
    ↓
Usuario recibe HTTPS cifrado ✅
```

## Monitoreo

Para ver que todo está funcionando:

```powershell
# Terminal 1: Ver logs de Caddy
caddy run -config C:\wppconnect2\Caddyfile

# Terminal 2: Probar conectividad
curl https://camarafarma.duckdns.org
curl https://camarafarma.duckdns.org/api/conversations
curl https://camarafarma.duckdns.org/socket.io/

# Navegador: Acceder a interfaz
https://camarafarma.duckdns.org:2107
```

## Escalabilidad Futura

La arquitectura actual soporta:

```
✅ Agregar más dominios (solo edita Caddyfile)
✅ Múltiples instancias del backend (con load balancer)
✅ CDN (agregar en Caddy)
✅ Rate limiting (Caddy lo soporta)
✅ Logging y monitoreo (via Caddy)
✅ Migrar a servidor dedicado (mismo setup)
```

## Resumen

```
┌─────────────────────────────────────┐
│  Usuario en Internet (HTTPS)        │
│ https://camarafarma.duckdns.org     │
└──────────────┬──────────────────────┘
               │
        ┌──────▼──────┐
        │ Caddy (SSL) │ ← Certificado Let's Encrypt
        │ 80 + 443    │   Reverse Proxy
        └──────┬──────┘
               │
     ┌─────────┼──────────────┐
     │         │              │
┌────▼──┐  ┌──▼────┐  ┌──────▼────┐
│Backend│  │Socket │  │ Frontend  │
│:4000  │  │:4001  │  │ :5173     │
└────┬──┘  └───┬───┘  └───┬──────┘
     │        │           │
     └────┬───┴─────┬─────┘
          │         │
          ▼         ▼
      ┌───────────────┐
      │ MySQL DB      │
      │ Session Store │
      └───────────────┘

✅ Seguro: HTTPS con SSL válido
✅ Rápido: Caddy reverse proxy optimizado
✅ Confiable: Certificado automático renovable
✅ Escalable: Fácil de crecer
```

---

**Esta es tu arquitectura final lista para producción** 🚀
