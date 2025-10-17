import './env.js';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function connectPrisma() {
  await prisma.$connect();
}
