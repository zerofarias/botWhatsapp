# ✅ MikroTik RB951 - Resumen Ejecutivo

## Tu Pregunta: ¿Cómo hacerlo sin perder internet?

### Respuesta: **MUY SIMPLE** ✅

Port Forwarding en MikroTik **SOLO redirige tráfico entrante en puertos específicos**. No afecta internet.

---

## 10 Pasos (15 minutos)

### 1️⃣ Obtén tu IP local

```powershell
ipconfig
```

Busca: `IPv4 Address` → Ej: `192.168.88.50`

### 2️⃣ Accede a MikroTik

```
http://192.168.88.1
Usuario: admin
Contraseña: (vacío o admin)
```

### 3️⃣ Ve a: IP → Firewall → NAT

### 4️⃣ Crea Regla 1 (Puerto 80)

```
+ New
Chain: dstnat
Protocol: tcp
Dst. Port: 80
Action: dst-nat
To Addresses: 192.168.88.50
To Ports: 80
OK
```

### 5️⃣ Crea Regla 2 (Puerto 443)

```
(Igual, pero Dst. Port: 443, To Ports: 443)
```

### 6️⃣ Crea Regla 3 (Puerto 2107)

```
(Igual, pero Dst. Port: 2107, To Ports: 5173)
```

### 7️⃣ Guarda cambios

```
File → Save
```

### 8️⃣ Reinicia Caddy

```powershell
taskkill /F /IM caddy.exe 2>$null
Start-Sleep -Seconds 2
C:\Caddy\caddy.exe run --config C:\wppconnect2\Caddyfile.txt
```

### 9️⃣ Espera 1-2 minutos

Verás en logs:

```
✅ certificate obtained successfully
```

### 🔟 ¡HTTPS Listo!

```
https://camarafarma.duckdns.org
```

---

## ¿Perderás Internet?

### **NO** ✅

```
Port Forwarding en MikroTik:

1. Redirige SOLO puertos 80, 443, 2107
2. NO toca DHCP
3. NO toca WAN
4. NO afecta otras PCs
5. NO toca configuración general

Resultado:
✅ Tu PC recibe esos puertos
✅ Otras PCs sin cambios
✅ Internet normal
```

---

## Qué Pasará

```
ANTES:
❌ Ports 80, 443 cerrados
❌ Sin certificado SSL
❌ Sin HTTPS

DESPUÉS:
✅ Ports 80, 443, 2107 abiertos
✅ Certificado Let's Encrypt
✅ HTTPS funcionando
✅ Otras PCs con internet normal
```

---

## Si Algo Sale Mal

### Eliminar las reglas (30 segundos):

```
1. IP → Firewall → NAT
2. Selecciona las 3 reglas nuevas
3. Click: Remove
4. File → Save

Internet restaurado ✅
```

---

## Documentos Disponibles

| Documento                           | Para                                   |
| ----------------------------------- | -------------------------------------- |
| `MIKROTIK_RB951_GUIA_RAPIDA.md`     | Guía rápida resumida                   |
| `MIKROTIK_RB951_PORT_FORWARDING.md` | Guía completa detallada                |
| `MIKROTIK_RB951_VISUAL.md`          | Paso a paso con descripciones visuales |

---

## ¿Necesitas Ayuda?

Cuéntame:

1. **¿Cuál es tu IP local?**

   ```powershell
   ipconfig | findstr "IPv4"
   ```

2. **¿Accediste a http://192.168.88.1?**

3. **¿Ves la interfaz web de MikroTik?**

Te ayudaré en tiempo real. 🚀

---

## Resumen Visual

```
┌─ INTERNET ────────────────────────┐
│ https://camarafarma.duckdns.org   │
│ Puertos: 80, 443, 2107            │
└───────────┬───────────────────────┘
            │
     ┌──────▼──────────┐
     │   MikroTik      │
     │   Port Forward  │
     │ 80→80           │
     │ 443→443         │
     │ 2107→5173       │
     └──────┬──────────┘
            │
     ┌──────▼──────────────────┐
     │ Tu PC                   │
     │ 192.168.88.50           │
     │                         │
     │ Caddy (80, 443)  ✅SSL  │
     │ Frontend (5173)  ✅Web  │
     │ Backend (4000)   ✅API  │
     └─────────────────────────┘
            ↓
        HTTPS SEGURO ✅
```

---

## ¡Comienza Ahora!

1. Abre: `MIKROTIK_RB951_GUIA_RAPIDA.md`
2. Sigue los 5 pasos
3. ¡HTTPS Funcionando! 🔐

---

**Tu Internet seguirá funcionando normal en toda tu red.** ✅

No hay riesgo.
No hay complicaciones.
Solo Port Forwarding estándar.

🚀 ¡Vamos!
