# 🚀 MikroTik RB951 - Guía Rápida Port Forwarding

## Estado Actual

```
Router: MikroTik RB951
Puertos abiertos: Ninguno todavía
Objetivo: Abrir 80, 443, 2107 (SIN perder internet)
```

---

## ¿Perderás Internet?

### **NO** ✅

```
¿Por qué?

Port Forwarding en MikroTik SOLO redirige:
  - Tráfico ENTRANTE en puertos específicos
  - NO toca DHCP
  - NO toca WAN
  - NO toca otras conexiones

Resultado:
  ✅ Tu PC recibe puertos 80, 443, 2107
  ✅ Otras PCs siguen con internet normal
  ✅ El router funciona igual
```

---

## 5 Pasos Para Hacerlo

### PASO 1: Obtén tu IP local

En PowerShell:

```powershell
ipconfig
```

Busca: **IPv4 Address**  
Anota: `192.168.88.X` (donde X es un número)

**Ejemplo:** `192.168.88.50`

---

### PASO 2: Accede a MikroTik

En navegador:

```
http://192.168.88.1
```

**Login:**

- Usuario: `admin`
- Contraseña: (dejar vacío o `admin`)

---

### PASO 3: Ve a NAT

En MikroTik web:

```
IP → Firewall → NAT
```

Verás lista de reglas (probablemente vacía o con pocas)

---

### PASO 4: Crea 3 reglas

**Regla 1 - Puerto 80:**

```
Click: "+ New"

General:
  Chain: dstnat
  Protocol: tcp
  Dst. Port: 80

Action:
  Action: dst-nat
  To Addresses: 192.168.88.X  (TU IP)
  To Ports: 80

Click: OK
```

**Regla 2 - Puerto 443:**

```
Repetir lo anterior pero cambiar:
  Dst. Port: 443
  To Ports: 443
```

**Regla 3 - Puerto 2107:**

```
Repetir lo anterior pero cambiar:
  Dst. Port: 2107
  To Addresses: 192.168.88.X  (TU IP)
  To Ports: 5173  (¡Nota: 5173, no 2107!)
```

---

### PASO 5: Guardar

```
File → Save
O: Ctrl + S
```

**Listo.** Las reglas aplican inmediatamente.

---

## Verificar en tu PC

En PowerShell:

```powershell
netstat -an | findstr "LISTENING" | findstr ":80\|:443\|:5173"
```

Deberías ver:

```
TCP    0.0.0.0:80          LISTENING
TCP    0.0.0.0:443         LISTENING
TCP    127.0.0.1:5173      LISTENING
```

---

## Reiniciar Caddy

En PowerShell:

```powershell
taskkill /F /IM caddy.exe 2>$null
Start-Sleep -Seconds 2
C:\Caddy\caddy.exe run --config C:\wppconnect2\Caddyfile.txt
```

**Espera 1-2 minutos.**

Verás en logs:

```
✅ certificate obtained successfully
```

---

## ¡Hecho!

Accede a:

```
https://camarafarma.duckdns.org
```

Sin warnings de certificado. 🔐

---

## ¿Qué Hicimos?

```
Internet (80, 443, 2107)
        ↓
   MikroTik
   (Port Forwarding)
        ↓
   Tu PC (192.168.88.X)
        ↓
   Caddy + Frontend
        ↓
   HTTPS Funcionando ✅
```

---

## ⚠️ NO TOQUES

```
❌ DHCP
❌ Bridge
❌ WAN
❌ IP del router
❌ Otras reglas existentes
```

**SOLO crea las 3 nuevas reglas NAT.**

---

## Si Algo Sale Mal

Elimina las 3 reglas desde MikroTik:

```
1. IP → Firewall → NAT
2. Selecciona las 3 reglas nuevas
3. Delete
4. File → Save
```

Vuelve a tener internet. ✅

---

## ¿Necesitas Ayuda?

Cuéntame:

1. ¿Cuál es tu IP local? (`ipconfig` → IPv4)
2. ¿Accediste a http://192.168.88.1?
3. ¿Ves "IP → Firewall → NAT"?

Te ayudaré. 🚀
