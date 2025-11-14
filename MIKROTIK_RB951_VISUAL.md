# 📺 MikroTik RB951 - Guía Visual Paso a Paso

## PASO 1: Obtén tu IP Local

### En PowerShell:

```powershell
ipconfig
```

### Busca esto:

```
Adaptador de Ethernet ethernet:

   Dirección IPv4 . . . . . . . . . . : 192.168.88.50
   Máscara de subred  . . . . . . . . : 255.255.255.0
   Puerta de enlace predeterminada  . : 192.168.88.1
```

**IMPORTANTE:**

- `Dirección IPv4`: Esta es TU IP → **192.168.88.50**
- `Puerta de enlace`: Esta es el ROUTER → 192.168.88.1

**Anota tu IP (ej: 192.168.88.50)**

---

## PASO 2: Accede a MikroTik Web

### En navegador escribe:

```
http://192.168.88.1
```

Presiona Enter.

### Verás esta página:

```
┌─────────────────────────────────────┐
│  MikroTik RouterOS                  │
│                                     │
│  Login:                             │
│  ┌──────────────────────────────┐   │
│  │ Name: admin                  │   │
│  │ Password: ________           │   │
│  │ [  Login  ]                  │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Credenciales:**

- Name: `admin`
- Password: `(dejar vacío)` o `admin`

Click: **Login**

---

## PASO 3: Ir a Firewall NAT

### Lado izquierdo del menú:

```
Menu
├─ System
├─ Queue
├─ Bridge
├─ IP  ← CLICK AQUÍ
│  ├─ Addresses
│  ├─ Routes
│  ├─ Firewall  ← CLICK AQUÍ
│  │  ├─ Filter Rules
│  │  ├─ Connection Tracking
│  │  └─ NAT  ← CLICK AQUÍ
│  └─ ...
├─ Interface
└─ ...
```

### Deberías ver:

```
┌─────────────────────────────────────────┐
│ Firewall - NAT                          │
├─────────────────────────────────────────┤
│ [+ New] [Edit] [Remove] [Disable]      │
├─────────────────────────────────────────┤
│                                         │
│ (Probablemente vacío o con pocas)      │
│                                         │
└─────────────────────────────────────────┘
```

---

## PASO 4: Crear Regla 1 (Puerto 80)

### Click en: [+ New]

Se abre formulario:

```
┌──────────────────────────────────────┐
│ New NAT Rule                         │
├──────────────────────────────────────┤
│ [General] [Action] [Advanced]...     │
│                                      │
│ Chain:           [dstnat       ▼]    │
│ Src. Address:    [     empty    ]    │
│ Dst. Address:    [     empty    ]    │
│ Protocol:        [tcp           ▼]   │
│ Dst. Port:       [     empty    ]    │
│ In. Interface:   [     empty    ]    │
│                                      │
│          [Apply] [Cancel]            │
└──────────────────────────────────────┘
```

### Rellena:

```
Pestaña: General

Chain:        dstnat       (ya está)
Protocol:     tcp          (ya está)
Dst. Port:    80           ← ESCRIBE 80

Click: [Apply]
```

### Luego va a pestaña: Action

```
┌──────────────────────────────────────┐
│ [General] [Action] [Advanced]...     │
│                                      │
│ Action:       [dst-nat        ▼]     │
│ To Addresses: [192.168.88.50  ]  ← TU IP
│ To Ports:     [80             ]      │
│                                      │
│          [Apply] [Cancel]            │
└──────────────────────────────────────┘
```

### Rellena:

```
To Addresses: 192.168.88.50  (TU IP LOCAL)
To Ports:     80

Click: [OK]
```

✅ **Regla 1 creada**

---

## PASO 5: Crear Regla 2 (Puerto 443)

### Click en: [+ New]

Repite lo anterior pero:

```
Pestaña: General
Dst. Port: 443  ← CAMBIAR A 443

Pestaña: Action
To Addresses: 192.168.88.50  (IGUAL)
To Ports:     443            ← CAMBIAR A 443

Click: [OK]
```

✅ **Regla 2 creada**

---

## PASO 6: Crear Regla 3 (Puerto 2107 → 5173)

### Click en: [+ New]

```
Pestaña: General
Dst. Port: 2107  ← PUERTO EXTERNO

