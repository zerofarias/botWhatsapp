# 🔐 CERTIFICADO SSL - GUÍA DE INICIO

## Estado Actual ✅

Tu aplicación está **100% lista para SSL**. Solo necesitas instalar **Caddy**.

```
✅ Backend corriendo:        http://localhost:4000
✅ Socket.IO corriendo:      http://localhost:4001
✅ Frontend corriendo:       http://localhost:5173
✅ Puertos abiertos:         80, 443, 2107
✅ Dominio configurado:      camarafarma.duckdns.org
✅ Caddy configurado:        Caddyfile listo
⏳ SSL certificado:          FALTA INSTALAR CADDY
```

---

## 🚀 Instalación en 3 Pasos

### Paso 1: Instala Caddy

En PowerShell (como administrador):

```powershell
choco install caddy -y
```

Si no tienes Chocolatey, elige otra opción en `SSL_INSTALACION_CADDY.md`

### Paso 2: Ejecuta Caddy

```powershell
caddy run -config C:\wppconnect2\Caddyfile
```

### Paso 3: Espera este mensaje

```
🔐 SSL activo en camarafarma.duckdns.org
```

**¡Certificado obtenido automáticamente!** ✅

---

## ✨ Qué Ocurre Automáticamente

```
1. Caddy lee la configuración
2. Contacta a Let's Encrypt
3. Valida tu dominio (via puerto 80)
4. Obtiene certificado (< 1 minuto)
5. Almacena certificato automáticamente
6. Sirve HTTPS en puerto 443
7. Se renovará automáticamente en 90 días
```

---

## 🌐 URLs Finales

| URL           | Antes                                           | Después                                     |
| ------------- | ----------------------------------------------- | ------------------------------------------- |
| **API**       | `http://camarafarma.duckdns.org:4001/api`       | `https://camarafarma.duckdns.org/api`       |
| **Socket.IO** | `http://camarafarma.duckdns.org:4002/socket.io` | `https://camarafarma.duckdns.org/socket.io` |
| **Frontend**  | `http://camarafarma.duckdns.org:2107`           | `https://camarafarma.duckdns.org:2107`      |

---

## 📱 Cambios en Variables de Entorno

**Frontend `.env` - CAMBIAR ANTES DE COMPILAR:**

```env
# Cambiar esto:
VITE_API_URL="http://camarafarma.duckdns.org:4001/api"
VITE_SOCKET_URL="http://camarafarma.duckdns.org:4001"

# A esto:
VITE_API_URL="https://camarafarma.duckdns.org/api"
VITE_SOCKET_URL="https://camarafarma.duckdns.org"
```

Luego compila: `npm run build`

---

## 🎯 Verificación Inmediata

Después de ejecutar Caddy, prueba:

```powershell
# En otra terminal

# 1. Verifica Caddy está respondiendo
curl https://camarafarma.duckdns.org

# Deberías ver:
# 🔐 SSL activo en camarafarma.duckdns.org

# 2. Verifica API
curl https://camarafarma.duckdns.org/api/conversations

# 3. Verifica Socket.IO
curl https://camarafarma.duckdns.org/socket.io/
```

---

## ❌ Si Tienes Error

### "Caddy command not found"

```powershell
choco install caddy -y
# Abre una NUEVA terminal
```

### "Puerto 80 ya en uso"

```powershell
Get-NetTCPConnection -LocalPort 80
# Detén el servicio que lo ocupa
```

### "Domain validation failed"

- Verifica que puerto 80 está abierto en router
- Espera 1-2 minutos
- Revisa si `camarafarma.duckdns.org` resuelve:
  ```powershell
  nslookup camarafarma.duckdns.org
  ```

### "Certificate request failed"

- Probablemente issue de validación
- Lee: `SSL_INSTALACION_CADDY.md` → Solución de Problemas

---

## 📚 Documentos Útiles

```
SSL_COMIENZA_AQUI.md          ← TÚ ESTÁS AQUÍ
SSL_GUIA_RAPIDA.md            ← Quick reference
SSL_INSTALACION_CADDY.md      ← Paso a paso detallado
CONFIGURACION_ROUTER_PUERTOS.md ← Setup de puertos
ARQUITECTURA_FINAL.md         ← Cómo funciona todo
INDICE_SSL_DOCS.md            ← Índice completo
```

---

## ⏱️ Tiempo Total

| Actividad                | Tiempo          |
| ------------------------ | --------------- |
| Instalar Caddy           | 2 min           |
| Ejecutar Caddy           | 30 seg          |
| Obtener certificato      | < 1 min         |
| Verificar funcionamiento | 1 min           |
| **TOTAL**                | **≈ 5 minutos** |

---

## ✅ Checklist

- [ ] Instalar: `choco install caddy -y`
- [ ] Ejecutar: `caddy run -config C:\wppconnect2\Caddyfile`
- [ ] Ver: "🔐 SSL activo"
- [ ] Probar: `https://camarafarma.duckdns.org`
- [ ] Ver: Sin warnings de certificato
- [ ] ✅ ¡SSL funcionando!

---

## 🎓 Extras (Opcional)

### Hacer que Caddy inicie automáticamente

```powershell
# Instala NSSM (gestor de servicios)
choco install nssm

# Crea servicio
nssm install CaddyService caddy run -config C:\wppconnect2\Caddyfile

# Inicia
nssm start CaddyService
```

### Ver logs en tiempo real

```powershell
# Caddy muestra logs en la terminal automaticamente
# Si necesitas guardarlos:
caddy run -config C:\wppconnect2\Caddyfile > caddy.log 2>&1
```

### Renovar certificato manualmente (generalmente no necesario)

```powershell
# Caddy renueva automáticamente
# Pero si quieres forzar:
caddy reload -config C:\wppconnect2\Caddyfile
```

---

## 🔒 Seguridad

Tu aplicación ahora tiene:

✅ **Encriptación HTTPS** - Todo el tráfico cifrado
✅ **Certificato válido** - Emitido por Let's Encrypt
✅ **Sin warnings** - Navegador confía en el certificato
✅ **Renovación automática** - No expirarán tus certificatos

---

## 🚀 Ahora Qué

### Opción A: Instalar inmediatamente

```powershell
choco install caddy -y
caddy run -config C:\wppconnect2\Caddyfile
```

### Opción B: Aprender primero

Abre: `SSL_INSTALACION_CADDY.md`

### Opción C: Entender la arquitectura

Abre: `ARQUITECTURA_FINAL.md`

---

## 💬 Soporte

Si tienes dudas:

1. **Antes de ejecutar**: Lee `CONFIGURACION_ROUTER_PUERTOS.md`
2. **Mientras ejecuta**: Revisa los logs (mensajes en terminal)
3. **Si falla**: Lee `SSL_INSTALACION_CADDY.md` → Solución de Problemas
4. **Quieres entender**: Lee `ARQUITECTURA_FINAL.md`

---

## 🎉 ¡Listo!

Tu SSL/HTTPS estará funcionando en **menos de 5 minutos**.

**Comienza ahora:**

```powershell
choco install caddy -y
caddy run -config C:\wppconnect2\Caddyfile
```

Luego abre en navegador: `https://camarafarma.duckdns.org`

¡Certificato válido sin warnings! 🔐✅
