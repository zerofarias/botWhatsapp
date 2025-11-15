# 📊 Requisitos Hardware para Ubuntu Server (100 Mensajes/Día)

## 🎯 Especificaciones de Carga

**Volumen:** 100 mensajes/día  
**Promedio:** ~4 mensajes/hora  
**Pico:** ~10-15 mensajes/hora (horarios activos)  
**Uptime requerido:** 24/7  
**Plataforma:** Ubuntu Server 22.04 LTS (sin GUI)  
**Modo:** Headless (sin monitor)

---

## 💾 ANÁLISIS DE MEMORIA RAM (Ubuntu Server)

### Consumo por Componente (SIN Interfaz Gráfica)

```
┌─ Node.js Backend (Express + Socket.IO)
│  ├─ Base: 120-150 MB
│  ├─ Por conexión activa: 2-5 MB
│  ├─ Con 10-20 conexiones: +40-80 MB
│  ├─ Con clustering (si usas): +30-50 MB
│  └─ Subtotal: 160-280 MB

├─ MySQL/MariaDB Database
│  ├─ Servicio base: 80-120 MB
│  ├─ Por 100 msgs/día: +40-80 MB
│  ├─ InnoDB buffer pool: 100-200 MB
│  └─ Subtotal: 220-400 MB

├─ Socket.IO Real-Time
│  ├─ Conexiones activas: 15-40 MB
│  └─ Subtotal: 15-40 MB

├─ Redis (si usas para cache)
│  ├─ Base: 30-50 MB
│  └─ Subtotal: 30-50 MB (OPCIONAL)

├─ Ubuntu Server Base
│  ├─ Kernel Linux: 300-500 MB
│  ├─ Systemd + Servicios: 100-200 MB
│  ├─ SSH servidor: 20-30 MB
│  ├─ Otros servicios: 50-100 MB
│  └─ Subtotal: 470-830 MB

└─ Buffer y Cache del Kernel
   ├─ Page cache: 100-300 MB
   ├─ Network buffers: 30-50 MB
   ├─ Slab allocator: 50-100 MB
   └─ Subtotal: 180-450 MB
```

### Cálculo Total (Ubuntu Server)

```
ESCENARIO MÍNIMO (Reposo):
  ├─ Backend Node.js: 160 MB
  ├─ MySQL: 220 MB
  ├─ Socket.IO: 15 MB
  ├─ Ubuntu Server: 470 MB
  ├─ Buffer/Cache: 180 MB
  └─ TOTAL: ~1,045 MB (1.0 GB) ✅ MUCHO MENOR

ESCENARIO PROMEDIO (Activo):
  ├─ Backend Node.js: 220 MB
  ├─ MySQL: 300 MB
  ├─ Socket.IO: 25 MB
  ├─ Ubuntu Server: 600 MB
  ├─ Buffer/Cache: 300 MB
  └─ TOTAL: ~1,445 MB (1.4 GB) ✅ MUY EFICIENTE

ESCENARIO PICO (100+ msgs/hora):
  ├─ Backend Node.js: 280 MB
  ├─ MySQL: 400 MB
  ├─ Socket.IO: 40 MB
  ├─ Ubuntu Server: 700 MB
  ├─ Buffer/Cache: 450 MB
  └─ TOTAL: ~1,870 MB (1.9 GB) ✅ EXCELENTE

ESCENARIO CON REDIS (Cache):
  ├─ Backend Node.js: 220 MB
  ├─ MySQL: 300 MB
  ├─ Redis: 50 MB
  ├─ Socket.IO: 25 MB
  ├─ Ubuntu Server: 600 MB
  ├─ Buffer/Cache: 300 MB
  └─ TOTAL: ~1,495 MB (1.5 GB) ✅ SIGUE SIENDO EFICIENTE
```

### ✅ RECOMENDACIÓN DE RAM (Ubuntu Server)

| Escenario                          | RAM Mínima | RAM Recomendada | RAM Óptima |
| ---------------------------------- | ---------- | --------------- | ---------- |
| **Solo producción (100 msgs/día)** | 1 GB       | **2 GB**        | 4 GB       |
| **Con base de datos local**        | 2 GB       | **4 GB**        | 8 GB       |
| **Con Redis cache**                | 2 GB       | **4 GB**        | 8 GB       |
| **Margen de seguridad**            | 512 MB     | **1-2 GB**      | 2-4 GB     |

