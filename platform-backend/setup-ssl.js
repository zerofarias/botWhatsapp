#!/usr/bin/env node

/**
 * SSL Setup Helper
 * Script para configurar SSL automático de manera fácil
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupSSL() {
  console.log('\n🔐 SSL Setup Helper\n');
  console.log(
    "Este script te ayudará a configurar SSL automático con Let's Encrypt\n"
  );

  // Leer configuración actual
  const envPath = path.join(__dirname, '.env');
  let envContent = '';

  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    console.log('⚠️  No se encontró archivo .env, se creará uno nuevo');
  }

  // Preguntas de configuración
  const domain = await question(
    '🌐 Ingresa tu dominio (ej: api.tudominio.com): '
  );
  const email = await question("📧 Ingresa tu email para Let's Encrypt: ");
  const staging = await question(
    '🏗️  ¿Usar modo staging? (recomendado para pruebas) [y/N]: '
  );
  const enableSSL = await question('✅ ¿Habilitar SSL? [Y/n]: ');

  // Configuración
  const config = {
    ENABLE_SSL: enableSSL.toLowerCase() !== 'n' ? 'true' : 'false',
    DOMAIN_NAME: domain.trim() || 'localhost',
    EMAIL: email.trim() || 'admin@localhost',
    STAGING: staging.toLowerCase() === 'y' ? 'true' : 'false',
    GREENLOCK_CONFIG_DIR: './greenlock.d',
  };

  // Actualizar .env
  let newEnvContent = envContent;

  Object.entries(config).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const line = `${key}=${value}`;

    if (newEnvContent.match(regex)) {
      newEnvContent = newEnvContent.replace(regex, line);
    } else {
      newEnvContent += `\n${line}`;
    }
  });

  // Guardar .env
  fs.writeFileSync(envPath, newEnvContent);

  console.log('\n✅ Configuración SSL guardada:');
  console.log(`   Dominio: ${config.DOMAIN_NAME}`);
  console.log(`   Email: ${config.EMAIL}`);
  console.log(`   SSL habilitado: ${config.ENABLE_SSL}`);
  console.log(`   Staging: ${config.STAGING}`);

  if (config.ENABLE_SSL === 'true') {
    console.log('\n📋 Pasos siguientes:');
    console.log('1. Asegúrate de que tu dominio apunte a este servidor');
    console.log('2. Abre los puertos 80 y 443 en tu firewall');
    console.log('3. Ejecuta: npm start');
    console.log('4. Accede a: https://' + config.DOMAIN_NAME);

    if (config.STAGING === 'true') {
      console.log(
        '\n⚠️  Modo staging activado - Los certificados no serán válidos en navegadores'
      );
      console.log('   Cambia STAGING=false cuando estés listo para producción');
    }
  } else {
    console.log(
      '\n🌐 SSL deshabilitado - El servidor usará HTTP en puerto 4000'
    );
  }

  rl.close();
}

setupSSL().catch(console.error);
