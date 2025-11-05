import './env.js';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: [
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
});

export async function connectPrisma() {
  try {
    await prisma.$connect();
    console.log('[Prisma] Connected successfully');
  } catch (error) {
    console.error('[Prisma] Connection failed:', error);
    process.exit(1);
  }
}

// Manejar desconexiones inesperadas
prisma.$on('error', (error) => {
  console.error('[Prisma Error]', error);
});
