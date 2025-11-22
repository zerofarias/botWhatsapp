/**
 * Obtiene el historial combinado de mensajes de todas las conversaciones de una persona (por teléfono).
 * Devuelve un array de mensajes ordenados por fecha, con etiquetas de inicio/fin por cada conversación.
 */
import { listConversationMessages } from './message.service.js';
export async function getCombinedChatHistoryByPhone(userPhone: string) {
  // Buscar todas las conversaciones de ese teléfono
  const conversations = await prisma.conversation.findMany({
    where: { userPhone },
    orderBy: { createdAt: 'asc' },
    select: { id: true, createdAt: true, closedAt: true },
  });
  const history: Array<any> = [];
  for (const conv of conversations) {
    // Etiqueta de inicio
    if (!conv.createdAt) {
      // Omitting conversations with null createdAt to prevent crashes.
      // A more sophisticated error logging could be added here.
      continue;
    }
    history.push({
      type: 'label',
      label: `Inicio de conversación (${conv.createdAt.toISOString()})`,
      conversationId: conv.id.toString(),
      timestamp: conv.createdAt,
    });
    // Mensajes
    const messages = await listConversationMessages(conv.id);
    for (const msg of messages) {
      history.push({
        id: msg.id.toString(),
        conversationId: msg.conversationId.toString(),
        senderType: msg.senderType,
        senderId: msg.senderId,
        senderName: msg.sender?.name ?? null,
        senderUsername: msg.sender?.username ?? null,
        content: msg.content,
        mediaType: msg.mediaType,
        mediaUrl: msg.mediaUrl,
        isDelivered: msg.isDelivered,
        isRead: msg.isRead,
        externalId: msg.externalId,
        createdAt: msg.createdAt,
        type: 'message',
      });
    }

    // Notas internas
    const notes = await listConversationNotes(conv.id);
    for (const note of notes) {
      history.push({
        id: note.id.toString(),
        type: 'note',
        content: note.content,
        createdAt: note.createdAt,
        createdById: note.createdById,
        createdByName: note.createdByName,
        conversationId: conv.id.toString(),
      });
    }

    // Etiqueta de fin
    history.push({
      type: 'label',
      label: `Fin de conversación (${
        conv.closedAt ? conv.closedAt.toISOString() : 'abierta'
      })`,
      conversationId: conv.id.toString(),
      timestamp: conv.closedAt || null,
    });
  }
  // Ordenar por fecha de forma ascendente (más antiguo primero)
  history.sort((a, b) => {
    const timeA = a.createdAt || a.timestamp;
    const timeB = b.createdAt || b.timestamp;

    // Si alguno no tiene fecha, moverlo al final para mantener estabilidad
    if (!timeA && !timeB) return 0;
    if (!timeA) return 1;
    if (!timeB) return 1;

    return new Date(timeA).getTime() - new Date(timeB).getTime();
  });
  return history;
}

/**
 * Obtiene solo el historial de mensajes y notas de UNA conversación específica
 * (NO incluye los historiales de otras conversaciones del mismo teléfono)
 */
export async function getSingleConversationHistory(
  conversationId: bigint | number
) {
  const id =
    typeof conversationId === 'bigint'
      ? conversationId
      : BigInt(conversationId);

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { id: true, createdAt: true, closedAt: true },
  });

  if (!conversation) return [];

  const history: Array<any> = [];

  // Etiqueta de inicio
  if (conversation.createdAt) {
    history.push({
      type: 'label',
      label: `Inicio de conversación (${conversation.createdAt.toISOString()})`,
      conversationId: conversation.id.toString(),
      timestamp: conversation.createdAt,
    });
  }

  // Mensajes de ESTA conversación
  const messages = await listConversationMessages(id);
  for (const msg of messages) {
    history.push({
      id: msg.id.toString(),
      conversationId: msg.conversationId.toString(),
      senderType: msg.senderType,
      senderId: msg.senderId,
      senderName: msg.sender?.name ?? null,
      senderUsername: msg.sender?.username ?? null,
      content: msg.content,
      mediaType: msg.mediaType,
      mediaUrl: msg.mediaUrl,
      isDelivered: msg.isDelivered,
      isRead: msg.isRead,
      externalId: msg.externalId,
      createdAt: msg.createdAt,
      type: 'message',
    });
  }

  // Notas internas de ESTA conversación
  const notes = await listConversationNotes(id);
  for (const note of notes) {
    history.push({
      id: note.id.toString(),
      type: 'note',
      content: note.content,
      createdAt: note.createdAt,
      createdById: note.createdById,
      createdByName: note.createdByName,
      conversationId: conversation.id.toString(),
    });
  }

  // Etiqueta de fin
  history.push({
    type: 'label',
    label: `Fin de conversación (${
      conversation.closedAt ? conversation.closedAt.toISOString() : 'abierta'
    })`,
    conversationId: conversation.id.toString(),
    timestamp: conversation.closedAt || null,
  });

  // Ordenar por fecha
  history.sort((a, b) => {
    const timeA = a.createdAt || a.timestamp;
    const timeB = b.createdAt || b.timestamp;

    if (!timeA && !timeB) return 0;
    if (!timeA) return 1;
    if (!timeB) return 1;

    return new Date(timeA).getTime() - new Date(timeB).getTime();
  });

  return history;
}

