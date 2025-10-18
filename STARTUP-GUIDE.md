# 🚀 Guía de Inicio - WPPConnect Platform

## 📋 Resumen de Servicios

La plataforma consta de **3 servicios principales**:

### 1. **WPPConnect Backend** (WhatsApp Core)

- **Puerto**: 3000
- **Dashboard**: http://localhost:3000
- **Descripción**: Servicio principal de WhatsApp con dashboard para escanear QR

### 2. **Platform Backend** (API REST)

- **Puerto**: 4000
- **API**: http://localhost:4000
- **Descripción**: API REST con autenticación, gestión de conversaciones, Quick Replies

### 3. **Platform Frontend** (Interfaz Web)

- **Puerto**: 5173
- **Web**: http://localhost:5173
- **Descripción**: Interfaz de operadores con chat, Quick Replies y atajos

---

## ⚡ Inicio Rápido

### Opción 1: Usando PowerShell (Recomendado)

```powershell
# 1. Habilitar ejecución de scripts (en cada terminal nueva)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 2. Terminal 1 - WPPConnect Backend
cd C:\Users\lauth\OneDrive\Documentos\wppconnect
npm start

# 3. Terminal 2 - Platform Backend
cd C:\Users\lauth\OneDrive\Documentos\wppconnect\platform-backend
npm run build
npm start

# 4. Terminal 3 - Platform Frontend
cd C:\Users\lauth\OneDrive\Documentos\wppconnect\platform-frontend
npm run dev
```

### Opción 2: Evitando Problemas de PowerShell

Si tienes problemas con la política de ejecución:

```powershell
# Terminal 1 - WPPConnect
cd C:\Users\lauth\OneDrive\Documentos\wppconnect
& "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" start

# Terminal 2 - Platform Backend
cd C:\Users\lauth\OneDrive\Documentos\wppconnect\platform-backend
& "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run build
& "C:\Program Files\nodejs\node.exe" dist/index.js

# Terminal 3 - Platform Frontend
cd C:\Users\lauth\OneDrive\Documentos\wppconnect\platform-frontend
& "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev
```

---

## 🔐 Primer Uso

### 1. Escanear QR de WhatsApp

1. Abre: http://localhost:3000
2. Verás el código QR generado
3. Escanéalo con tu WhatsApp (Configuración → Dispositivos vinculados)
4. Espera la confirmación de conexión

### 2. Crear Usuario de Prueba

```powershell
cd platform-backend
& "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run seed:test-user
```

**Credenciales creadas:**

- **Usuario**: testoperator
- **Contraseña**: test123456

### 3. Acceder a la Plataforma

1. Abre: http://localhost:5173
2. Inicia sesión con las credenciales del paso 2
3. ¡Ya puedes usar el chat con Quick Replies!

---

## 🎯 Probar Quick Replies

### Ver Quick Replies Disponibles

Ya tienes **20 ejemplos** insertados en la base de datos:

```
/saludo - Saludo inicial
/saludoformal - Saludo formal
/horarios - Horario de atención
/ubicacion - Dirección y cómo llegar
/envios - Información sobre envíos
/precios - Consulta de precios
/catalogo - Enviar catálogo
/stock - Consulta de stock
/nostock - Producto sin stock
... y 11 más
```

### Usar Atajos en el Chat

1. Selecciona una conversación
2. En el campo de mensaje, escribe **`/`**
3. Verás aparecer las sugerencias automáticamente
4. Usa las **flechas ↑↓** para navegar
5. Presiona **Enter** o **Tab** para expandir
6. Presiona **Escape** para cancelar

### Ejemplo Práctico

```
1. Escribe: /saludo
2. Aparecen sugerencias:
   ┌────────────────────────────────────┐
   │ /saludo - Saludo inicial          │
   │ /saludoformal - Saludo formal     │
   └────────────────────────────────────┘
3. Presiona Enter
4. Se expande a: "¡Hola! Bienvenido a nuestro servicio. ¿En qué puedo ayudarte hoy?"
5. Haz clic en Enviar
```

---

## 📊 Verificar Estado de Servicios

### WPPConnect Backend

```bash
# Verificar en consola:
[INFO] Session "session" status: CONNECTED
```

