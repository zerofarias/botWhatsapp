# 🔧 MikroTik RB951 - Port Forwarding Seguro para Puertos 80, 443 y 2107

## ⚠️ IMPORTANTE: Información Requerida

Primero necesito saber:

```
1. ¿Cuál es la IP LOCAL de tu PC en la red?
   (Generalmente 192.168.x.x)

   Para obtenerla, abre PowerShell y ejecuta:
   ipconfig

   Busca: IPv4 Address bajo tu adaptador de red
   Ejemplo: 192.168.88.50

2. ¿Tu PC está conectada por WiFi o Ethernet?

3. ¿Cuál es la IP pública que ves en DuckDNS?
```

**Comparte estos datos y te guiaré exactamente.**

---

## Lo Que Harás (Resumen)

```
1. Acceder a MikroTik desde navegador
2. Crear 3 reglas de Port Forwarding (sin tocar DHCP)
3. Guardar cambios
4. Reiniciar backend y Caddy

TODO ESTO SIN AFECTAR EL INTERNET DE TUS PCs
```

---

## Paso 1: Acceder a MikroTik

### Opción A: Desde la misma red

Abre navegador y ve a:

```
http://192.168.88.1
```

(O la IP que uses en tu MikroTik, generalmente es esta)

**Usuario:** admin  
**Contraseña:** (deja vacío o admin, según configuración)

### Opción B: Si necesitas IP diferente

En tu PC, abre PowerShell:

```powershell
# Ver puerta de enlace (eso es tu MikroTik)
ipconfig
```

Busca: "Puerta de enlace predeterminada" - esa es la IP de tu router

---

## Paso 2: Ir a Port Forwarding

En la web de MikroTik:

```
1. Ve a: IP → Firewall → NAT
2. Click en "+ Nueva" (o "New")
3. Verás formulario con varias pestañas
```

---

## Paso 3: Crear Regla 1 (Puerto 80)

```
Pestaña: General
├─ Chain: dstnat
├─ Protocol: tcp
├─ Dst. Port: 80

Pestaña: Action
├─ Action: dst-nat
├─ To Addresses: 192.168.88.X (TU PC)
├─ To Ports: 80
└─ Click: APPLY

Luego: OK
```

**IMPORTANTE:**

- **Dst. Port 80**: El puerto que viene de internet
- **To Addresses 192.168.88.X**: LA IP LOCAL DE TU PC
- **To Ports 80**: El puerto en tu PC

---

## Paso 4: Crear Regla 2 (Puerto 443)

Repite lo anterior pero:

```
Pestaña: General
├─ Chain: dstnat
├─ Protocol: tcp
├─ Dst. Port: 443  ← CAMBIAR AQUÍ

Pestaña: Action
├─ Action: dst-nat
├─ To Addresses: 192.168.88.X (IGUAL QUE ARRIBA)
├─ To Ports: 443
└─ Click: APPLY

Luego: OK
```

---

## Paso 5: Crear Regla 3 (Puerto 2107)

```
Pestaña: General
├─ Chain: dstnat
├─ Protocol: tcp
├─ Dst. Port: 2107  ← PUERTO FRONTEND

Pestaña: Action
├─ Action: dst-nat
├─ To Addresses: 192.168.88.X (IGUAL QUE ARRIBA)
├─ To Ports: 5173  ← PUERTO LOCAL VITE
└─ Click: APPLY

Luego: OK
```

---

## Paso 6: Verificar las 3 Reglas

En "IP → Firewall → NAT" deberías ver:

```
Chain    Dst. Port    To Ports    To Addresses
────────────────────────────────────────────────
dstnat   80           80          192.168.88.X
dstnat   443          443         192.168.88.X
dstnat   2107         5173        192.168.88.X
```

---

## ⚠️ NO TOQUES ESTO (Para No Perder Internet)

```
❌ NO cambies DHCP
❌ NO cambies Bridge
❌ NO cambies configuración de WAN
❌ NO cambies IP del router (192.168.88.1)
❌ NO elimines otras reglas que existan

✅ SOLO crea las 3 nuevas reglas NAT
```

---

## Paso 7: Guardar Cambios

En MikroTik:

```
Click en: File → Save
O simplemente: Ctrl + S
```

**Las reglas se aplican inmediatamente.**

---

## Paso 8: Reiniciar Servicios en tu PC

En PowerShell (en tu PC):

```powershell
# Detén Caddy si está corriendo
taskkill /F /IM caddy.exe 2>$null

# Espera 2 segundos
Start-Sleep -Seconds 2

# Reinicia Caddy
C:\Caddy\caddy.exe run --config C:\wppconnect2\Caddyfile.txt
```