import {
  ConversationEventType,
  ConversationStatus,
  Prisma,
  type UserRole,
} from '@prisma/client';
import { prisma } from '../config/prisma.js';
import type { SessionUser } from '../types/express.js';
const conversationNoteInclude = {
  createdBy: {
    select: {
      id: true,
      name: true,
      username: true,
    },
  },
} satisfies Prisma.ConversationEventInclude;

type ConversationNoteRecord = Prisma.ConversationEventGetPayload<{
  include: typeof conversationNoteInclude;
}>;

export type ConversationNote = {
  id: bigint;
  conversationId: bigint;
  content: string;
  createdAt: Date;
  createdById: number | null;
  createdByName: string | null;
};
export const conversationSelect = {
  id: true,
  userPhone: true,
  contactName: true,
  contactId: true,
  areaId: true,
  assignedToId: true,
  status: true,
  progressStatus: true,
  botActive: true,
  botId: true,
  context: true,
  lastActivity: true,
  lastBotMessageAt: true,
  currentFlowNodeId: true,
  closedAt: true,
  closedReason: true,
  closedById: true,
  createdAt: true,
  updatedAt: true,
  contact: {
    select: {
      id: true,
      name: true,
      phone: true,
      address1: true,
      address2: true,
      areaId: true,
      createdAt: true,
      updatedAt: true,
      dni: true,
      obraSocial: true,
      obraSocial2: true,
      isVip: true,
      isProblematic: true,
      isChronic: true,
    },
  },
  area: {
    select: {
      id: true,
      name: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      name: true,
    },
  },
  messages: {
    select: {
      id: true,
      conversationId: true,
      senderType: true,
      senderId: true,
      content: true,
      mediaType: true,
      mediaUrl: true,
      externalId: true,
      isDelivered: true,
      isRead: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  },
} satisfies Prisma.ConversationSelect;

export type ConversationRecord = Prisma.ConversationGetPayload<{
  select: typeof conversationSelect;
}>;

type CreateConversationInput = {
  userPhone: string;
  contactName?: string | null;
  contactId?: number | null;
  areaId?: number | null;
  assignedToId?: number | null;
  status?: ConversationStatus;
  botActive?: boolean;
  botId?: number | null;
  currentFlowNodeId?: number | null;
  context?: any;
};

const ACTIVE_STATUSES: ConversationStatus[] = ['PENDING', 'ACTIVE', 'PAUSED'];

const ASSIGNABLE_OPERATOR_ROLES: UserRole[] = [
  'OPERATOR',
  'SUPERVISOR',
  'SUPPORT',
  'SALES',
];

const AREA_SCOPED_ROLES = new Set<UserRole>(['OPERATOR', 'SUPPORT', 'SALES']);

function activeStatusFilter() {
  return {
    status: {
      in: ACTIVE_STATUSES,
    },
  } as Prisma.ConversationWhereInput;
}

export async function findOpenConversationByPhone(
  userPhone: string
): Promise<ConversationRecord | null> {
  const record = await prisma.conversation.findFirst({
    where: {
      userPhone,
      ...activeStatusFilter(),
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: conversationSelect,
  });

  return record ?? null;
}

export async function createConversation(
  input: CreateConversationInput
): Promise<ConversationRecord> {
  return prisma.conversation.create({
    data: {
      userPhone: input.userPhone,
      contactName: input.contactName ?? null,
      contactId: input.contactId ?? null,
      areaId: input.areaId ?? null,
      assignedToId: input.assignedToId ?? null,
      status: input.status ?? 'PENDING',
      botActive: input.botActive ?? true,
      botId: input.botId ?? 1, // Asignar bot por defecto si no se provee
      currentFlowNodeId: input.currentFlowNodeId ?? 1, // Nodo raíz por defecto
      // Serializar context como string para cumplir con el tipo Prisma
      context:
        input.context == null
          ? null
          : typeof input.context === 'string'
          ? input.context
          : JSON.stringify(input.context),
    },
    select: conversationSelect,
  });
}

export async function touchConversation(
  conversationId: bigint,
  data: Prisma.ConversationUpdateInput
) {
  // Sanitizar el contexto si está presente
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanitized = { ...data } as any;
  if (sanitized.context !== undefined) {
    if (typeof sanitized.context === 'string') {
      // Si es string, dejar como está (no hacer nada)
    } else if (sanitized.context === null) {
      // Si es null, dejar null (no hacer nada)
    } else if (typeof sanitized.context === 'object') {
      // Si es objeto, convertir a JSON string
      try {
        sanitized.context = JSON.stringify(sanitized.context);
      } catch {
        console.error(
          '[touchConversation] Error stringifying context:',
          sanitized.context
        );
        delete sanitized.context; // Eliminar si no se puede serializar
      }
    }
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: sanitized,
  });
}

export async function addConversationEvent(
  conversationId: bigint,
  eventType: ConversationEventType,
  payload: Prisma.InputJsonValue | null,
  createdById?: number | null
) {
  await prisma.conversationEvent.create({
    data: {
      conversationId,
      eventType,
      payload: payload ? JSON.stringify(payload) : null,
      createdById: createdById ?? null,
    },
  });
}

function parseNoteContent(payload: Prisma.JsonValue | string | null): string {
  if (!payload) {
    return '';
  }

  const tryParse = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        'content' in parsed
      ) {
        const value = (parsed as { content?: unknown }).content;
        return typeof value === 'string' ? value : value ? String(value) : '';
      }
      return '';
    } catch {
      return raw;
    }
  };

  if (typeof payload === 'string') {
    return tryParse(payload);
  }

  if (typeof payload === 'object' && payload !== null) {
    if ('content' in payload) {
      const value = (payload as Record<string, unknown>).content;
      if (!value) {
        return '';
      }
      return typeof value === 'string' ? value : String(value);
    }
    return '';
  }

  return '';
}

