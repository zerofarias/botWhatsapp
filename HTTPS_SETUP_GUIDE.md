# Guía de Configuración HTTPS - VARO Bot

## Estado Actual
✅ Backend con soporte HTTPS integrado (Greenlock Express)
✅ Certificados autofirmados listos
✅ Let's Encrypt configurado

## Opción 1: Desarrollo Rápido (Autofirmado)

### Paso 1: Generar Certificados
```powershell
powershell -ExecutionPolicy Bypass -File "setup-ssl-selfsigned.ps1"
```

Esto creará:
- `certs/varo-bot-cert.crt` - Certificado público
- `certs/varo-bot-cert.key` - Clave privada

### Paso 2: Activar HTTPS en Backend

Edita `platform-backend/.env`:
```env
ENABLE_SSL=false
# Mantener en false para esta opción - usaremos HTTP con certificados autofirmados
```

O crea un `.env.development`:
```env
NODE_ENV=development
ENABLE_SSL=false
PORT=4000
```

### Paso 3: Recompila
```powershell
cd platform-backend
npm run build
```

### Paso 4: Reinicia Servicios
```powershell
powershell -ExecutionPolicy Bypass -File "start-varo-services.ps1"
```

### Verificación
```
Backend disponible en: http://localhost:4000
Frontend disponible en: http://localhost:5173
```

---

## Opción 2: Producción (Let's Encrypt)

### Requisitos Previos
- ✅ Dominio configurado (ej: altheavn.duckdns.org)
- ✅ Puerto 80 accesible desde Internet
- ✅ Puerto 443 accesible desde Internet
- ✅ Email válido para renovación

### Paso 1: Instalar Certificado
```powershell
powershell -ExecutionPolicy Bypass -File "setup-ssl-letsencrypt.ps1"
```

Proporciona cuando se solicite:
- **Dominio**: altheavn.duckdns.org
- **Email**: tu@email.com
- **Modo Staging**: n (para certificados reales)

### Paso 2: Configurar Backend

Edita `platform-backend/.env`:
```env
ENABLE_SSL=true
DOMAIN_NAME=altheavn.duckdns.org
GREENLOCK_CONFIG_DIR=./greenlock.d
STAGING=false
EMAIL=tu@email.com
PORT=4000
```

### Paso 3: Recompila y Reinicia
```powershell
cd platform-backend
npm run build
```

```powershell
powershell -ExecutionPolicy Bypass -File "start-varo-services.ps1"
```

### Verificación
```
HTTPS disponible en: https://altheavn.duckdns.org
HTTP se redirige automáticamente a HTTPS
Certificado renovado automáticamente cada 60 días
```

---

## Opción 3: Producción Híbrida (Recomendado)

Backend con HTTPS automático (Let's Encrypt) + Frontend sin cambios

### Configuración Backend
```env
ENABLE_SSL=true
DOMAIN_NAME=altheavn.duckdns.org
GREENLOCK_CONFIG_DIR=./greenlock.d
STAGING=false
EMAIL=tu@email.com
PORT=4000
```

### Configuración Frontend
Vite continuará en HTTP://localhost:5173

En producción, apunta a HTTPS del backend:
```env
VITE_API_URL=https://altheavn.duckdns.org
```

---

## Solución de Problemas

### Error: "EACCES: permission denied"
**Causa**: Necesita permisos de administrador
**Solución**: 
```powershell
# Ejecutar como administrador
Start-Process powershell -Verb RunAs
```

### Error: "port 80 already in use"
**Causa**: Otro servicio en puerto 80
**Solución**:
```powershell
netstat -ano | findstr ":80"
# Anota el PID y termina el proceso
Stop-Process -Id <PID> -Force
```

### Error: "port 443 already in use"
**Causa**: Otro servicio en puerto 443
**Solución**:
```powershell
netstat -ano | findstr ":443"
# Anota el PID y termina el proceso
Stop-Process -Id <PID> -Force
```

### Certificado autofirmado: "Your connection is not private"
**Esto es normal** para certificados autofirmados.
En navegador, haz clic en "Advanced" → "Proceed to localhost"

### Let's Encrypt falla con "Authorization failed"
**Causa**: Dominio no resuelve correctamente
**Solución**:
```powershell
# Verifica que el dominio resuelva tu IP
nslookup altheavn.duckdns.org
```

---

## Archivos Generados

### Certificados Autofirmados
```
certs/
├── varo-bot-cert.crt
├── varo-bot-cert.key
└── varo-bot-cert.pem
```

### Certificados Let's Encrypt
```
greenlock.d/
├── accounts/
│   └── ...
├── certs/
│   ├── altheavn.duckdns.org/
│   │   ├── cert.pem
│   │   ├── chain.pem
│   │   ├── fullchain.pem
│   │   └── privkey.pem
│   └── ...
└── renewal/
```

---

## Monitoreo

### Ver estado de certificados
```powershell
# Autofirmados
Get-AuthenticodeSignature -FilePath "certs/varo-bot-cert.crt"

# Let's Encrypt
Get-ChildItem "greenlock.d/certs" -Recurse | Get-AuthenticodeSignature
```

### Ver logs de renovación automática
```powershell
Get-EventLog -LogName "System" -Source "Task Scheduler" | 
  Where-Object { $_.Message -like "*greenlock*" }
```

---

## Próximos Pasos

1. **Elige opción** (Desarrollo o Producción)
2. **Ejecuta el script** correspondiente
3. **Configura variables de entorno** en `.env`
4. **Recompila backend**: `npm run build`
5. **Reinicia servicios**: `start-varo-services.ps1`
6. **Verifica conexión** en navegador

---

## Referencia Rápida

| Aspecto | Autofirmado | Let's Encrypt |
|--------|------------|---------------|
| Costo | Gratis | Gratis |
| Validación de navegador | ⚠️ Advertencia | ✅ Confiado |
| Uso | Desarrollo/Testing | Producción |
| Renovación | Manual | Automática |
| Dominios | localhost, 127.0.0.1 | Dominios reales |
| Tiempo de setup | 1 minuto | 5 minutos |
| Mantenimiento | Ninguno | Automático |

---

**¿Preguntas?** Consulta el README-VARO-BOT.md para más información.
