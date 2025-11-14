# 🔍 DIAGNÓSTICO: ¿Por Qué No Se Obtiene el Certificado?

## El Error Que Ves

```
ERROR http.acme_client challenge failed
Problem: "Connection refused"
Detail: "Fetching http://camarafarma.duckdns.org/.well-known/acme-challenge/..."
```

## ¿Qué Significa?

Let's Encrypt intentó validar tu dominio pero **no pudo conectarse** a tu servidor.

Esto ocurre cuando:

1. ❌ Puertos 80 o 443 **NO están abiertos** en el router
2. ❌ DuckDNS **NO resuelve** a tu IP pública
3. ❌ Tu PC **NO es accesible** desde internet
4. ❌ El **firewall bloquea** las conexiones
5. ❌ Tu router **NO tiene port forwarding** configurado

---

## Checklist de Diagnóstico

### 1️⃣ Verifica que DuckDNS Resuelve Correctamente

```powershell
nslookup camarafarma.duckdns.org
```

**Esperado:**

```
Servidor:   tu-dns.com
Dirección:  190.123.85.234

camarafarma.duckdns.org resuelve a: 190.123.85.234
```

**Si ves error "No se encontró":**
→ El dominio no está actualizado en DuckDNS
→ Ve a https://www.duckdns.org y verifica tu token

---

### 2️⃣ Verifica que tu IP Pública es Correcta

```powershell
# Obtén tu IP pública
(Invoke-WebRequest -Uri "https://api.ipify.org?format=json" -UseBasicParsing).Content | ConvertFrom-Json

# O más simple
curl "https://api.ipify.org?format=text"
```

Compara esta IP con la que aparece en https://www.duckdns.org

**Si son diferentes:**
→ Actualiza DuckDNS con tu IP pública correcta
→ Espera 5-10 minutos para que se propague

---

### 3️⃣ Verifica que el Puerto 80 Está Abierto en el Router

En tu PC, verifica que Caddy está escuchando:

```powershell
netstat -an | findstr "LISTENING" | findstr ":80"
netstat -an | findstr "LISTENING" | findstr ":443"
```

**Esperado:**

```
  TCP    0.0.0.0:80              LISTENING
  TCP    0.0.0.0:443             LISTENING
```

Si ves esto, Caddy está escuchando correctamente en tu PC.

---

### 4️⃣ Verifica que el Puerto 80 Está Abierto en el Router

**En tu router (192.168.1.1 o similar):**

1. Ve a: Configuración > Reenvío de Puertos (Port Forwarding)
2. Busca estas reglas:

   ```
   Puerto Externo: 80
   Puerto Interno: 80
   IP Destino: 192.168.x.x (tu PC)
   ✓ Habilitado
   ```

   ```
   Puerto Externo: 443
   Puerto Interno: 443
   IP Destino: 192.168.x.x (tu PC)
   ✓ Habilitado
   ```

**Si no existen:**
→ Créalas en tu router

---

### 5️⃣ Verifica que el Firewall de Windows Permite Puerto 80

```powershell
# Ver reglas del firewall para puerto 80
netsh advfirewall firewall show rule name=all | findstr "80"

# O más simple
# Panel de Control > Firewall > Permitir una aplicación
# Busca Caddy en la lista
```

Si Caddy no está en la lista:
→ Agrega Caddy al firewall permitido

---

### 6️⃣ Test desde Internet

Si tienes acceso a otro dispositivo fuera de tu red (teléfono con LTE, VPN, etc.):

```bash
# Intenta acceder a tu servidor
curl http://camarafarma.duckdns.org

# Debería responder con: "SSL activo"
```

Si funciona, ¡el puerto 80 está abierto!

---

## Solución Paso a Paso

### Si el Dominio NO Resuelve

1. Ve a https://www.duckdns.org
2. Verifica tu token es correcto
3. Actualiza tu IP (botón "Actualizar")
4. Espera 5-10 minutos
5. Prueba: `nslookup camarafarma.duckdns.org`

### Si el Puerto NO Está Abierto en el Router

1. Accede a tu router (192.168.1.1)
2. Ve a: Port Forwarding
3. Crea regla:

   - Puerto Externo: 80
   - Puerto Interno: 80
   - IP: Tu PC (192.168.x.x)
   - Protocolo: TCP
   - ✓ Guardar

4. Haz lo mismo para puerto 443

5. Reinicia el router si es necesario

### Si el Firewall Bloquea

1. Abre Windows Defender Firewall
2. "Permitir una aplicación"
3. Busca Caddy (C:\Caddy\caddy.exe)
4. Marca la casilla
5. Aplica cambios

---

## Cómo Verificar que Funciona

Una vez hagas los cambios, verás en los logs de Caddy:

```
INFO    tls.obtain    acquiring lock
INFO    tls.obtain    obtaining certificate
...
INFO    tls.obtain    certificate obtained successfully ✅
```

Entonces aparecerá:

```
INFO    http    enabled automatic HTTPS
```

---

## Plan de Acción

1. **Ahora:**

   ```powershell
   nslookup camarafarma.duckdns.org
   ```

   ¿Resuelve correctamente?

2. **Si SÍ resuelve:**

   - Verifica puerto forwarding en router
   - Verifica firewall de Windows

3. **Si NO resuelve:**

   - Ve a DuckDNS
   - Actualiza la IP
   - Espera 10 minutos
   - Reintenta

4. **Cuando todo esté correcto:**
   - Caddy obtendrá el certificado automáticamente
   - Verás: "certificate obtained successfully"

---

## Causa Más Probable

Basado en el error "Connection refused", la causa más probable es:

**🔴 Puertos 80 y/o 443 NO están abiertos en tu router**

**Solución:**

1. Accede a tu router
2. Ve a configuración de puertos
3. Crea las reglas de forwarding para 80 y 443
4. Reinicia Caddy o espera 60 segundos
5. Verás el certificado en los logs

---

## Debug Adicional

### Ver todos los puertos escuchando en tu PC

```powershell
netstat -an | findstr "LISTENING"
```

Deberías ver:

```
  TCP    0.0.0.0:80     LISTENING    <- Caddy HTTP
  TCP    0.0.0.0:443    LISTENING    <- Caddy HTTPS
  TCP    127.0.0.1:4000 LISTENING    <- Backend API
  TCP    127.0.0.1:4001 LISTENING    <- Socket.IO
  TCP    127.0.0.1:5173 LISTENING    <- Frontend Vite
```

### Ver procesos de Caddy

```powershell
Get-Process caddy
```

Deberías ver el proceso caddy.exe corriendo.

### Ver logs completos de Caddy

Los logs aparecen en la terminal donde ejecutaste:

```
C:\Caddy\caddy.exe run --config Caddyfile.txt
```

---

## Conclusión

El error "Connection refused" **NO significa que haya problema con Caddy**.

Significa que **Let's Encrypt no puede acceder a tu servidor desde internet**.

**Solución:**

1. Asegúrate que DuckDNS resuelve
2. Abre puertos 80 y 443 en el router
3. Espera a que Caddy se reintente
4. ¡Certificado obtenido! 🎉

---

## Próximo Paso

👉 **Corre esto AHORA:**

```powershell
nslookup camarafarma.duckdns.org
```

**Comparte el resultado y te ayudaré a diagnosticar.**