**Mi recomendación:** **2 GB RAM mínimo, 4 GB recomendado**

### Comparativa Windows vs Ubuntu

```
╔════════════════════════════════════════════════════════════╗
║            COMPARATIVA: WINDOWS 11 vs UBUNTU SERVER        ║
╠════════════════════════════════════════════════════════════╣
║ Aspecto              │ Windows 11      │ Ubuntu Server      ║
├──────────────────────┼─────────────────┼────────────────────┤
║ RAM Mínima           │ 4 GB            │ 1-2 GB ✅          ║
║ RAM Recomendada      │ 8 GB            │ 2-4 GB ✅✅        ║
║ Ahorro de RAM        │ Baseline        │ 50-60% menos ✅    ║
║ Overhead SO          │ 1.5-2 GB        │ 0.3-0.5 GB ✅✅    ║
║ GUI/X11              │ Sí (mandatorio) │ No (headless) ✅   ║
║ Consumo Disco        │ 20-30 GB        │ 5-10 GB ✅✅       ║
║ Consumo CPU          │ 2-8% baseline   │ 0.2-0.5% ✅✅      ║
║ Actualizaciones      │ Automáticas     │ Controladas ✅     ║
║ Uptime potencial     │ Bueno           │ Excelente ✅✅✅   ║
╚════════════════════════════════════════════════════════════╝
```

---

## 🖥️ ANÁLISIS DE PROCESADOR (Ubuntu Server)

### Cargas por Componente (Ubuntu Server Optimizado)

```
┌─ Procesamiento de Mensajes (Eficiente en Linux)
│  ├─ Recibir + parsear: 3-5 ms (Linux es faster)
│  ├─ Validación: 1-2 ms
│  ├─ Base de datos INSERT: 5-15 ms
│  ├─ Broadcast Socket.IO: 2-5 ms
│  └─ Total por mensaje: 15-25 ms (50% MENOS que Windows)
│
├─ Con 100 mensajes/día
│  ├─ Carga sostenida: 0.02-0.04% de CPU
│  ├─ Picos horarios (10 msgs/hora): 0.2-0.8% de CPU
│  └─ Subprocesos inactivos: 95-99% del tiempo
│
├─ Node.js en Linux
│  ├─ Event loop: 1 thread principal (MÁS EFICIENTE)
│  ├─ Worker threads: 2-4 threads (si usas)
│  ├─ MySQL conexiones: pool de 5-10 threads
│  ├─ TCP/IP stack: OPTIMIZADO en Linux
│  └─ Total threads: 8-14 (MENOS overhead)
│
├─ Linux Kernel Baseline
│  ├─ Kernel + Servicios: 0.2-0.5% (MÍNIMO)
│  ├─ SSH daemon: < 0.1%
│  ├─ Cron/Timers: < 0.1%
│  ├─ Storage I/O: Bajo (SSD)
│  └─ Total sistema: 0.5-1% baseline (MUY EFICIENTE)
│
└─ Capacidad Necesaria por CPU
   ├─ Para 100 msgs/día: 0.2-0.8% de CPU
   ├─ Margen de seguridad 5x: 1-4% utilización ideal
   └─ Capacidad remanente: 96-99%
```

### ⚙️ Generaciones de CPU (Ubuntu Server)

| Procesador                 | Núcleos | Threads | TDP | Recomendado      | Notas                  |
| -------------------------- | ------- | ------- | --- | ---------------- | ---------------------- |
| **Intel Core i3-12100**    | 4       | 8       | 60W | ✅✅ Excelente   | Overkill para 100 msgs |
| **Intel Core i5-12400**    | 6       | 12      | 65W | ✅✅✅ Ideal     | Futuro-proof           |
| **Intel Celeron G6900**    | 2       | 2       | 35W | ✅ Suficiente    | Mínimo viable          |
| **Intel Xeon E-2186G**     | 6       | 12      | 95W | ✅✅✅ VPS-grade | Producción             |
| **AMD Ryzen 5 5500**       | 6       | 12      | 65W | ✅✅✅ Ideal     | Buena relación         |
| **ARM64 (Raspberry Pi 4)** | 4       | 4       | 5W  | ⚠️ Límite        | Solo para testing      |

### ✅ RECOMENDACIÓN DE CPU (Ubuntu Server)

