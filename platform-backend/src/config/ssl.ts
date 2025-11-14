import { env } from './env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import https from 'https';
import fs from 'fs';
import { createRequire } from 'module';

// Crear require para módulos CommonJS
const require = createRequire(import.meta.url);
const greenlock = require('@root/greenlock-express');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Configuración SSL con Greenlock Express
 * Obtiene automáticamente certificados SSL de Let's Encrypt
 */
export function createSSLApp(app: any) {
  if (!env.enableSsl) {
    console.log('🔓 SSL disabled, running in HTTP mode');
    return null;
  }

  console.log(`🔐 Configuring SSL for domain: ${env.domainName}`);

  // Asegurar que el directorio de config existe
  const configDir = path.resolve(__dirname, '../../', env.greenlockConfigDir);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log(`📁 Created config directory: ${configDir}`);
  }

  // Leer package.json para información requerida
  const packagePath = path.resolve(__dirname, '../../', 'package.json');
  let pkg: any = { name: 'wppconnect-platform-backend', version: '0.1.0' };
  try {
    const pkgContent = fs.readFileSync(packagePath, 'utf-8');
    pkg = JSON.parse(pkgContent);
    console.log(`📦 Package info: ${pkg.name}@${pkg.version}`);
  } catch (e) {
    console.warn('⚠️  Could not read package.json, using defaults');
  }

  const greenlockConfig = {
    // Información del paquete (requerido por Greenlock)
    packageAgent: `${pkg.name}/${pkg.version}`,

    // Directorio de configuración de Greenlock
    configDir: configDir,

    // Usar staging para pruebas, false para certificados reales
    staging: env.staging,

    // Email para registro en Let's Encrypt
    maintainerEmail: env.email,

    // Dominio principal y aliases
    sites: [
      {
        subject: env.domainName,
        altnames: [env.domainName],
      },
    ],

    // Configuración de renovación automática
    renewAt: 60 * 24 * 60 * 60 * 1000, // 60 días antes del vencimiento

    // Configuración de almacenamiento
    store: {
      module: 'greenlock-store-fs',
      basePath: path.resolve(configDir, 'accounts'),
    },

    // Configuración de challenge (para validación de dominio)
    challenges: {
      'http-01': {
        module: 'acme-http-01-standalone',
      },
    },
  };

  // Crear instancia de Greenlock
  const gle = greenlock.init(greenlockConfig);

  // Servir la aplicación con SSL automático
  gle.serve(app);

  console.log(`✅ SSL configured for: ${env.domainName}`);
  console.log(`📧 Registration email: ${env.email}`);
  console.log(`🏗️  Staging mode: ${env.staging ? 'enabled' : 'disabled'}`);
  console.log(`📁 Config directory: ${greenlockConfig.configDir}`);

  return gle;
}

/**
 * Middleware para redirigir HTTP a HTTPS en producción
 */
export function httpsRedirectMiddleware(req: any, res: any, next: any) {
  if (
    env.enableSsl &&
    !req.secure &&
    req.get('x-forwarded-proto') !== 'https'
  ) {
    return res.redirect(301, `https://${req.get('host')}${req.url}`);
  }
  next();
}

/**
 * Configuración de servidor HTTP/HTTPS híbrido
 */
export function createHybridServer(app: any) {
  if (!env.enableSsl) {
    // Solo HTTP
    const server = http.createServer(app);
    return { server, protocol: 'http' };
  }

  // Intentar cargar certificados existentes o usar auto SSL
  try {
    const certPath = path.resolve(__dirname, '../../ssl');
    const options = {
      key: fs.readFileSync(path.join(certPath, 'private.key')),
      cert: fs.readFileSync(path.join(certPath, 'certificate.crt')),
    };

    const server = https.createServer(options, app);
    console.log('🔐 Using custom SSL certificates from ./ssl/');
    return { server, protocol: 'https' };
  } catch (error) {
    console.log('⚠️  No custom SSL certificates found, using auto SSL...');

    // Usar Greenlock para SSL automático
    const gle = createSSLApp(app);
    if (gle) {
      return { server: gle, protocol: 'https' };
    }

    // Fallback a HTTP
    const server = http.createServer(app);
    return { server, protocol: 'http' };
  }
}
