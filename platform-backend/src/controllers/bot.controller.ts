import { Request, Response } from 'express';
import { getSocketServer } from '../lib/socket.js';
import { prisma } from '../config/prisma.js';
import {
  getSessionInfo,
  startSession,
  stopSession,
  pauseSession,
  getOrCreateBotSessionRecord,
  clearSessionData,
} from '../services/wpp.service.js';

export async function getBotStatus(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const record = await getOrCreateBotSessionRecord(req.user.id);
  const session = getSessionInfo(req.user.id);
  return res.json({
    record: {
      status: record.status,
      connectedAt: record.connectedAt ? record.connectedAt.toISOString() : null,
      paused: record.paused,
      lastQr: record.lastQr,
      lastQrAscii: null,
    },
    cache: session
      ? {
          status: session.status,
          lastQr: session.lastQr,
          lastQrAscii: session.lastQrAscii ?? null,
          connectedAt: session.connectedAt
            ? session.connectedAt.toISOString()
            : undefined,
          paused: session.paused,
        }
      : null,
    autoStart: record.autoStart ?? false,
  });
}

export async function startBot(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const io = getSocketServer();
  await startSession(req.user.id, io);
  res.status(200).json({ message: 'Bot session starting' });
}

export async function stopBot(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  await stopSession(req.user.id);
  res.status(200).json({ message: 'Bot session stopped' });
}

export async function getBotQr(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const session = getSessionInfo(req.user.id);
  const qr = session?.lastQr ?? null;
  res.json({ qr });
}

export async function togglePause(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const paused = Boolean(req.body.paused);
  await pauseSession(req.user.id, paused);
  res
    .status(200)
    .json({ message: `Bot session ${paused ? 'paused' : 'resumed'}` });
}

export async function updateMetadata(req: Request, res: Response) {
  // This is a placeholder as the original logic was lost.
  // TODO: Implement metadata update logic if needed.
  res.status(501).json({ message: 'Not implemented' });
}

export async function resetBotSession(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const io = getSocketServer();
  try {
    try {
      await stopSession(req.user.id);
    } catch (stopError) {
      console.warn(
        '[BotController] stopSession failed during reset, continuing to clear data:',
        stopError
      );
    }

    await clearSessionData(req.user.id);
    io?.to(`user:${req.user.id}`).emit('session:status', 'DISCONNECTED');
    res.status(200).json({
      message:
        'Sesión eliminada. Escanea nuevamente el código QR para reconectar.',
    });
  } catch (error) {
    console.error('[BotController] Failed to reset session', error);
    res.status(500).json({
      message: 'No se pudo borrar la sesión. Intenta nuevamente.',
    });
  }
}

export async function setAutoStartPreference(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const autoStart = Boolean(req.body?.autoStart);
  try {
    await getOrCreateBotSessionRecord(req.user.id);
    await prisma.botSession.update({
      where: {
        ownerUserId_sessionName: {
          ownerUserId: req.user.id,
          sessionName: 'default',
        },
      },
      data: {
        autoStart,
      },
    });
    if (autoStart) {
      const io = getSocketServer();
      await startSession(req.user.id, io);
    }
    res.json({ autoStart });
  } catch (error) {
    console.error('[BotController] Failed to update autoStart', error);
    res
      .status(500)
      .json({ message: 'No se pudo actualizar el inicio automático.' });
  }
}
