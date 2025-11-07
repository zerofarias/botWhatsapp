import './env.js';
import { PrismaClient } from '@prisma/client';

// Crear cliente de Prisma con configuración optimizada para MySQL
export const prisma = new PrismaClient({
  log: [
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
});

export async function connectPrisma() {
  try {
    // Verificar conexión real a MySQL
    await prisma.$queryRaw`SELECT 1`;
    console.log('[Prisma] ✅ Connected to MySQL successfully');
  } catch (error) {
    console.error('[Prisma] ❌ Connection failed:', error);
    process.exit(1);
  }
}

// Event listener para errores de conexión
prisma.$on('error', (error) => {
  console.error('[Prisma Error] Connection lost:', error);
});

// Disconnect handler
process.on('SIGINT', async () => {
  console.log('[Prisma] 🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Prisma] 🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
