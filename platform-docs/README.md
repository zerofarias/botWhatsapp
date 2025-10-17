# WPPConnect Bot Platform

Este proyecto crea una plataforma completa para que múltiples usuarios administren su bot de WhatsApp utilizando **@wppconnect-team/wppconnect**. Incluye:

- **Backend**: Node.js + Express + Prisma (MySQL) con autenticación JWT, roles y Socket.IO.
- **Frontend**: React (Vite) con SPA para configurar flujos, visualizar mensajes, escanear QR y administrar la sesión.

La estructura principal está dividida en dos paquetes:

- `platform-backend/`
- `platform-frontend/`

## 1. Requisitos previos

- Node.js 18+
- MySQL/MariaDB en ejecución
- Yarn o npm

## 2. Configuración del backend

1. Copia el archivo de variables:

   ```bash
   cd platform-backend
   cp .env.example .env
   ```

2. Edita `.env` con las credenciales de tu base de datos y un `JWT_SECRET` seguro.

3. Instala dependencias y ejecuta Prisma:

   ```bash
   npm install
   npx prisma migrate dev
   ```

4. Arranca el servidor (modo desarrollo):

   ```bash
   npm run dev
   ```

   El API queda disponible en `http://localhost:4000`.

### Endpoints principales

| Método | Ruta                 | Descripción                               |
| ------ | -------------------- | ----------------------------------------- |
| POST   | `/api/auth/login`    | Autenticación con email/contraseña        |
| POST   | `/api/auth/register` | Crear usuarios (solo admin)               |
| GET    | `/api/bot/status`    | Estado de la sesión de WhatsApp           |
| POST   | `/api/bot/start`     | Inicia la sesión y genera QR              |
| GET    | `/api/bot/qr`        | Obtiene el último QR generado             |
| GET    | `/api/flows`         | Lista de palabras/respuestas configuradas |
| POST   | `/api/flows`         | Crea o actualiza un flujo                 |
| DELETE | `/api/flows/:id`     | Elimina un flujo                          |
| GET    | `/api/messages`      | Historial de mensajes                     |
| GET    | `/api/users`         | Listado de usuarios (admin)               |

El backend expone un servidor Socket.IO que emite:

- `qr_code` – ASCII/PNG del QR generado
- `session_status` – Cambios de estado (CONNECTED, ERROR, etc.)
- `message` – Mensajes entrantes/salientes capturados

## 3. Configuración del frontend

1. Instala dependencias y arranca Vite:

   ```bash
   cd platform-frontend
   npm install
   npm run dev
   ```

2. Accede a `http://localhost:5173`. Vite proxea las peticiones `/api` y `/socket.io` hacia el backend.

### Rutas de la SPA

- `/login` – Autenticación por JWT.
- `/dashboard` – Resumen, botones de control y QR en vivo.
- `/dashboard/flows` – CRUD de palabras clave.
- `/dashboard/messages` – Historial de mensajes.
- `/dashboard/settings` – Metadatos del bot y pausa general.
- `/dashboard/admin` – Vista exclusiva para roles `ADMIN` con listado global.

## 4. Flujo típico de uso

1. Un administrador crea usuarios (`/api/auth/register`).
2. El usuario inicia sesión en el frontend.
3. Desde el panel solicita iniciar el bot → se genera el QR (Socket.IO).
4. Tras escanear, el bot queda conectado y responde según sus flujos.
5. Puede pausar/reanudar, editar respuestas y revisar los logs de mensajes.

## 5. Integraciones y puntos extensibles

- `platform-backend/src/services/wpp.service.ts` gestiona la conexión por usuario y la sincronización con Prisma.
- Puedes ampliar la lógica para estadísticos globales o integraciones externas modificando los servicios.
- Añade métricas o schedulers utilizando el mismo contenedor Express/Socket.IO.

## 6. Scripts útiles

| Directorio          | Comando                  | Propósito                          |
| ------------------- | ------------------------ | ---------------------------------- |
| `platform-backend`  | `npm run dev`            | API + Socket.IO en modo desarrollo |
| `platform-backend`  | `npm run prisma:migrate` | Gestionar migraciones Prisma       |
| `platform-backend`  | `npm run build`          | Compilar a `dist/`                 |
| `platform-frontend` | `npm run dev`            | SPA en modo desarrollo (Vite)      |
| `platform-frontend` | `npm run build`          | Build estático de la SPA           |

> **Nota:** WPPConnect necesita Chrome/Chromium para completar la conexión. En servidores, instala los binarios requeridos o configura `puppeteer` para apuntar a un navegador existente.

## 7. Próximos pasos sugeridos

- Implementar gestión de archivos/botones rápidos.
- Añadir rate limits y pruebas automatizadas.
- Integrar colas (BullMQ) para workloads pesados.
- Desplegar con Docker Compose, incluyendo un contenedor MySQL.

---

Con esta base tienes una solución lista para extender y desplegar un SaaS de bots de WhatsApp multitenant. ¡Disfruta construyendo! 🧠📱
