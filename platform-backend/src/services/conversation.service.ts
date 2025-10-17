import {
  ConversationEventType,
  ConversationStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../config/prisma.js';
import type { SessionUser } from '../types/express.js';

const conversationSelect = {
  id: true,
  userPhone: true,
  contactName: true,
  areaId: true,
  assignedToId: true,
  status: true,
  botActive: true,
  lastActivity: true,
  lastBotMessageAt: true,
  closedAt: true,
  closedReason: true,
  closedById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ConversationSelect;

export type ConversationRecord = Prisma.ConversationGetPayload<{
  select: typeof conversationSelect;
}>;

type CreateConversationInput = {
  userPhone: string;
  contactName?: string | null;
  areaId?: number | null;
  assignedToId?: number | null;
  status?: ConversationStatus;
  botActive?: boolean;
};

export async function findOpenConversationByPhone(
  userPhone: string
): Promise<ConversationRecord | null> {
  const record = await prisma.conversation.findFirst({
    where: {
      userPhone,
      status: {
        in: ['PENDING', 'ACTIVE', 'PAUSED'],
      },
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
      areaId: input.areaId ?? null,
      assignedToId: input.assignedToId ?? null,
      status: input.status ?? 'PENDING',
      botActive: input.botActive ?? true,
    },
    select: conversationSelect,
  });
}

export async function touchConversation(
  conversationId: bigint,
  data: Prisma.ConversationUpdateInput
) {
  await prisma.conversation.update({
    where: { id: conversationId },
    data,
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
      payload: payload ?? Prisma.JsonNull,
      createdById: createdById ?? null,
    },
  });
}

const conversationSummarySelect = {
  id: true,
  userPhone: true,
  contactName: true,
  areaId: true,
  assignedToId: true,
  status: true,
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
  messages: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      senderType: true,
      senderId: true,
      content: true,
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

  const baseConditions: Prisma.ConversationWhereInput[] = [];
  baseConditions.push({ assignedToId: user.id });

  if (areaIds.length) {
    baseConditions.push({
      areaId: { in: areaIds },
    });
  }

  if (user.role === 'SUPERVISOR') {
    // supervisors can also see unassigned conversations in their areas
    if (areaIds.length) {
      baseConditions.push({
        AND: [{ assignedToId: null }, { areaId: { in: areaIds } }],
      });
    }
  }

  if (baseConditions.length === 1) {
    return baseConditions[0];
  }

  return { OR: baseConditions };
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
    orderBy: { updatedAt: 'desc' },
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

  if (
    (user.role === 'SUPERVISOR' || user.role === 'OPERATOR') &&
    record.areaId &&
    areaIds.includes(record.areaId)
  ) {
    return record;
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
