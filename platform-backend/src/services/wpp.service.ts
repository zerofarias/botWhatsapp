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
  createConversation,
  findOpenConversationByPhone,
  touchConversation,
} from './conversation.service.js';
import {
  createConversationMessage,
  type ConversationMessage,
} from './message.service.js';
import { listFlowTree } from './flow.service.js';

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

const sessions = new Map<number, SessionCache>();

function normalizeText(value: string) {
  return value.trim().toLowerCase();
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
  if (!io) return;
  const snapshot = await fetchConversationSnapshot(conversationId);
  if (!snapshot) return;

  const rooms = conversationRooms(snapshot);
  rooms.forEach((room) =>
    emitToRoom(io, room, 'conversation:update', snapshot)
  );
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
  return { conversation: created, created: true };
}

async function processFlows(ownerUserId: number, normalizedBody: string) {
  const flows = await listFlowTree({
    createdBy: ownerUserId,
    includeInactive: false,
  });

  const queue = [...flows];
  let fallbackMessage: string | null = null;

  while (queue.length) {
    const node = queue.shift()!;
    const trigger = node.trigger ? normalizeText(node.trigger) : null;

    if (trigger === '*default*') {
      if (!fallbackMessage) {
        fallbackMessage = node.message;
      }
    } else if (
      trigger &&
      trigger.length > 0 &&
      normalizedBody.includes(trigger)
    ) {
      return node.message;
    }

    queue.push(...node.children);
  }

  return fallbackMessage;
}

async function sendReply(
  ownerUserId: number,
  client: Whatsapp,
  conversationId: bigint,
  message: Message,
  reply: string,
  io?: SocketIOServer
) {
  await client.sendText(message.from, reply);

  const record = await createConversationMessage({
    conversationId,
    senderType: 'BOT',
    senderId: ownerUserId,
    content: reply,
  });

  await touchConversation(conversationId, {
    lastActivity: new Date(),
    lastBotMessageAt: new Date(),
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

  const { conversation } = await ensureConversation(message.from, io);
  const conversationId = BigInt(conversation.id);

  const record = await createConversationMessage({
    conversationId,
    senderType: 'CONTACT',
    content: body,
  });

  await touchConversation(conversationId, {
    lastActivity: new Date(),
  });

  await broadcastMessageRecord(io, conversationId, record, [ownerUserId]);
  await broadcastConversationUpdate(io, conversationId);

  const reply = await processFlows(ownerUserId, normalizedBody);
  if (reply) {
    await sendReply(ownerUserId, client, conversationId, message, reply, io);
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
    autoClose: env.wppAutoClose ? 60000 : 0,
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
) {
  const cache = sessions.get(ownerUserId);
  if (!cache) {
    return false;
  }

  try {
    await cache.client.sendText(chatId, content);
    return true;
  } catch (error) {
    console.error(
      '[WPP] Failed to send message from session',
      ownerUserId,
      error
    );
    return false;
  }
}
