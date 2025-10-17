import { prisma } from '../config/prisma.js';

export function listMessages(userId: number, limit = 100) {
  return prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
