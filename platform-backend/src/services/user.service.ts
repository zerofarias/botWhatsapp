import crypto from 'crypto';
import type { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import type { SessionUser } from '../types/express.js';

const baseUserSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  defaultAreaId: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const userWithAreasSelect = {
  ...baseUserSelect,
  areas: {
    select: {
      areaId: true,
      area: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof userWithAreasSelect;
}>;

export function hashPassword(raw: string) {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function verifyPassword(raw: string, hashed: string) {
  return hashPassword(raw) === hashed;
}

type CreateUserInput = {
  name: string;
  username: string;
  email?: string | null;
  password: string;
  role?: UserRole;
  defaultAreaId?: number | null;
  areaIds?: number[];
  isActive?: boolean;
};

export function toSessionUser(user: {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  defaultAreaId: number | null;
  areaIds?: number[];
}): SessionUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    defaultAreaId: user.defaultAreaId,
    areaIds: user.areaIds ?? [],
  };
}

export function sanitizeUser(user: PublicUser) {
  return {
    ...user,
    areas: user.areas.map((membership) => ({
      id: membership.areaId,
      name: membership.area?.name ?? null,
    })),
  };
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: userWithAreasSelect,
  });
  return users.map(sanitizeUser);
}

export async function usernameExists(username: string) {
  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function emailExists(email: string) {
  if (!email) {
    return false;
  }
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function emailInUseByAnother(
  email: string,
  excludeUserId: number
) {
  if (!email) {
    return false;
  }
  const existing = await prisma.user.findFirst({
    where: {
      email,
      NOT: { id: excludeUserId },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function findUserById(id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userWithAreasSelect,
  });
  return user ? sanitizeUser(user) : null;
}

export async function findUserForLogin(identifier: string) {
  return prisma.user.findFirst({
    where: {
      OR: [{ username: identifier }, { email: identifier }],
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      defaultAreaId: true,
      isActive: true,
      passwordHash: true,
    },
  });
}

export function parseUserRole(
  role?: string | UserRole | null
): UserRole | undefined {
  if (!role) return undefined;
  if (typeof role !== 'string') {
    return role;
  }
  switch (role.toLowerCase()) {
    case 'admin':
      return 'ADMIN';
    case 'supervisor':
      return 'SUPERVISOR';
    case 'operator':
      return 'OPERATOR';
    default:
      return undefined;
  }
}

export async function createUser(input: CreateUserInput) {
  const hashed = hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      username: input.username,
      email: input.email,
      passwordHash: hashed,
      role: input.role ?? 'OPERATOR',
      defaultAreaId: input.defaultAreaId ?? null,
      isActive: input.isActive ?? true,
      areas: input.areaIds?.length
        ? {
            create: input.areaIds.map((areaId) => ({
              area: {
                connect: { id: areaId },
              },
            })),
          }
        : undefined,
    },
    select: userWithAreasSelect,
  });

  return sanitizeUser(user);
}

type UpdateUserInput = {
  name?: string;
  email?: string | null;
  password?: string;
  role?: UserRole;
  defaultAreaId?: number | null;
  areaIds?: number[];
  isActive?: boolean;
};

export async function updateUser(id: number, input: UpdateUserInput) {
  const data: Prisma.UserUpdateInput = {
    name: input.name === undefined ? undefined : input.name,
    email: input.email === undefined ? undefined : input.email ?? null,
    role: input.role === undefined ? undefined : { set: input.role },
    isActive: input.isActive === undefined ? undefined : input.isActive,
    defaultArea:
      input.defaultAreaId === undefined
        ? undefined
        : input.defaultAreaId === null
        ? { disconnect: true }
        : { connect: { id: input.defaultAreaId } },
  };

  if (input.password) {
    data.passwordHash = hashPassword(input.password);
  }

  if (input.areaIds !== undefined) {
    data.areas = {
      deleteMany: { userId: id },
      create: input.areaIds.map((areaId) => ({
        area: {
          connect: { id: areaId },
        },
      })),
    };
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: userWithAreasSelect,
  });

  return sanitizeUser(user);
}

export async function updateLastLogin(userId: number) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
    },
  });
}