function isSystemNotePayload(payload: Prisma.JsonValue | string | null) {
  if (!payload) {
    return false;
  }
  let parsed: unknown = payload;

  if (typeof payload === 'string') {
    try {
      parsed = JSON.parse(payload);
    } catch {
      return false;
    }
  }

  return Boolean(
    parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      'type' in (parsed as Record<string, unknown>)
  );
}

function mapConversationEventToNote(
  event: ConversationNoteRecord
): ConversationNote {
  return {
    id: event.id,
    conversationId: event.conversationId,
    content: parseNoteContent(event.payload),
    createdAt: event.createdAt,
    createdById: event.createdById,
    createdByName: event.createdBy?.name ?? event.createdBy?.username ?? null,
  };
}
// Crear nota interna en la conversación
export async function addConversationNote(
  conversationId: bigint,
  content: string,
  createdById?: number | null
) {
  const event = await prisma.conversationEvent.create({
    data: {
      conversationId,
      eventType: 'NOTE',
      payload: JSON.stringify({ content }),
      createdById: createdById ?? null,
    },
    include: conversationNoteInclude,
  });

  return mapConversationEventToNote(event);
}

// Listar notas internas de una conversación
export async function listConversationNotes(
  conversationId: bigint
): Promise<ConversationNote[]> {
  const events = await prisma.conversationEvent.findMany({
    where: {
      conversationId,
      eventType: 'NOTE',
    },
    include: conversationNoteInclude,
    orderBy: { createdAt: 'asc' },
  });

  return events
    .filter((event) => !isSystemNotePayload(event.payload))
    .map(mapConversationEventToNote);
}

export const ACTIVE_CONVERSATION_STATUSES = [...ACTIVE_STATUSES] as const;

export function isActiveConversationStatus(status: ConversationStatus) {
  return ACTIVE_STATUSES.includes(status);
}

async function countActiveConversationsForUser(
  userId: number,
  areaId?: number
) {
  return prisma.conversation.count({
    where: {
      assignedToId: userId,
      ...(areaId ? { areaId } : undefined),
      ...activeStatusFilter(),
    },
  });
}

export async function findLeastBusyOperator(areaId: number) {
  const operators = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ASSIGNABLE_OPERATOR_ROLES },
      areas: {
        some: { areaId },
      },
    },
    select: {
      id: true,
    },
  });

  if (!operators.length) {
    return null;
  }

  const loads = await Promise.all(
    operators.map(async (operator) => ({
      id: operator.id,
      load: await countActiveConversationsForUser(operator.id, areaId),
    }))
  );

  loads.sort((a, b) => {
    if (a.load !== b.load) return a.load - b.load;
    return a.id - b.id;
  });

  return loads[0]!.id;
}

