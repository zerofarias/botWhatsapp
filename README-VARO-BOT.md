# GUÍA DE VARO BOT - ESTADO ACTUAL

## ✅ SISTEMA ACTIVO Y FUNCIONANDO

### Servicios en ejecución:
- **Backend**: Puerto 4000 (Node.js - dist/index.js)
- **Frontend**: Puerto 5173 (http-server sirviendo React compilado)

### Acceso:
- Frontend: http://localhost:5173
- Backend: http://localhost:4000

---

## ⏯️ CÓMO INICIAR VARO BOT

### Opción 1: Script PowerShell (RECOMENDADO)
```powershell
cd C:\wppconnect2
powershell -ExecutionPolicy Bypass -File ".\start-varo-services.ps1"
```
Esto abrirá dos terminales automáticamente.

### Opción 2: Manualmente
Terminal 1 - Backend:
```bash
cd C:\wppconnect2\platform-backend
node dist/index.js
```

Terminal 2 - Frontend:
```bash
cd C:\wppconnect2\platform-frontend
npx http-server dist -p 5173
```

### Opción 3: Batch
```bash
C:\wppconnect2\launch-varo.bat
```

---

## 🛑 CÓMO DETENER VARO BOT

En PowerShell como administrador:
```powershell
Stop-Process -Name node -Force
```

O cierra manualmente las dos ventanas de PowerShell.

---

## 📋 ARCHIVOS PRINCIPALES

- `start-varo-services.ps1` - Script para iniciar ambos servicios
- `launch-varo.bat` - Batch para iniciar desde cualquier lugar
- `backend-service.ps1` - Script del backend
- `frontend-service.ps1` - Script del frontend
- `register-startup-task.ps1` - Para registro automático (opcional)

---

## 📊 VERIFICAR ESTADO

```powershell
# Ver procesos Node.js
Get-Process node

# Ver puertos en uso
netstat -ano | findstr ":4000\|:5173"

# Ver logs
Get-Content C:\wppconnect2\logs\varo-back.log -Tail 20
Get-Content C:\wppconnect2\logs\varo-front.log -Tail 20
```

---

## 🔧 NOTAS TÉCNICAS

- Los servicios se ejecutan en dos procesos Node.js separados
- Logs se guardan en: `C:\wppconnect2\logs\`
- Backend expone API REST en puerto 4000
- Frontend es una SPA React servida en puerto 5173
- No hay servicios de Windows instalados (evita problemas de permisos)

---

**Estado**: ✅ OPERATIVO Y FUNCIONANDO
