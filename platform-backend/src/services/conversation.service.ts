import {
  ConversationEventType,
  ConversationStatus,
  Prisma,
  type UserRole,
} from '@prisma/client';
import { prisma } from '../config/prisma.js';
import type { SessionUser } from '../types/express.js';

const conversationSelect = {
  id: true,
  userPhone: true,
  contactName: true,
  contactId: true,
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
  contact: {
    select: {
      id: true,
      name: true,
      phone: true,
      dni: true,
    },
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
    }

    return conditions.length === 1 ? conditions[0] : { OR: conditions };
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
    if (record.areaId && areaIds.includes(record.areaId)) {
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
