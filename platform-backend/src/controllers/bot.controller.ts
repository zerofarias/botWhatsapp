import type { Request, Response } from 'express';
import {
  getOrCreateBotSessionRecord,
  getSessionInfo,
  pauseSession,
  startSession,
  stopSession,
} from '../services/wpp.service.js';
import { prisma } from '../config/prisma.js';
import { getSocketServer } from '../lib/socket.js';

function ensureUser(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return false;
  }
  return true;
}

export async function getBotStatus(req: Request, res: Response) {
  if (!ensureUser(req, res)) return;

  const [record, cache] = await Promise.all([
    getOrCreateBotSessionRecord(req.user!.id),
    Promise.resolve(getSessionInfo(req.user!.id)),
  ]);

  const cacheInfo = cache
    ? {
        status: cache.status,
        lastQr: cache.lastQr,
        connectedAt: cache.connectedAt?.toISOString() ?? null,
        paused: cache.paused,
        clientReady: Boolean(cache.client),
      }
    : null;

  res.json({
    record,
    cache: cacheInfo,
  });
}

export async function startBot(req: Request, res: Response) {
  if (!ensureUser(req, res)) return;

  try {
    const session = await startSession(req.user!.id, getSocketServer());
    res.json({
      status: session?.status ?? 'CONNECTING',
      lastQr: session?.lastQr ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message });
  }
}

export async function stopBot(req: Request, res: Response) {
  if (!ensureUser(req, res)) return;

  await stopSession(req.user!.id);
  res.json({ status: 'DISCONNECTED' });
}

export async function getBotQr(req: Request, res: Response) {
  if (!ensureUser(req, res)) return;

  const record = await prisma.botSession.findUnique({
    where: {
      ownerUserId_sessionName: {
        ownerUserId: req.user!.id,
        sessionName: 'default',
      },
    },
    select: { lastQr: true, updatedAt: true },
  });

  res.json(record ?? { lastQr: null });
}

export async function togglePause(req: Request, res: Response) {
  if (!ensureUser(req, res)) return;

  const value = Boolean(req.body?.paused);
  await pauseSession(req.user!.id, value);
  res.json({ paused: value });
}

export async function updateMetadata(req: Request, res: Response) {
  if (!ensureUser(req, res)) return;

  const { headless } = req.body ?? {};
  const result = await prisma.botSession.update({
    where: {
      ownerUserId_sessionName: {
        ownerUserId: req.user!.id,
        sessionName: 'default',
      },
    },
    data: {
      headless: typeof headless === 'boolean' ? headless : undefined,
    },
  });

  res.json(result);
}
