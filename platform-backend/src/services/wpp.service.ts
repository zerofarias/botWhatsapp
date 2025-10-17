import {
  create as createClient,
  type Message,
  type Whatsapp,
  type CreateOptions,
} from '@wppconnect-team/wppconnect';
import type { BotStatus } from '@prisma/client';
import type { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

type SessionCache = {
  client: Whatsapp;
  status: string;
  lastQr: string | null;
  connectedAt?: Date;
  paused: boolean;
};

const sessions = new Map<number, SessionCache>();

function userSessionKey(userId: number) {
  return `user-${userId}`;
}

function emitToUser(
  io: SocketIOServer | undefined,
  userId: number,
  event: string,
  payload: unknown
) {
  if (!io) return;
  io.to(String(userId)).emit(event, payload);
}

async function upsertBotSession(
  userId: number,
  data: Partial<{
    status: BotStatus;
    connectedAt: Date | null;
    paused: boolean;
    lastQr: string | null;
    displayName: string | null;
    phoneNumber: string | null;
  }>
) {
  await prisma.botSession.upsert({
    where: { userId },
    create: {
      userId,
      status: data.status ?? 'CONNECTING',
      connectedAt: data.connectedAt ?? null,
      paused: data.paused ?? false,
      lastQr: data.lastQr ?? null,
      displayName: data.displayName ?? null,
      phoneNumber: data.phoneNumber ?? null,
    } satisfies Parameters<typeof prisma.botSession.create>[0]['data'],
    update: {
      ...data,
    } satisfies Parameters<typeof prisma.botSession.update>[0]['data'],
  });
}

export async function startSession(userId: number, io?: SocketIOServer) {
  if (sessions.has(userId)) {
    return sessions.get(userId);
  }

  await upsertBotSession(userId, { status: 'CONNECTING', connectedAt: null });

  const sessionConfig: CreateOptions = {
    session: userSessionKey(userId),
    headless: env.wppHeadless,
    autoClose: env.wppAutoClose ? 60000 : 0,
    catchQR: (qrCode: string, asciiQR: string) => {
      sessions.set(userId, {
        ...(sessions.get(userId) ?? {
          status: 'CONNECTING',
          paused: false,
        }),
        client: sessions.get(userId)?.client as Whatsapp,
        lastQr: asciiQR,
        connectedAt: sessions.get(userId)?.connectedAt,
      });

      emitToUser(io, userId, 'qr_code', { qr: qrCode, ascii: asciiQR });
      void upsertBotSession(userId, { lastQr: asciiQR });
    },
    statusFind: (status: string) => {
      const payload = sessions.get(userId);
      if (payload) {
        payload.status = status;
        sessions.set(userId, payload);
      }
      emitToUser(io, userId, 'session_status', status);

      const statusMap: Record<string, BotStatus> = {
        isLogged: 'CONNECTED',
        desconnectedMobile: 'DISCONNECTED',
        qrReadSuccess: 'CONNECTING',
        desconnected: 'DISCONNECTED',
      };

      const normalized: BotStatus =
        statusMap[status] ??
        (status.toLowerCase().includes('error') ? 'ERROR' : 'CONNECTING');

      void upsertBotSession(userId, {
        status: normalized,
        connectedAt: normalized === 'CONNECTED' ? new Date() : null,
      });
    },
    onLoadingScreen: (percent: number, message: string) => {
      emitToUser(io, userId, 'loading', { percent, message });
    },
  };

  const client = await createClient(sessionConfig)
    .then((instance) => {
      const cache: SessionCache = {
        client: instance,
        status: 'CONNECTED',
        lastQr: null,
        connectedAt: new Date(),
        paused: false,
      };
      sessions.set(userId, cache);
      emitToUser(io, userId, 'session_status', 'CONNECTED');
      void upsertBotSession(userId, {
        status: 'CONNECTED',
        connectedAt: new Date(),
        lastQr: null,
      });
      attachMessageHandlers(userId, instance, io);
      return cache;
    })
    .catch((error) => {
      console.error('[WPP] Failed to start session', error);
      emitToUser(io, userId, 'session_status', 'ERROR');
      void upsertBotSession(userId, { status: 'ERROR' });
      throw error;
    });

  return client;
}

function normalizeText(text: string | undefined): string {
  return (text ?? '').trim().toLowerCase();
}

async function sendReply(
  userId: number,
  client: Whatsapp,
  message: Message,
  response: string,
  io?: SocketIOServer
) {
  await client.sendText(message.from, response);
  await prisma.message.create({
    data: {
      userId,
      contact: message.from,
      body: response,
      type: 'OUT',
    },
  });

  emitToUser(io, userId, 'message', {
    direction: 'out',
    contact: message.from,
    body: response,
    timestamp: new Date().toISOString(),
  });
}

async function handleIncomingMessage(
  userId: number,
  message: Message,
  client: Whatsapp,
  io?: SocketIOServer
) {
  const body = message.body ?? message.caption ?? '';
  const normalizedBody = normalizeText(body);

  await prisma.message.create({
    data: {
      userId,
      contact: message.from,
      body,
      type: 'IN',
    },
  });

  emitToUser(io, userId, 'message', {
    direction: 'in',
    contact: message.from,
    body,
    timestamp: new Date().toISOString(),
  });

  const flows = await prisma.flow.findMany({
    where: { userId },
    orderBy: { id: 'asc' },
  });

  let replied = false;
  for (const flow of flows) {
    const keyword = normalizeText(flow.keyword);
    if (!keyword || keyword === '*default*') continue;

    if (normalizedBody.includes(keyword)) {
      await sendReply(userId, client, message, flow.response, io);
      replied = true;
      break;
    }
  }

  if (!replied) {
    const defaultFlow = flows.find(
      (f) => normalizeText(f.keyword) === '*default*'
    );
    if (defaultFlow) {
      await sendReply(userId, client, message, defaultFlow.response, io);
    }
  }
}

function attachMessageHandlers(
  userId: number,
  client: Whatsapp,
  io?: SocketIOServer
) {
  client.onMessage(async (message) => {
    try {
      const cache = sessions.get(userId);
      if (!cache || cache.paused) {
        return;
      }
      await handleIncomingMessage(userId, message, client, io);
    } catch (error) {
      console.error('[WPP] Error handling incoming message', error);
      emitToUser(io, userId, 'session_status', 'ERROR');
      await upsertBotSession(userId, { status: 'ERROR' });
    }
  });
}

export async function stopSession(userId: number) {
  const session = sessions.get(userId);
  if (!session) return;

  await session.client.close();
  sessions.delete(userId);
  await upsertBotSession(userId, { status: 'DISCONNECTED', connectedAt: null });
}

export function pauseSession(userId: number, paused: boolean) {
  const session = sessions.get(userId);
  if (session) {
    session.paused = paused;
    sessions.set(userId, session);
  }
  return prisma.botSession.update({
    where: { userId },
    data: { paused },
  });
}

export function getSessionInfo(userId: number) {
  const session = sessions.get(userId);
  if (!session) {
    return null;
  }

  return {
    status: session.status,
    lastQr: session.lastQr,
    connectedAt: session.connectedAt,
    paused: session.paused,
  };
}

export async function getOrCreateBotSessionRecord(userId: number) {
  return prisma.botSession.upsert({
    where: { userId },
    create: {
      userId,
      status: 'DISCONNECTED',
    },
    update: {},
  });
}
