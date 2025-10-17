import { prisma } from '../config/prisma.js';

export function listFlows(userId: number) {
  return prisma.flow.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
}

export function upsertFlow(
  userId: number,
  keyword: string,
  response: string,
  id?: number
) {
  if (id) {
    return prisma.flow.update({
      where: { id },
      data: { keyword, response },
    });
  }

  return prisma.flow.create({
    data: { userId, keyword, response },
  });
}

export function deleteFlow(userId: number, id: number) {
  return prisma.flow.delete({
    where: { id, userId },
  });
}
