# Configuración SSL con Greenlock Express

Este proyecto incluye soporte para SSL automático usando Greenlock Express y Let's Encrypt.

## Configuración

### Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```bash
# SSL Configuration
ENABLE_SSL=true
DOMAIN_NAME=api.tudominio.com
EMAIL=admin@tudominio.com
STAGING=false
GREENLOCK_CONFIG_DIR=./greenlock.d
```

### Configuración de Desarrollo (Staging)

Para pruebas locales o staging:

```bash
ENABLE_SSL=true
DOMAIN_NAME=staging.tudominio.com
EMAIL=dev@tudominio.com
STAGING=true  # Usa certificados de prueba
```

### Configuración de Producción

Para producción con certificados reales:

```bash
ENABLE_SSL=true
DOMAIN_NAME=api.tudominio.com
EMAIL=admin@tudominio.com
STAGING=false  # Certificados reales de Let's Encrypt
```

## Funcionamiento

### SSL Automático

- **Greenlock Express** obtiene automáticamente certificados SSL de Let's Encrypt
- Los certificados se renuevan automáticamente antes de expirar
- No necesitas configurar nginx o Apache

### Puertos

- **Puerto 80**: Redirecciones HTTP → HTTPS (automático)
- **Puerto 443**: Servidor HTTPS principal
- **Puerto 4000**: HTTP cuando SSL está deshabilitado

### Archivos generados

- `./greenlock.d/`: Configuración y certificados de Greenlock
- `./ssl/`: Certificados personalizados (opcional)

## Opciones de SSL

### 1. SSL Automático (Recomendado)

- Configura `ENABLE_SSL=true`
- Greenlock obtendrá certificados automáticamente
- Ideal para producción

### 2. Certificados Personalizados

- Coloca tus certificados en `./ssl/`:
  - `private.key`: Clave privada
  - `certificate.crt`: Certificado
- Tiene prioridad sobre SSL automático

### 3. Sin SSL

- Configura `ENABLE_SSL=false`
- Servidor HTTP normal en puerto 4000

## Requisitos de Dominio

Para SSL automático:

1. **Dominio debe apuntar al servidor** (A record)
2. **Puertos 80 y 443 deben estar abiertos**
3. **El servidor debe ser accesible desde internet**

## Comandos útiles

```bash
# Desarrollo sin SSL
npm run dev

# Producción con SSL
ENABLE_SSL=true npm start

# Verificar certificados
openssl x509 -in ./greenlock.d/live/api.tudominio.com/cert.pem -text -noout
```

## Troubleshooting

### Error: Challenge failed

- Verifica que el dominio apunte al servidor
- Asegúrate de que los puertos 80 y 443 estén abiertos
- Revisa el firewall

### Error: Rate limit exceeded

- Espera 1 hora (límite de Let's Encrypt)
- Usa `STAGING=true` para pruebas

### Error: Invalid domain

- Verifica que `DOMAIN_NAME` sea correcto
- No uses `localhost` para certificados reales

## Estructura de archivos

```
platform-backend/
├── .env                    # Configuración
├── greenlock.d/            # Certificados automáticos
│   ├── accounts/           # Cuentas Let's Encrypt
│   └── live/              # Certificados activos
├── ssl/                   # Certificados personalizados
│   ├── private.key
│   └── certificate.crt
└── src/
    └── config/
        └── ssl.ts         # Configuración SSL
```