| Escenario                        | Mínimo            | Recomendado         | Óptimo          |
| -------------------------------- | ----------------- | ------------------- | --------------- |
| **100 msgs/día (puro servidor)** | Dual-core 2.0 GHz | **2-core 2.5+ GHz** | 4-core 3.0+ GHz |
| **Con múltiples servicios**      | 2-core            | **4-core**          | 6-core          |
| **Cores necesarios**             | 2 cores           | **2-4 cores**       | 4-6 cores       |
| **GHz necesarios**               | 1.5 GHz           | **2.0+ GHz**        | 2.5+ GHz        |

**Mi recomendación:** **Intel i3-12100 o similar (4 cores, 2.0+ GHz)**

---

## 📊 Comparativa de Opciones de Infraestructura

### Opción 1: PC Vieja en Casa (Más Barato)

```
Hardware:
  ├─ PC Antigua (2015-2018)
  ├─ Intel i5 6500 / i7 6700K
  ├─ 8 GB RAM DDR4
  ├─ 256 GB SSD
  └─ Costo: Reutilizable (~$0 si tienes)

Características:
  ✅ 4 cores / 8 threads (más que suficiente)
  ✅ 8 GB RAM (exceso para Ubuntu Server)
  ✅ Eficiencia energética BAJA (100-150W)
  ✅ Uptime: 24/7 posible
  ⚠️ Ruido: Ventiladores activos
  ⚠️ Energía: Alto consumo eléctrico
  ⚠️ Confiabilidad: Componentes envejecidos

Recomendación: ✅ EXCELENTE si tienes disponible
```

### Opción 2: Servidor Dedicado en la Nube (Escalable)

```
DigitalOcean Droplet / Linode:
  ├─ Plan: 1 GB RAM / 1 vCPU
  ├─ Costo: $5-6 USD/mes
  ├─ Ubuntu 22.04 LTS
  ├─ SSD 25 GB
  └─ Uptime SLA: 99.99%

Características:
  ✅ 1-2 vCPU (suficiente)
  ✅ 1-2 GB RAM (recomendado)
  ✅ Backups automáticos
  ✅ Actualizaciones de kernel sin parar
  ✅ IP pública dedicada
  ✅ Escalable (aumentar recursos fácil)
  ⚠️ Dependencia de internet del proveedor
  ⚠️ Latencia de red variable

Recomendación: ⭐ MEJOR para producción

Escalabilidad:
  100 msgs/día   → $5/mes (1 GB RAM, 1 vCPU)
  1,000 msgs/día → $12/mes (2 GB RAM, 2 vCPU)
  5,000 msgs/día → $24/mes (4 GB RAM, 2 vCPU)
  10,000+ msgs/día → $40+/mes (8 GB RAM, 4 vCPU)
```

### Opción 3: VPS Especializado (Equilibrio)

```
Hetzner Cloud / Vultr:
  ├─ Plan: CPX11 (1-2 vCPU / 2 GB RAM)
  ├─ Costo: $3-6 USD/mes
  ├─ Ubuntu 22.04 LTS
  ├─ SSD 25-40 GB
  └─ Uptime SLA: 99.9%

Características:
  ✅ Precio muy competitivo
  ✅ Mejor hardware que DigitalOcean
  ✅ Conexión más rápida
  ✅ DDoS protection
  ⚠️ Menos opciones de add-ons
  ⚠️ Panel menos intuitivo

Recomendación: ⭐ MEJOR relación precio-rendimiento
```

### Opción 4: Raspberry Pi 4 (Presupuesto Extremo)

```
Hardware:
  ├─ Raspberry Pi 4 Model B
  ├─ 2 GB RAM (mínimo) / 4 GB (recomendado)
  ├─ SD Card 32 GB
  ├─ Carcasa + PSU: ~$100 USD
  └─ Costo TOTAL: ~$80-120 USD

Características:
  ✅ Súper eficiente energéticamente (5W)
  ✅ Bajo costo inicial
  ✅ Silencioso
  ✅ Compacto
  ✅ Bueno para desarrollo/testing
  ❌ ARM64 (algunas compatibilidades)
  ❌ Performance: LENTO para producción
  ⚠️ No recomendado para 24/7 en producción

Recomendación: ⚠️ Solo para testing/desarrollo
```

---

## 🚀 CONFIGURACIONES RECOMENDADAS

### ✅ OPCIÓN 1: Servidor en Casa (Reutilizar PC vieja)

