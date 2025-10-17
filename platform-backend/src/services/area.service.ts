import type { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../config/prisma.js';

const areaBaseSelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AreaSelect;

const ASSIGNABLE_ROLES: UserRole[] = ['OPERATOR', 'SUPPORT', 'SALES'];

const areaWithCountSelect = {
  ...areaBaseSelect,
  _count: {
    select: {
      userAreas: {
        where: {
          user: {
            isActive: true,
            role: { in: ASSIGNABLE_ROLES },
          },
        },
      },
    },
  },
} satisfies Prisma.AreaSelect;

type AreaWithCount = Prisma.AreaGetPayload<{
  select: typeof areaWithCountSelect;
}>;

export type AreaSummary = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  activeOperators: number;
};

function mapArea(record: AreaWithCount): AreaSummary {
  return {
    id: record.id,
    name: record.name,
    description: record.description ?? null,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    activeOperators: record._count.userAreas,
  };
}

export async function listAreas(isActive?: boolean) {
  const areas = await prisma.area.findMany({
    where:
      typeof isActive === 'boolean'
        ? {
            isActive,
          }
        : undefined,
    orderBy: { name: 'asc' },
    select: areaWithCountSelect,
  });
  return areas.map(mapArea);
}

type CreateAreaInput = {
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export async function createArea(input: CreateAreaInput) {
  const record = await prisma.area.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      isActive: input.isActive ?? true,
    },
    select: areaWithCountSelect,
  });
  return mapArea(record);
}

type UpdateAreaInput = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
};

export async function updateArea(id: number, input: UpdateAreaInput) {
  const record = await prisma.area.update({
    where: { id },
    data: {
      name: input.name,
      description:
        input.description === undefined ? undefined : input.description ?? null,
      isActive: input.isActive ?? undefined,
    },
    select: areaWithCountSelect,
  });
  return mapArea(record);
}
