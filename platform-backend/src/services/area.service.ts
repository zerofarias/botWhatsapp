import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

const areaSelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AreaSelect;

export type AreaDto = Prisma.AreaGetPayload<{ select: typeof areaSelect }>;

export async function listAreas(isActive?: boolean) {
  return prisma.area.findMany({
    where:
      typeof isActive === 'boolean'
        ? {
            isActive,
          }
        : undefined,
    orderBy: { name: 'asc' },
    select: areaSelect,
  });
}

type CreateAreaInput = {
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export async function createArea(input: CreateAreaInput) {
  return prisma.area.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      isActive: input.isActive ?? true,
    },
    select: areaSelect,
  });
}

type UpdateAreaInput = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
};

export async function updateArea(id: number, input: UpdateAreaInput) {
  return prisma.area.update({
    where: { id },
    data: {
      name: input.name,
      description:
        input.description === undefined ? undefined : input.description ?? null,
      isActive: input.isActive ?? undefined,
    },
    select: areaSelect,
  });
}