export async function assignConversationToArea(
  conversationId: bigint,
  areaId: number | null,
  options?: {
    requestedById?: number | null;
    preferUserId?: number | null;
  }
) {
  const now = new Date();
  let operatorId: number | null = null;

  if (areaId !== null) {
    if (options?.preferUserId) {
      operatorId = options.preferUserId;
    } else {
      operatorId = await findLeastBusyOperator(areaId);
    }
  }

  const updateData: Prisma.ConversationUpdateInput = {
    area: areaId !== null ? { connect: { id: areaId } } : { disconnect: true },
    lastActivity: now,
    ...(operatorId
      ? {
          assignedTo: { connect: { id: operatorId } },
          status: 'ACTIVE',
          botActive: false,
        }
      : {
          assignedTo: { disconnect: true },
          status: 'PENDING',
          botActive: true,
        }),
  };

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: updateData,
    select: conversationSelect,
  });

  await addConversationEvent(
    conversationId,
    'ASSIGNMENT',
    {
      areaId,
      assignedToId: operatorId,
    },
    options?.requestedById ?? null
  );

  return { conversation: updated, operatorId };
}

const conversationSummarySelect = {
  id: true,
  userPhone: true,
  contactName: true,
  contactId: true,
  areaId: true,
  assignedToId: true,
  status: true,
  progressStatus: true,
  botActive: true,
  lastActivity: true,
  updatedAt: true,
  area: {
    select: {
      id: true,
      name: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      name: true,
    },
  },
  contact: {
    select: {
      id: true,
      name: true,
      phone: true,
      address1: true,
      address2: true,
      dni: true,
    },
  },
  messages: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      senderType: true,
      senderId: true,
      content: true,
      externalId: true,
      isDelivered: true,
      createdAt: true,
    },
  },
} satisfies Prisma.ConversationSelect;

export type ConversationSummary = Prisma.ConversationGetPayload<{
  select: typeof conversationSummarySelect;
}>;

function areaFilterForUser(
  user: SessionUser
): Prisma.ConversationWhereInput | undefined {
  if (user.role === 'ADMIN') {
    return undefined;
  }

  const areaIds = (user.areaIds ?? []).filter(
    (areaId): areaId is number => typeof areaId === 'number'
  );

  if (AREA_SCOPED_ROLES.has(user.role)) {
    const conditions: Prisma.ConversationWhereInput[] = [
      { assignedToId: user.id },
    ];

    if (areaIds.length) {
      conditions.push({
        AND: [
          { areaId: { in: areaIds } },
          {
            OR: [{ assignedToId: user.id }, { assignedToId: null }],
          },
        ],
      });
    } else {
      conditions.push({ assignedToId: null });
    }

    return { OR: conditions };
  }

  if (user.role === 'SUPERVISOR') {
    if (!areaIds.length) {
      return { assignedToId: user.id };
    }
    return {
      OR: [{ assignedToId: user.id }, { areaId: { in: areaIds } }],
    };
  }

  return { assignedToId: user.id };
}

export async function listConversationsForUser(
  user: SessionUser,
  statuses?: ConversationStatus[]
) {
  const where: Prisma.ConversationWhereInput = {
    ...(statuses && statuses.length
      ? {
          status: { in: statuses },
        }
      : undefined),
  };

  const visibilityFilter = areaFilterForUser(user);
  if (visibilityFilter) {
    Object.assign(where, {
      AND: [visibilityFilter],
    });
  }

  return prisma.conversation.findMany({
    where,
    orderBy: { lastActivity: 'desc' },
    select: conversationSummarySelect,
  });
}

export async function findConversationById(id: bigint | number) {
  return prisma.conversation.findUnique({
    where: { id: BigInt(id) },
    select: conversationSelect,
  });
}

export async function ensureConversationAccess(
  user: SessionUser,
  conversationId: bigint | number
) {
  const record = await prisma.conversation.findUnique({
    where: { id: BigInt(conversationId) },
    select: conversationSelect,
  });

  if (!record) {
    return null;
  }

  if (user.role === 'ADMIN') {
    return record;
  }

  const areaIds = (user.areaIds ?? []).filter(
    (areaId): areaId is number => typeof areaId === 'number'
  );

  if (record.assignedToId === user.id) {
    return record;
  }

  if (AREA_SCOPED_ROLES.has(user.role)) {
    if (
      (record.areaId && areaIds.includes(record.areaId)) ||
      record.assignedToId === null ||
      (record.areaId === null && areaIds.length === 0)
    ) {
      return record;
    }
    return null;
  }

  if (user.role === 'SUPERVISOR') {
    if (record.areaId && areaIds.includes(record.areaId)) {
      return record;
    }
  }

  return null;
}

export async function closeConversationRecord(
  conversationId: bigint,
  options: {
    closedById: number | null;
    reason: string;
  }
) {
  const now = new Date();
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status: 'CLOSED',
      botActive: true,
      closedAt: now,
      closedById: options.closedById,
      closedReason: options.reason,
      lastActivity: now,
    },
    select: conversationSelect,
  });
}
