import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function diagnose() {
  console.log('=== DIAGNÓSTICO DE MULTIMEDIA ===\n');

  // 1. Verificar últimos mensajes con multimedia en BD
  console.log('1. Últimos mensajes con multimedia en base de datos:');
  try {
    const messages = await prisma.message.findMany({
      where: {
        mediaType: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        content: true,
        mediaType: true,
        mediaUrl: true,
        createdAt: true,
      },
    });

    if (messages.length === 0) {
      console.log('   ❌ No se encontraron mensajes con multimedia');
    } else {
      messages.forEach((msg) => {
        console.log(`   - ID: ${msg.id}`);
        console.log(`     Tipo: ${msg.mediaType}`);
        console.log(`     URL: ${msg.mediaUrl}`);
        console.log(`     Contenido: ${msg.content?.substring(0, 50)}...`);
        console.log(`     Fecha: ${msg.createdAt}`);
        console.log('');
      });
    }
  } catch (error) {
    console.log('   ❌ Error consultando base de datos:', error);
  }

  // 2. Verificar directorio uploads
  console.log('\n2. Verificando directorio uploads:');
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  try {
    const stats = await fs.stat(uploadsDir);
    console.log(`   ✅ Directorio existe: ${uploadsDir}`);
    console.log(`   Permisos: ${stats.mode.toString(8)}`);

    // Listar subdirectorios
    const subdirs = await fs.readdir(uploadsDir);
    console.log(`   Subdirectorios: ${subdirs.length}`);

    for (const subdir of subdirs) {
      const subdirPath = path.join(uploadsDir, subdir);
      const subdirStats = await fs.stat(subdirPath);
      if (subdirStats.isDirectory()) {
        const files = await fs.readdir(subdirPath);
        console.log(`   - ${subdir}: ${files.length} archivos`);
        if (files.length > 0) {
          console.log(`     Ejemplos: ${files.slice(0, 3).join(', ')}`);
        }
      }
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('   ❌ Directorio no existe, creándolo...');
      try {
        await fs.mkdir(uploadsDir, { recursive: true });
        console.log('   ✅ Directorio creado exitosamente');
      } catch (mkdirError) {
        console.log('   ❌ Error creando directorio:', mkdirError);
      }
    } else {
      console.log('   ❌ Error verificando directorio:', error);
    }
  }

  // 3. Probar escritura de archivo
  console.log('\n3. Probando escritura de archivo:');
  const testFile = path.join(uploadsDir, 'test-write.txt');
  try {
    await fs.writeFile(testFile, 'test content');
    console.log('   ✅ Escritura exitosa');
    await fs.unlink(testFile);
    console.log('   ✅ Archivo de prueba eliminado');
  } catch (error) {
    console.log('   ❌ Error escribiendo archivo:', error);
  }

  // 4. Verificar configuración de base64
  console.log('\n4. Verificando procesador de base64:');
  try {
    const { processBase64Content } = await import('./utils/media-processor.js');

    // Crear un pequeño PNG de prueba (1x1 pixel transparente)
    const testBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const result = await processBase64Content(testBase64);
    if (result) {
      console.log('   ✅ Procesamiento de base64 funciona');
      console.log(`   URL generada: ${result.mediaUrl}`);
      console.log(`   Tipo detectado: ${result.mediaType}`);

      // Verificar que el archivo existe
      const fullPath = path.join(__dirname, '..', result.mediaUrl);
      try {
        await fs.stat(fullPath);
        console.log('   ✅ Archivo guardado correctamente');
        await fs.unlink(fullPath);
      } catch {
        console.log('   ❌ Archivo no se guardó correctamente');
      }
    } else {
      console.log('   ❌ processBase64Content retornó null');
    }
  } catch (error) {
    console.log('   ❌ Error en procesador de base64:', error);
  }

  // 5. Verificar versión de WPPConnect
  console.log('\n5. Verificando WPPConnect:');
  try {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(__dirname, '..', 'package.json'), 'utf-8')
    );
    const wppVersion = packageJson.dependencies['@wppconnect-team/wppconnect'];
    console.log(`   Versión instalada: ${wppVersion}`);
  } catch (error) {
    console.log('   ❌ Error leyendo package.json:', error);
  }

  // 6. Verificar últimas conversaciones
  console.log('\n6. Últimas conversaciones activas:');
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        status: { not: 'CLOSED' },
      },
      orderBy: { lastActivity: 'desc' },
      take: 5,
      select: {
        id: true,
        userPhone: true,
        contactName: true,
        status: true,
        lastActivity: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    if (conversations.length === 0) {
      console.log('   ℹ️ No hay conversaciones activas');
    } else {
      conversations.forEach((conv) => {
        console.log(`   - ${conv.contactName} (${conv.userPhone})`);
        console.log(
          `     Status: ${conv.status}, Mensajes: ${conv._count.messages}`
        );
        console.log(`     Última actividad: ${conv.lastActivity}`);
      });
    }
  } catch (error) {
    console.log('   ❌ Error consultando conversaciones:', error);
  }

  console.log('\n=== FIN DEL DIAGNÓSTICO ===\n');

  await prisma.$disconnect();
}

diagnose().catch(console.error);
