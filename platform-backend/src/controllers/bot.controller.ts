import type { Request, Response } from 'express';
import type { Server as SocketIOServer } from 'socket.io';
import {
  getOrCreateBotSessionRecord,
  getSessionInfo,
  pauseSession,
  startSession,
  stopSession,
} from '../services/wpp.service.js';
import { prisma } from '../config/prisma.js';

let ioRef: SocketIOServer | undefined;

export function attachBotController(io: SocketIOServer) {
  ioRef = io;
}

export async function getBotStatus(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const [record, cache] = await Promise.all([
    getOrCreateBotSessionRecord(req.user.id),
    Promise.resolve(getSessionInfo(req.user.id)),
  ]);

  return res.json({
    record,
    cache,
  });
}

export async function startBot(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const session = await startSession(req.user.id, ioRef);
    return res.json({
      status: session?.status ?? 'CONNECTING',
      lastQr: session?.lastQr,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ message });
  }
}

export async function stopBot(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await stopSession(req.user.id);
  return res.json({ status: 'DISCONNECTED' });
}

export async function getBotQr(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const record = await prisma.botSession.findUnique({
    where: { userId: req.user.id },
    select: { lastQr: true, updatedAt: true },
  });

  return res.json(record ?? { lastQr: null });
}

export async function togglePause(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { paused } = req.body ?? {};
  const value = Boolean(paused);
  await pauseSession(req.user.id, value);
  return res.json({ paused: value });
}

export async function updateMetadata(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { displayName, phoneNumber } = req.body ?? {};
  const result = await prisma.botSession.update({
    where: { userId: req.user.id },
    data: {
      displayName,
      phoneNumber,
    },
  });

  return res.json(result);
}