### Platform Backend

```bash
curl http://localhost:4000/health
# Debería retornar: {"status":"ok"}
```

### Platform Frontend

```
Abrir: http://localhost:5173
Debería cargar la página de login
```

---

## 🐛 Solución de Problemas

### Error: "No se puede cargar npm.ps1"

**Solución:**

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### Error: "EADDRINUSE: address already in use ::4000"

**Solución:**

```powershell
# Ver procesos en el puerto
netstat -ano | findstr :4000

# Matar proceso (reemplaza <PID> con el número que viste)
taskkill /PID <PID> /F

# O esperar 30 segundos y reintentar
```

### Error: "Prisma Client not found"

**Solución:**

```powershell
cd platform-backend
npm run prisma:generate
```

### No aparecen Quick Replies

**Solución:**

```powershell
cd platform-backend

# Verificar que existen en la BD
& "C:\Program Files\nodejs\node.exe" --loader ts-node/esm scripts/seed-quick-replies.ts

# Si dice "ya existen", están OK
# Si no, los creará
```

### Frontend no se conecta al backend

**Verificar variables de entorno:**

Archivo: `platform-frontend/.env` (crear si no existe)

```env
VITE_API_URL=http://localhost:4000
```

Archivo: `platform-backend/.env`

```env
PORT=4000
DATABASE_URL="mysql://root:password@localhost:3306/wppconnect_platform"
SESSION_SECRET="tu-secret-super-seguro-aqui"
```

---

## 🔄 Comandos Útiles

### Reiniciar Servicios

```powershell
# En cada terminal, presiona Ctrl+C y vuelve a ejecutar el comando de inicio
```

### Limpiar y Reinstalar

```powershell
# WPPConnect Backend
cd C:\Users\lauth\OneDrive\Documentos\wppconnect
Remove-Item node_modules -Recurse -Force
npm install

# Platform Backend
cd platform-backend
Remove-Item node_modules -Recurse -Force
npm install
npm run prisma:generate

# Platform Frontend
cd platform-frontend
Remove-Item node_modules -Recurse -Force
npm install
```

### Ver Logs en Tiempo Real

Los logs aparecen automáticamente en las terminales donde ejecutaste los servicios.

---

## 📁 Estructura de Puertos

| Servicio             | Puerto | URL                   | Descripción             |
| -------------------- | ------ | --------------------- | ----------------------- |
| WPPConnect Dashboard | 3000   | http://localhost:3000 | Escanear QR, ver estado |
| Platform Backend API | 4000   | http://localhost:4000 | API REST                |
| Platform Frontend    | 5173   | http://localhost:5173 | Interfaz web            |
| MySQL Database       | 3306   | localhost:3306        | Base de datos           |

---

## ✅ Checklist de Verificación

Antes de reportar un problema, verifica:

- [ ] Los 3 servicios están corriendo
- [ ] WhatsApp está conectado (QR escaneado)
- [ ] Usuario de prueba creado
- [ ] Quick Replies insertados en BD
- [ ] Puedes acceder a http://localhost:5173
- [ ] Puedes iniciar sesión
- [ ] Ves conversaciones en la lista

---

## 🎓 Próximos Pasos

1. **Probar el sistema completo**

   - Enviar mensajes de prueba
   - Usar los atajos /saludo, /horarios, etc.
   - Navegar con teclado (↑↓ Enter Esc)

2. **Personalizar Quick Replies**

   - Editar contenidos en la base de datos
   - Crear nuevos atajos específicos para tu negocio

3. **Implementar funcionalidades adicionales**
   - Modal de gestión de Quick Replies
   - Estadísticas de uso
   - Variables dinámicas

---

## 📞 Soporte

Si tienes problemas:

1. Revisa esta guía completa
2. Verifica los logs en las terminales
3. Consulta `QUICK-REPLIES-GUIDE.md` para uso de atajos
4. Revisa `SHORTCUT-DETECTION-IMPLEMENTATION.md` para detalles técnicos

---

**¡Listo para usar! 🚀**

Ahora tienes un sistema completo de atención al cliente por WhatsApp con respuestas rápidas y detección automática de atajos.