Caddy intentará obtener certificado. Espera 1-2 minutos.

---

## Verificación Rápida

Desde tu PC:

```powershell
# 1. Verifica que estás escuchando en puerto 80
netstat -an | findstr ":80 " | findstr "LISTENING"

# 2. Verifica que estás escuchando en puerto 443
netstat -an | findstr ":443 " | findstr "LISTENING"

# 3. Verifica que tienes frontend en 5173
netstat -an | findstr ":5173 " | findstr "LISTENING"
```

Deberías ver algo como:

```
TCP    0.0.0.0:80     LISTENING
TCP    0.0.0.0:443    LISTENING
TCP    127.0.0.1:5173 LISTENING
```

---

## ¿Qué Significa Cada Regla?

### Regla 1: Puerto 80

```
Cuando alguien de INTERNET accede a: http://camarafarma.duckdns.org
MikroTik redirige al puerto 80 de tu PC
Caddy lo recibe y redirige a HTTPS
```

### Regla 2: Puerto 443

```
Cuando alguien de INTERNET accede a: https://camarafarma.duckdns.org
MikroTik redirige al puerto 443 de tu PC
Caddy lo recibe y sirve HTTPS seguro
```

### Regla 3: Puerto 2107

```
Cuando alguien de INTERNET accede a: https://camarafarma.duckdns.org:2107
MikroTik redirige al puerto 5173 de tu PC
Frontend Vite responde
```

---

## ¿Perderás Internet?

**NO. Explicación:**

```
Las 3 reglas que creaste:
- Redirigen tráfico ENTRANTE (de internet)
- Van a puertos específicos (80, 443, 2107)
- NO tocan el tráfico SALIENTE (tu internet)
- NO tocan DHCP
- NO tocan configuración general

Resultado: Tus otras PCs siguen con internet normal
            Solo tu PC recibe el tráfico de esos 3 puertos
```

---

## Si Algo Sale Mal

Si pierdes internet:

### Opción 1: Eliminar reglas desde MikroTik

```
1. Accede a MikroTik web
2. IP → Firewall → NAT
3. Selecciona las 3 reglas que creaste
4. Click: Eliminar (Delete)
5. File → Save
```

### Opción 2: Reset de MikroTik

```
Botón físico RESET en el router (mantén 10 segundos)
(Pierde toda configuración, pero vuelve a funcionar)
```

---

## Alternativa: Usar WinBox (Más Fácil)

Si prefieres interfaz gráfica:

```
1. Descarga: https://mikrotik.com/download
   Busca: WinBox

2. Ejecuta WinBox.exe
3. Click: "Connect"
4. Selecciona tu MikroTik
5. Ve a: IP → Firewall → NAT
6. Mismos pasos que arriba pero más visuales
```

---

## Resumen de Cambios

| Elemento             | Acción         | Impacto        |
| -------------------- | -------------- | -------------- |
| Port Forwarding 80   | Crear          | ✅ Sin impacto |
| Port Forwarding 443  | Crear          | ✅ Sin impacto |
| Port Forwarding 2107 | Crear          | ✅ Sin impacto |
| DHCP                 | Ninguno        | ✅ Sin cambios |
| Conexión otras PCs   | Ninguna        | ✅ Sin cambios |
| Tu PC                | Recibe tráfico | ✅ Esperado    |

---

## Checklist

- [ ] Obtuve mi IP local (192.168.88.X)
- [ ] Accedí a MikroTik web
- [ ] Creé regla NAT para puerto 80
- [ ] Creé regla NAT para puerto 443
- [ ] Creé regla NAT para puerto 2107
- [ ] Guardé cambios en MikroTik
- [ ] Reinicié Caddy en mi PC
- [ ] Esperé 1-2 minutos
- [ ] Veo "certificate obtained successfully" en Caddy
- [ ] Accedo a https://camarafarma.duckdns.org

---

## Siguientes Pasos

1. **Consigue tu IP local:**

   ```powershell
   ipconfig
   ```

   Busca: IPv4 Address

2. **Accede a MikroTik**

3. **Crea las 3 reglas NAT** (como se explica arriba)

4. **Guarda cambios**

5. **Reinicia Caddy en tu PC**

6. **¡Certificado obtenido!** ✅

---

**¿Necesitas que sea más específico? Cuéntame:**

- ¿Cuál es tu IP local?
- ¿Ves la interfaz web de MikroTik?
- ¿Accedes desde la misma red o remoto?

Te guiaré paso a paso. 🚀
