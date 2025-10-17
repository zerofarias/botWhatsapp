import {
  create as createClient,
  type CreateOptions,
  type Message,
  type Whatsapp,
} from '@wppconnect-team/wppconnect';
import { BotSessionStatus, MessageSender, Prisma } from '@prisma/client';
import type { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import {
  assignConversationToArea,
  createConversation,
  findOpenConversationByPhone,
  isActiveConversationStatus,
  touchConversation,
} from './conversation.service.js';
import {
  createConversationMessage,
  findMessageByExternalId,
  type ConversationMessage,
} from './message.service.js';
import { listFlowTree, type FlowNode } from './flow.service.js';

type SessionCache = {
  client: Whatsapp;
  status: BotSessionStatus;
  lastQr: string | null;
  connectedAt: Date | null;
  paused: boolean;
};

type ConversationSnapshot = {
  id: string;
  userPhone: string;
  contactName: string | null;
  areaId: number | null;
  assignedToId: number | null;
  status: string;
  botActive: boolean;
  lastActivity: string;
  updatedAt: string;
};

type MessageEventPayload = {
  id: string;
  conversationId: string;
  senderType: MessageSender;
  senderId: number | null;
  content: string;
  mediaType: string | null;
  mediaUrl: string | null;
  createdAt: string;
};

type FlowExecutionResult = {
  reply: string;
  redirectAreaId?: number | null;
  pauseBot?: boolean;
  matchedNode: FlowNode;
};

const sessions = new Map<number, SessionCache>();

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function flattenFlowTree(nodes: FlowNode[]): FlowNode[] {
  const stack = [...nodes];
  const flat: FlowNode[] = [];

  while (stack.length) {
    const node = stack.shift()!;
    flat.push(node);
    if (node.children?.length) {
      stack.unshift(...node.children);
    }
  }

  return flat;
}

function findPrimaryMenuNode(nodes: FlowNode[]): FlowNode | null {
  if (!nodes.length) {
    return null;
  }
  const menu = nodes.find((node) => node.type === 'MENU');
  return menu ?? nodes[0] ?? null;
}

function buildPrimaryMenuMessage(nodes: FlowNode[]): string | null {
  const root = findPrimaryMenuNode(nodes);
  return root?.message ?? null;
}

export function extractMessageExternalId(message: Message): string | null {
  const rawId = (message as unknown as { id?: unknown }).id;
  if (!rawId) {
    return null;
  }

  if (typeof rawId === 'string') {
    return rawId;
  }

  if (typeof rawId === 'object') {
    const candidate = rawId as {
      _serialized?: unknown;
      id?: unknown;
    };
    if (typeof candidate._serialized === 'string') {
      return candidate._serialized;
    }
    if (typeof candidate.id === 'string') {
      return candidate.id;
    }
  }

  return null;
}

export function resolveMessageDate(message: Message): Date {
  const raw =
    (message as unknown as { timestamp?: unknown }).timestamp ??
    (message as unknown as { t?: unknown }).t;

  const numeric = Number(raw);
  if (!Number.isNaN(numeric) && numeric > 0) {
    const millis = numeric > 3_000_000_000 ? numeric : numeric * 1000;
    return new Date(millis);
  }

  return new Date();
}

function evaluateFlowSelection(
  nodes: FlowNode[],
  normalizedBody: string
): FlowExecutionResult | null {
  const flat = flattenFlowTree(nodes).filter((node) => node.isActive);
  const match = flat.find((node) => {
    if (!node.trigger) return false;
    return normalizeText(node.trigger) === normalizedBody;
  });

  if (!match) {
    return null;
  }

  const result: FlowExecutionResult = {
    reply: match.message,
    matchedNode: match,
  };

  if (match.type === 'REDIRECT') {
    result.redirectAreaId = match.areaId ?? null;
    result.pauseBot = true;
  } else if (match.type === 'END') {
    result.pauseBot = false;
  }

  return result;
}

function conversationRooms(snapshot: ConversationSnapshot) {
  const rooms = new Set<string>();
  if (snapshot.assignedToId) {
    rooms.add(`user:${snapshot.assignedToId}`);
  }
  if (snapshot.areaId) {
    rooms.add(`area:${snapshot.areaId}`);
  }
  rooms.add('role:ADMIN');
  rooms.add('role:SUPERVISOR');
  return rooms;
}

function emitToRoom(
  io: SocketIOServer | undefined,
  room: string,
  event: string,
  payload: unknown
) {
  if (!io) return;
  io.to(room).emit(event, payload);
}

async function fetchConversationSnapshot(
  conversationId: bigint | number
): Promise<ConversationSnapshot | null> {
  const record = await prisma.conversation.findUnique({
    where: { id: BigInt(conversationId) },
    select: {
      id: true,
      userPhone: true,
      contactName: true,
      areaId: true,
      assignedToId: true,
      status: true,
      botActive: true,
      lastActivity: true,
      updatedAt: true,
    },
  });

  if (!record) {
    return null;
  }

  return {
    id: record.id.toString(),
    userPhone: record.userPhone,
    contactName: record.contactName,
    areaId: record.areaId,
    assignedToId: record.assignedToId,
    status: record.status,
    botActive: record.botActive,
    lastActivity: record.lastActivity.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function formatMessageRecord(
  conversationId: bigint | number,
  message: ConversationMessage
): MessageEventPayload {
  return {
    id: message.id.toString(),
    conversationId: BigInt(conversationId).toString(),
    senderType: message.senderType,
    senderId: message.senderId ?? null,
    content: message.content,
    mediaType: message.mediaType ?? null,
    mediaUrl: message.mediaUrl ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function broadcastConversationUpdate(
  io: SocketIOServer | undefined,
  conversationId: bigint | number
) {
  if (!io) return null;
  const snapshot = await fetchConversationSnapshot(conversationId);
  if (!snapshot) return null;

  const rooms = conversationRooms(snapshot);
  rooms.forEach((room) =>
    emitToRoom(io, room, 'conversation:update', snapshot)
  );

  return snapshot;
}

export async function broadcastConversationEvent(
  io: SocketIOServer | undefined,
  conversationId: bigint | number,
  event: string
) {
  if (!io) return null;
  const snapshot = await fetchConversationSnapshot(conversationId);
  if (!snapshot) return null;
  const rooms = conversationRooms(snapshot);
  rooms.forEach((room) => emitToRoom(io, room, event, snapshot));
  return snapshot;
}

export async function broadcastMessageRecord(
  io: SocketIOServer | undefined,
  conversationId: bigint | number,
  message: ConversationMessage,
  extraUserIds: number[] = []
) {
  if (!io) return;
  const snapshot = await fetchConversationSnapshot(conversationId);
  if (!snapshot) return;

  const payload = formatMessageRecord(conversationId, message);
  const rooms = conversationRooms(snapshot);
  extraUserIds.forEach((userId) => rooms.add(`user:${userId}`));

  rooms.forEach((room) => emitToRoom(io, room, 'message:new', payload));
}

async function ensureConversation(
  contactNumber: string,
  io: SocketIOServer | undefined
) {
  const existing = await findOpenConversationByPhone(contactNumber);
  if (existing) {
    return { conversation: existing, created: false };
  }

  const created = await createConversation({
    userPhone: contactNumber,
    status: 'PENDING',
    botActive: true,
  });

  await broadcastConversationUpdate(io, created.id);
  await broadcastConversationEvent(io, created.id, 'conversation:incoming');
  return { conversation: created, created: true };
}

async function sendReply(
  ownerUserId: number,
  client: Whatsapp,
  conversationId: bigint,
  message: Message,
  reply: string,
  io?: SocketIOServer
) {
  const rawMessage = await client.sendText(message.from, reply);
  const outbound =
    rawMessage && typeof rawMessage === 'object'
      ? (rawMessage as Message)
      : null;

  const record = await createConversationMessage({
    conversationId,
    senderType: 'BOT',
    senderId: ownerUserId,
    content: reply,
    isDelivered: Boolean(outbound),
    externalId: outbound ? extractMessageExternalId(outbound) : null,
    createdAt: outbound ? resolveMessageDate(outbound) : new Date(),
  });

  await broadcastMessageRecord(io, conversationId, record, [ownerUserId]);
  await broadcastConversationUpdate(io, conversationId);
}

async function handleIncomingMessage(
  ownerUserId: number,
  message: Message,
  client: Whatsapp,
  io?: SocketIOServer
) {
  const body = message.body ?? message.caption ?? '';
  const normalizedBody = normalizeText(body);

  const ensureResult = await ensureConversation(message.from, io);
  let conversation = ensureResult.conversation;
  const conversationId = BigInt(conversation.id);

  const externalId = extractMessageExternalId(message);
  if (externalId) {
    const duplicate = await findMessageByExternalId(externalId);
    if (duplicate) {
      return;
    }
  }

  const receivedAt = resolveMessageDate(message);
  const flows = await listFlowTree({
    createdBy: ownerUserId,
    includeInactive: false,
  });
  const primaryMenu = buildPrimaryMenuMessage(flows);

  const record = await createConversationMessage({
    conversationId,
    senderType: 'CONTACT',
    content: body,
    externalId,
    createdAt: receivedAt,
  });

  const touchData: Prisma.ConversationUpdateInput = {
    lastActivity: record.createdAt,
  };

  if (conversation.status === 'PENDING') {
    touchData.status = 'ACTIVE';
    conversation = { ...conversation, status: 'ACTIVE' };
  }

  await touchConversation(conversationId, touchData);

  await broadcastMessageRecord(io, conversationId, record, [ownerUserId]);
  await broadcastConversationUpdate(io, conversationId);

  if (!conversation.botActive) {
    return;
  }

  if (ensureResult.created) {
    if (primaryMenu) {
      await sendReply(
        ownerUserId,
        client,
        conversationId,
        message,
        primaryMenu,
        io
      );
    }
    return;
  }

  const evaluation = evaluateFlowSelection(flows, normalizedBody);

  if (!evaluation) {
    if (primaryMenu) {
      await sendReply(
        ownerUserId,
        client,
        conversationId,
        message,
        primaryMenu,
        io
      );
    }
    return;
  }

  await sendReply(
    ownerUserId,
    client,
    conversationId,
    message,
    evaluation.reply,
    io
  );

  if (evaluation.redirectAreaId !== undefined) {
    const { operatorId } = await assignConversationToArea(
      conversationId,
      evaluation.redirectAreaId,
      { requestedById: ownerUserId }
    );
    await broadcastConversationUpdate(io, conversationId);

    if (!operatorId) {
      await broadcastConversationEvent(
        io,
        conversationId,
        'conversation:pending_assignment'
      );
    }
  }
}

function attachMessageHandlers(
  ownerUserId: number,
  client: Whatsapp,
  io?: SocketIOServer
) {
  client.onMessage(async (message) => {
    try {
      const cache = sessions.get(ownerUserId);
      if (!cache || cache.paused) {
        return;
      }
      await handleIncomingMessage(ownerUserId, message, client, io);
    } catch (error) {
      console.error('[WPP] Error handling incoming message', error);
      emitToRoom(io, `user:${ownerUserId}`, 'session:error', {
        message: error instanceof Error ? error.message : String(error),
      });
      await upsertBotSession(ownerUserId, { status: 'ERROR' });
    }
  });
}

async function upsertBotSession(
  ownerUserId: number,
  data: Partial<Prisma.BotSessionUncheckedUpdateInput>
) {
  await prisma.botSession.upsert({
    where: {
      ownerUserId_sessionName: {
        ownerUserId,
        sessionName: 'default',
      },
    },
    create: {
      ownerUserId,
      sessionName: 'default',
      status: (data.status as BotSessionStatus | undefined) ?? 'CONNECTING',
      connectedAt: (data.connectedAt as Date | null | undefined) ?? null,
      paused: Boolean(data.paused),
      lastQr: (data.lastQr as string | null | undefined) ?? null,
      headless:
        typeof data.headless === 'boolean' ? data.headless : env.wppHeadless,
    },
    update: data,
  });
}

export async function startSession(ownerUserId: number, io?: SocketIOServer) {
  if (sessions.has(ownerUserId)) {
    return sessions.get(ownerUserId);
  }

  await upsertBotSession(ownerUserId, {
    status: 'CONNECTING',
    connectedAt: null,
  });

  const options: CreateOptions = {
    session: `user-${ownerUserId}`,
    headless: env.wppHeadless,
    autoClose: env.wppAutoCloseMs,
    catchQR: (qrCode: string, asciiQR: string) => {
      const cached = sessions.get(ownerUserId);
      if (cached) {
        cached.lastQr = asciiQR;
        sessions.set(ownerUserId, cached);
      }
      emitToRoom(io, `user:${ownerUserId}`, 'session:qr', {
        qr: qrCode,
        ascii: asciiQR,
      });
      void upsertBotSession(ownerUserId, { lastQr: asciiQR });
    },
    statusFind: (status: string) => {
      const statusMap: Record<string, BotSessionStatus> = {
        isLogged: 'CONNECTED',
        desconnectedMobile: 'DISCONNECTED',
        qrReadSuccess: 'CONNECTING',
        desconnected: 'DISCONNECTED',
      };
      const normalized =
        statusMap[status] ??
        (status.toLowerCase().includes('error') ? 'ERROR' : 'CONNECTING');

      const cached = sessions.get(ownerUserId);
      if (cached) {
        cached.status = normalized;
        cached.connectedAt =
          normalized === 'CONNECTED' ? new Date() : cached.connectedAt;
        sessions.set(ownerUserId, cached);
      }

      emitToRoom(io, `user:${ownerUserId}`, 'session:status', normalized);
      void upsertBotSession(ownerUserId, {
        status: normalized,
        connectedAt: normalized === 'CONNECTED' ? new Date() : null,
      });
    },
    onLoadingScreen: (percent: number, message: string) => {
      emitToRoom(io, `user:${ownerUserId}`, 'session:loading', {
        percent,
        message,
      });
    },
  };

  const client = await createClient(options);
  const cache: SessionCache = {
    client,
    status: 'CONNECTED',
    lastQr: null,
    connectedAt: new Date(),
    paused: false,
  };
  sessions.set(ownerUserId, cache);

  attachMessageHandlers(ownerUserId, client, io);

  emitToRoom(io, `user:${ownerUserId}`, 'session:status', 'CONNECTED');
  await upsertBotSession(ownerUserId, {
    status: 'CONNECTED',
    connectedAt: new Date(),
    lastQr: null,
  });

  return cache;
}

export async function stopSession(ownerUserId: number) {
  const cache = sessions.get(ownerUserId);
  if (!cache) return;

  await cache.client.close();
  sessions.delete(ownerUserId);
  await upsertBotSession(ownerUserId, {
    status: 'DISCONNECTED',
    connectedAt: null,
  });
}

export async function pauseSession(ownerUserId: number, paused: boolean) {
  const cache = sessions.get(ownerUserId);
  if (cache) {
    cache.paused = paused;
    sessions.set(ownerUserId, cache);
  }

  await upsertBotSession(ownerUserId, { paused });
}

export function getSessionInfo(ownerUserId: number) {
  return sessions.get(ownerUserId) ?? null;
}

export async function getOrCreateBotSessionRecord(ownerUserId: number) {
  return prisma.botSession.upsert({
    where: {
      ownerUserId_sessionName: {
        ownerUserId,
        sessionName: 'default',
      },
    },
    create: {
      ownerUserId,
      sessionName: 'default',
      status: 'DISCONNECTED',
    },
    update: {},
  });
}

export function getActiveSessionOwnerIds() {
  return Array.from(sessions.keys());
}

export async function sendTextFromSession(
  ownerUserId: number,
  chatId: string,
  content: string
): Promise<Message | null> {
  const cache = sessions.get(ownerUserId);
  if (!cache) {
    return null;
  }

  try {
    const rawMessage = await cache.client.sendText(chatId, content);
    return rawMessage && typeof rawMessage === 'object'
      ? (rawMessage as Message)
      : null;
  } catch (error) {
    console.error(
      '[WPP] Failed to send message from session',
      ownerUserId,
      error
    );
    return null;
  }
}