```
Hardware:
  ├─ PC Antigua o Gaming Mid-Range
  ├─ Intel i5 (6500+) / AMD Ryzen 5 (2600+)
  ├─ 8 GB RAM DDR4
  ├─ 512 GB SSD NVMe
  ├─ Ethernet dedicado
  ├─ UPS (batería backup 1-2 horas)
  └─ Costo: Reutilizable (~$0) o $300-500 USD (si compras)

SO:
  ├─ Ubuntu Server 22.04 LTS
  ├─ Kernel: Máximo rendimiento
  └─ Uptime Target: 24/7

Servicios:
  ├─ Node.js v18+
  ├─ MySQL 8.0 / MariaDB 10.6
  ├─ Redis (opcional, para cache)
  ├─ Nginx (reverse proxy)
  └─ SSH + Monitoreo

Consumo Estimado:
  ├─ Potencia: 70-100W
  ├─ Energía anual: ~600-880 kWh
  ├─ Costo anual: ~$100-150 USD
  └─ Conexión: FIJA en casa

Ventajas:
  ✅ Propiedad 100% del hardware
  ✅ Sin costo mensual de suscripción
  ✅ Control total de infraestructura
  ✅ Latencia baja (tu red local)

Desventajas:
  ❌ Dependencia de tu internet
  ❌ Responsabilidad de backups
  ❌ Refrigeración 24/7
  ❌ Factura de electricidad
  ❌ Sin redundancia/failover

Recomendado para: ⭐ Pequeñas operaciones, MVP, testing
```

### ⭐ OPCIÓN 2: VPS en la Nube (RECOMENDADO)

```
Proveedor: Hetzner Cloud / DigitalOcean

Especificaciones:
  ├─ Plan: CPX11 o Droplet 1GB
  ├─ vCPU: 2 cores ARM64 / x86
  ├─ RAM: 2 GB DDR4
  ├─ Almacenamiento: 40 GB SSD NVMe
  ├─ Ancho de banda: 20-40 TB/mes
  ├─ IP pública: Dedicada
  ├─ Ubicación: Datacenter cercano (Latam: Brasilia/Miami)
  └─ Costo: $5-6 USD/mes

SO:
  ├─ Ubuntu Server 22.04 LTS (preinstalado)
  ├─ Actualizaciones automáticas
  ├─ Firewall configurado
  └─ Backups automáticos (opcional)

Servicios:
  ├─ Node.js v18+ (compilado para ARM64 si aplica)
  ├─ MySQL 8.0 / MariaDB 10.6 (optimizado para VPS)
  ├─ Redis (si escalas)
  ├─ Nginx (reverse proxy, SSL automático)
  ├─ Monitoreo 24/7
  └─ Alertas automáticas

Consumo Estimado:
  ├─ Potencia: Manejada por datacenter
  ├─ Costo mensual: $5-6 USD
  ├─ Costo anual: $60-72 USD (MUCHO MENOS que electricidad local)
  └─ Incluso IPs, SSL, backups

Ventajas:
  ✅ Profesional 24/7
  ✅ Uptime 99.9%+
  ✅ Escalable fácilmente
  ✅ Backups automáticos
  ✅ DDoS protection
  ✅ SSL certificados (Let's Encrypt)
  ✅ No responsabilidad de hardware
  ✅ Independencia de tu internet local

Desventajas:
  ❌ Costo mensual ($5-6)
  ❌ Dependencia de proveedor
  ❌ Latencia ligeramente mayor (pero mínima)

Escalabilidad:
  100 msgs/día    → $5/mes (1 vCPU, 1-2 GB RAM)
  500 msgs/día    → $6/mes (2 vCPU, 2 GB RAM)
  1,000 msgs/día  → $12/mes (2 vCPU, 4 GB RAM)
  5,000 msgs/día  → $24/mes (4 vCPU, 8 GB RAM)

Recomendado para: ⭐⭐⭐ PRODUCCIÓN + Crecimiento futuro
```

### 🚀 OPCIÓN 3: Servidor Híbrido (Casa + Backup en Nube)

```
Infraestructura:
  ├─ Servidor Principal: PC en casa (costo: bajo/nulo)
  ├─ Servidor Backup: VPS $5/mes (redundancia)
  ├─ Base de datos: MySQL replicada entre ambos
  ├─ Balanceo: Basado en DNS/Failover manual
  └─ Costo Total: $0-5/mes (si casa es gratuita)

Ventajas:
  ✅ Redundancia alta
  ✅ Failover manual disponible
  ✅ Aprovechar PC en casa (costo: ~$0)
  ✅ VPS backup es barato ($5)
  ✅ Escalable: agregar más VPS fácil

Desventajas:
  ❌ Complejo de administrar
  ❌ Sincronización de datos
  ❌ Monitoreo requerido

Recomendado para: ⭐ Usuarios avanzados, alta disponibilidad
```

