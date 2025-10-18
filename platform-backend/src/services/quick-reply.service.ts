import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

const quickReplySelect = Prisma.validator<Prisma.QuickReplySelect>()({
  id: true,
  title: true,
  content: true,
  shortcut: true,
  areaId: true,
  userId: true,
  isGlobal: true,
  order: true,
  createdAt: true,
  updatedAt: true,
  area: {
    select: {
      id: true,
      name: true,
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      username: true,
    },
  },
});

export type QuickReplyRecord = Prisma.QuickReplyGetPayload<{
  select: typeof quickReplySelect;
}>;

type QuickReplyCreateInput = {
  title: string;
  content: string;
  shortcut?: string | null;
  areaId?: number | null;
  userId?: number | null;
  isGlobal?: boolean;
  order?: number;
};

type QuickReplyUpdateInput = {
  title?: string;
  content?: string;
  shortcut?: string | null;
  areaId?: number | null;
  userId?: number | null;
  isGlobal?: boolean;
  order?: number;
};

/**
 * Lista todas las respuestas rápidas disponibles para un usuario
 * Incluye: globales + del área del usuario + personales del usuario
 */
export async function listQuickReplies(params: {
  userId?: number;
  areaId?: number;
  includeGlobal?: boolean;
}): Promise<QuickReplyRecord[]> {
  const { userId, areaId, includeGlobal = true } = params;

  const conditions: Prisma.QuickReplyWhereInput[] = [];

  // Respuestas globales
  if (includeGlobal) {
    conditions.push({ isGlobal: true });
  }

  // Respuestas del área
  if (areaId) {
    conditions.push({ areaId, isGlobal: false });
  }

  // Respuestas personales del usuario
  if (userId) {
    conditions.push({ userId, isGlobal: false });
  }

  const quickReplies = await prisma.quickReply.findMany({
    where: conditions.length > 0 ? { OR: conditions } : {},
    select: quickReplySelect,
    orderBy: [{ order: 'asc' }, { title: 'asc' }],
  });

  return quickReplies;
}

/**
 * Obtiene una respuesta rápida por ID
 */
export async function getQuickReplyById(
  id: number
): Promise<QuickReplyRecord | null> {
  return prisma.quickReply.findUnique({
    where: { id },
    select: quickReplySelect,
  });
}

/**
 * Busca una respuesta rápida por shortcut
 */
export async function getQuickReplyByShortcut(
  shortcut: string
): Promise<QuickReplyRecord | null> {
  return prisma.quickReply.findUnique({
    where: { shortcut },
    select: quickReplySelect,
  });
}

/**
 * Crea una nueva respuesta rápida
 */
export async function createQuickReply(
  data: QuickReplyCreateInput
): Promise<QuickReplyRecord> {
  // Validar que no exista el shortcut si se proporciona
  if (data.shortcut) {
    const existing = await prisma.quickReply.findUnique({
      where: { shortcut: data.shortcut },
    });
    if (existing) {
      throw new Error(`El shortcut "${data.shortcut}" ya está en uso`);
    }
  }

  // Validar coherencia: no puede ser global y tener área/usuario
  if (data.isGlobal && (data.areaId || data.userId)) {
    throw new Error(
      'Una respuesta global no puede estar asociada a un área o usuario específico'
    );
  }

  return prisma.quickReply.create({
    data: {
      title: data.title,
      content: data.content,
      shortcut: data.shortcut || null,
      areaId: data.areaId || null,
      userId: data.userId || null,
      isGlobal: data.isGlobal ?? false,
      order: data.order ?? 0,
    },
    select: quickReplySelect,
  });
}

/**
 * Actualiza una respuesta rápida existente
 */
export async function updateQuickReply(
  id: number,
  data: QuickReplyUpdateInput
): Promise<QuickReplyRecord> {
  // Validar que no exista el shortcut si se está actualizando
  if (data.shortcut) {
    const existing = await prisma.quickReply.findUnique({
      where: { shortcut: data.shortcut },
    });
    if (existing && existing.id !== id) {
      throw new Error(`El shortcut "${data.shortcut}" ya está en uso`);
    }
  }

  // Validar coherencia si se actualiza isGlobal
  if (data.isGlobal && (data.areaId || data.userId)) {
    throw new Error(
      'Una respuesta global no puede estar asociada a un área o usuario específico'
    );
  }

  return prisma.quickReply.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.shortcut !== undefined && { shortcut: data.shortcut || null }),
      ...(data.areaId !== undefined && { areaId: data.areaId || null }),
      ...(data.userId !== undefined && { userId: data.userId || null }),
      ...(data.isGlobal !== undefined && { isGlobal: data.isGlobal }),
      ...(data.order !== undefined && { order: data.order }),
    },
    select: quickReplySelect,
  });
}

/**
 * Elimina una respuesta rápida
 */
export async function deleteQuickReply(id: number): Promise<void> {
  await prisma.quickReply.delete({
    where: { id },
  });
}

/**
 * Reordena respuestas rápidas
 */
export async function reorderQuickReplies(
  updates: Array<{ id: number; order: number }>
): Promise<void> {
  await prisma.$transaction(
    updates.map(({ id, order }) =>
      prisma.quickReply.update({
        where: { id },
        data: { order },
      })
    )
  );
}