Pestaña: Action
To Addresses: 192.168.88.50  (TU IP)
To Ports:     5173           ← PUERTO VITE (¡NO 2107!)

Click: [OK]
```

✅ **Regla 3 creada**

---

## PASO 7: Ver las 3 Reglas

### Deberías ver en NAT:

```
┌────────────────────────────────────────┐
│ Firewall - NAT                         │
├────────────────────────────────────────┤
│ [+ New] [Edit] [Remove] [Disable]     │
├────────────────────────────────────────┤
│                                        │
│ Chain  Src.Add Dst.Add Pro Dst Port To │
│ dstnat        -  tcp  80  192.168.88.50│
│ dstnat        -  tcp  443 192.168.88.50│
│ dstnat        -  tcp  2107 192.168.88.50│
│                                        │
└────────────────────────────────────────┘
```

---

## PASO 8: Guardar Cambios

### En MikroTik web:

**Opción 1:** Menu → File → Save

**Opción 2:** Ctrl + S

```
✅ Changes saved successfully
```

---

## PASO 9: Reiniciar Caddy en tu PC

En PowerShell:

```powershell
taskkill /F /IM caddy.exe 2>$null
Start-Sleep -Seconds 2
C:\Caddy\caddy.exe run --config C:\wppconnect2\Caddyfile.txt
```

Espera 1-2 minutos...

Verás:

```
✅ INFO tls.obtain certificate obtained successfully
```

---

## PASO 10: ¡Accede a HTTPS!

En navegador:

```
https://camarafarma.duckdns.org
```

Deberías ver:

```
🔐 SSL activo en camarafarma.duckdns.org
```

**Sin warnings de certificado** ✅

---

## Diagrama Flujo Completo

```
┌─ INTERNET ─────────────────────┐
│ User accede a:                 │
│ https://camarafarma.duckdns.org│
│ Puerto: 443 (HTTPS)            │
└────────────┬────────────────────┘
             │
    ┌────────▼──────────┐
    │   MikroTik RB951  │
    │  (Port Forwarding)│
    │                  │
    │ 80 → Tu PC:80   │
    │ 443 → Tu PC:443 │
    │ 2107 → Tu PC:5173│
    └────────┬──────────┘
             │
    ┌────────▼──────────────┐
    │ Tu PC (192.168.88.50) │
    │                       │
    │ Caddy :80, :443       │
    │ Frontend :5173        │
    │ Backend :4000         │
    └───────────────────────┘
             ↓
        ✅ HTTPS ACTIVO
```

---

## Checklist Visual

```
ANTES:
❌ Puertos 80, 443 cerrados
❌ Sin certificado
❌ Sin HTTPS

AHORA:
✅ Puertos 80, 443, 2107 abiertos
✅ Certificado Let's Encrypt
✅ HTTPS Funcionando
✅ Sin warnings en navegador
✅ Otras PCs con internet normal
```

---

## ¿Algo Sale Mal?

### Si MikroTik web no carga

```
Intenta:
1. http://192.168.88.1:8080
2. Reinicia MikroTik (botón reset)
3. Accede desde otra PC
```

### Si pierdes internet

```
1. Accede a MikroTik web
2. IP → Firewall → NAT
3. Selecciona las 3 reglas nuevas
4. Click: [Remove]
5. File → Save
```

### Si Caddy no obtiene certificado

```
1. Verifica puertos abiertos:
   netstat -an | findstr ":80\|:443"

2. Verifica DNS:
   nslookup camarafarma.duckdns.org

3. Verifica logs de Caddy
```

---

## Resumen

| Paso | Qué Haces          | Resultado                 |
| ---- | ------------------ | ------------------------- |
| 1    | Obtener IP local   | Tienes: 192.168.88.X      |
| 2    | Acceder a MikroTik | Ves interfaz web          |
| 3    | Ir a NAT           | Ves lista de reglas       |
| 4-6  | Crear 3 reglas     | 3 reglas NAT creadas      |
| 7    | Guardar cambios    | Cambios aplicados         |
| 8    | Reiniciar Caddy    | Caddy obtiene certificado |
| 9    | Acceder a HTTPS    | ¡HTTPS funciona! ✅       |

---

**¡Ya estás listo!** 🚀

¿Tienes dudas en algún paso?