---

## 📋 Configuración Exacta Recomendada (Para Ti)

### 🎯 MEJOR OPCIÓN: VPS Hetzner CPX11

```bash
# Crear instancia
Hetzner Cloud Console
  ├─ Imagen: Ubuntu 22.04
  ├─ Localización: Falkenstein (EU) o Ashburn (USA)
  ├─ Tipo: CPX11 (2 vCPU ARM64, 2 GB RAM, 40 GB SSD)
  ├─ Red: Pública + Privada (opcional)
  └─ Costo: €3.29/mes (~$3.50 USD)

# Instalación inicial (SSH)
ssh root@<tu-ip>

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias
sudo apt install -y curl wget git build-essential

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar MySQL
sudo apt install -y mysql-server

# Instalar Redis (opcional)
sudo apt install -y redis-server

# Instalar Nginx (reverse proxy)
sudo apt install -y nginx

# Configurar Nginx para Socket.IO
sudo nano /etc/nginx/sites-available/default
# [Agregar configuración para tu dominio]

# Replicar tu código
git clone https://github.com/zerofarias/botWhatsapp.git /home/ubuntu/botWhatsapp
cd /home/ubuntu/botWhatsapp/platform-backend
npm install
npm run build

# Iniciar con PM2 (gestor de procesos)
sudo npm install -g pm2
pm2 start npm --name "backend" -- start
pm2 startup
pm2 save

# Monitoreo
pm2 monit
# O acceder a PM2 Plus para alertas
```

**Costo Anual:** ~$42 USD  
**Performance:** ⭐⭐⭐⭐⭐  
**Escalabilidad:** ⭐⭐⭐⭐⭐  
**Facilidad:** ⭐⭐⭐⭐

---

## 🔧 Optimizaciones para Ubuntu Server

### 1. Kernel Tuning para Red

```bash
# /etc/sysctl.conf
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.ip_local_port_range = 10000 65000
net.core.somaxconn = 2048
net.ipv4.tcp_fin_timeout = 30

# Aplicar
sudo sysctl -p
```

### 2. Limits de Archivo (Para Node.js)

```bash
# /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
```

### 3. MySQL Optimizado para VPS

```bash
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
max_connections = 100
key_buffer_size = 16M
max_allowed_packet = 16M
thread_stack = 192K
thread_cache_size = 8
myisam_recover_options = BACKUP
query_cache_limit = 1M
query_cache_size = 16M
default_storage_engine = InnoDB
innodb_buffer_pool_size = 512M
innodb_log_file_size = 100M
innodb_file_per_table = 1
```

### 4. Node.js Clustering (Para múltiples cores)

```javascript
// platform-backend/src/index.ts
import cluster from 'cluster';
import os from 'os';

if (cluster.isMaster && process.env.CLUSTER_ENABLED === 'true') {
  const numWorkers = os.cpus().length;

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  console.log(`Master process ${process.pid} running ${numWorkers} workers`);
} else {
  // Tu código normal de inicialización
}
```

### 5. Monitoreo Remoto

```bash
# Instalar PM2 Plus (monitoreo en nube)
npm install -g pm2
pm2 set pm2:max_memory_restart 100M

# Configurar alertas
pm2 plus
# Crear cuenta gratuita en https://pm2.io
```

---

## ⚖️ COMPARATIVA FINAL: Windows 11 vs Ubuntu Server

