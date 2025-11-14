# 🔐 Guía Completa: SSL/HTTPS con Let's Encrypt

## Opción 1: Usar Nginx como Reverse Proxy (RECOMENDADO)

Esta es la forma más confiable y estándar en producción.

### Ventajas:

✅ Certbot se encarga de renovar certificados automáticamente
✅ Nginx es muy estable y eficiente
✅ Separación clara entre HTTP/HTTPS y la aplicación
✅ Soporte para múltiples dominios
✅ Muy fácil de mantener

### Instalación en Windows con WSL2:

```bash
# 1. Habilita WSL2 si no lo tienes
wsl --install

# 2. En WSL2, instala Nginx y Certbot
sudo apt-get update
sudo apt-get install nginx certbot python3-certbot-nginx

# 3. Configura Nginx como reverse proxy
# Edita: /etc/nginx/sites-available/default
```

### Configuración de Nginx:

```nginx
server {
    listen 80;
    server_name camarafarma.duckdns.org;

    # Redirección automática a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name camarafarma.duckdns.org;

    # Certificados SSL (Certbot los crea aquí)
    ssl_certificate /etc/letsencrypt/live/camarafarma.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/camarafarma.duckdns.org/privkey.pem;

    # Configuración de seguridad SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Reverse proxy al backend
    location /api {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Obtener certificado:

```bash
# En WSL2
sudo certbot certonly --standalone -d camarafarma.duckdns.org

# O con Nginx
sudo certbot --nginx -d camarafarma.duckdns.org
```

---

## Opción 2: Usar Caddy Server (MÁS SIMPLE)

Caddy automáticamente obtiene certificados de Let's Encrypt sin configuración compleja.

### Instalación:

```bash
# En Windows, descarga desde: https://caddyserver.com/download
# O usa Chocolatey:
choco install caddy
```

### Caddyfile (configuración):

```
camarafarma.duckdns.org {
    reverse_proxy /api localhost:4000
    reverse_proxy /socket.io localhost:4001 {
        header_up Connection *
        header_up Upgrade websocket
    }
}
```

### Ejecución:

```bash
caddy run
```

Caddy automáticamente:

- Obtiene certificado de Let's Encrypt
- Lo renueva automáticamente
- Sirve HTTPS en puerto 443
- Redirige HTTP a HTTPS

---

## Opción 3: Usar node-acme-challenges (Para Node.js puro)

Si quieres SSL directamente en Node sin Greenlock, usa este enfoque:

### Instalación:

```bash
npm install https greenlock greenlock-store-fs greenlock-plugin-dns-01
```

### Código simplificado:

```typescript
import https from 'https';
import fs from 'fs';
import path from 'path';

async function setupSSL(app) {
  const certPath = path.join(process.cwd(), 'certs');

  // Verificar si ya tiene certificados
  const keyPath = path.join(certPath, 'key.pem');
  const certFilePath = path.join(certPath, 'cert.pem');

  if (!fs.existsSync(keyPath) || !fs.existsSync(certFilePath)) {
    console.log('⚠️  Certificados no encontrados');
    console.log(
      'Ejecuta: certbot certonly --standalone -d camarafarma.duckdns.org'
    );
    console.log('Luego copia los archivos a ./certs/');
    process.exit(1);
  }

  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certFilePath),
  };

  const server = https.createServer(options, app);
  return server;
}

// Uso en index.ts:
const server = await setupSSL(app);
server.listen(443, () => {
  console.log('🔐 HTTPS ready on https://camarafarma.duckdns.org');
});
```

---

## ⭐ RECOMENDACIÓN FINAL

Para tu caso (Windows con puertos abiertos), te recomiendo:

### Opción A: Usar Caddy (MÁS FÁCIL)

1. Descarga Caddy desde https://caddyserver.com
2. Crea un archivo `Caddyfile` en tu carpeta raíz
3. Ejecuta `caddy run`
4. ¡Listo! SSL automático

### Opción B: Usar Nginx en WSL2 (MÁS PROFESIONAL)

1. Instala WSL2
2. Instala Nginx y Certbot
3. Configura como reverse proxy
4. Ejecuta Nginx

### Opción C: Usar Certbot Solo (SIN WEBSERVER)

```bash
# Obtén el certificado
certbot certonly --preferred-challenges dns -d camarafarma.duckdns.org

# Luego copia los certs a tu proyecto y usa la opción 3
```

---

## Próximos Pasos

1. Elige una opción (recomiendo Caddy por su simplicidad)
2. Instala y configura
3. Abre puerto 443 en tu router
4. Verifica con: `https://camarafarma.duckdns.org/api/conversations`
5. Tu frontend automáticamente usará HTTPS

¿Cuál opción prefieres? Te ayudaré a configurarla.