```
╔══════════════════════════════════════════════════════════════════════════╗
║                  WINDOWS 11 vs UBUNTU SERVER (100 msgs/día)             ║
╠═══════════════════════════════════════════════╦═════════════╦════════════╣
║ Criterio                                      ║ Windows 11  ║ Ubuntu     ║
╠═══════════════════════════════════════════════╬═════════════╬════════════╣
║ RAM Recomendada                               ║ 8 GB        ║ 2 GB   ✅✅║
║ CPU Recomendado                               ║ i5-12400    ║ i3-12100✅║
║ Consumo Eléctrico (24/7)                      ║ 100-150W    ║ 50-70W ✅ ║
║ Costo Mensual (electricidad)                  ║ $15-25      ║ $5-10  ✅ ║
║ Costo Hardware Inicial                        ║ $600-900    ║ $5/mes ✅ ║
║ Overhead SO                                   ║ 1.5-2 GB    ║ 0.3 GB ✅✅║
║ Uptime 24/7 Práctico                          ║ Bueno       ║ Excelente✅║
║ Facilidad Mantenimiento                       ║ Fácil       ║ Medio ⚠️  ║
║ Escalabilidad                                 ║ Complicada  ║ Trivial✅✅║
║ Costo Escalamiento                            ║ +$300-600   ║ +$5/mes✅✅║
║ Seguridad                                     ║ Buena       ║ Excelente✅║
║ Performance                                   ║ Bueno       ║ Excelente✅║
║ Confiabilidad 24/7                            ║ Media       ║ Excelente✅║
║ Backup Automático                             ║ No ⚠️       ║ Sí ✅     ║
║ DDoS Protection                               ║ No ⚠️       ║ Sí ✅     ║
║ Independencia Internet Local                  ║ No ⚠️       ║ Sí ✅     ║
╚═══════════════════════════════════════════════╩═════════════╩════════════╝

GANADOR OVERALL: UBUNTU SERVER EN VPS ✅✅✅
```

---

## 🎯 MI RECOMENDACIÓN FINAL

### Para 100 Mensajes/Día:

```
╔════════════════════════════════════════════════════════════╗
║                  🏆 OPCIÓN RECOMENDADA 🏆                 ║
║                                                            ║
║  VPS HETZNER CLOUD CPX11 (O DigitalOcean Droplet 1GB)    ║
║                                                            ║
║  Especificaciones:                                         ║
║  ├─ 2 vCPU ARM64 / 2 GHz+                                 ║
║  ├─ 2 GB RAM DDR4                                         ║
║  ├─ 40 GB SSD NVMe                                        ║
║  ├─ Ubicación: Brasilia / Frankfurt / Miami              ║
║  └─ Costo: €3.29-5/mes (~$3.50-5 USD/mes)                ║
║                                                            ║
║  Por Qué:                                                  ║
║  ✅ 60-70% MENOS costo que Windows en casa                ║
║  ✅ 50-60% MENOS consumo de RAM                           ║
║  ✅ Uptime profesional 99.9%+                             ║
║  ✅ Backups y seguridad incluidos                         ║
║  ✅ Escalable (agregar resources en segundos)            ║
║  ✅ No ocupas tu internet local                           ║
║  ✅ No responsabilidad de hardware físico                 ║
║  ✅ Incluso certificado SSL Let's Encrypt                ║
║                                                            ║
║  Costo Anual: €39.48 (~$42 USD/año) ✅                  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### Instalación Rápida (10 minutos):

1. **Crear cuenta en Hetzner Cloud** (https://www.hetzner.cloud)
2. **Crear Droplet CPX11** con Ubuntu 22.04
3. **SSH a la instancia:** `ssh root@<ip>`
4. **Ejecutar script de instalación** (ver sección de configuración)
5. **Clonar tu repo:** `git clone ...`
6. **Instalar dependencias:** `npm install`
7. **Iniciar con PM2:** `pm2 start npm`
8. **Configurar dominio** con DuckDNS
9. **Listo:** Tu bot corriendo 24/7 ✅

---

## 📌 Resumen Técnico

| Aspecto                | Windows 11   | Ubuntu Server           |
| ---------------------- | ------------ | ----------------------- |
| **RAM Requerida**      | 8 GB         | **2-4 GB** ✅           |
| **CPU Requerida**      | i5-12400     | **i3 o equivalente** ✅ |
| **Consumo Energético** | 100-150W     | **50-70W** ✅           |
| **Costo Mensual**      | $15-25 (luz) | **$0-5 (VPS)** ✅       |
| **Costo Hardware**     | $600-900     | **$3.50/mes** ✅        |
| **Overhead OS**        | 1.5-2 GB     | **0.3-0.5 GB** ✅       |
| **Escalabilidad**      | Difícil      | **Trivial** ✅          |
| **Uptime 24/7**        | Posible      | **Garantizado** ✅      |

**Conclusión:** Ubuntu Server en VPS es **SUPERIOR en todos los aspectos** para 100 mensajes/día. 🚀

¿Te interesa que te ayude a configurar una instancia en Hetzner?
