import { Request, Response } from 'express';
import { getSocketServer } from '../lib/socket.js';
import {
  getSessionInfo,
  startSession,
  stopSession,
  pauseSession,
  getOrCreateBotSessionRecord,
} from '../services/wpp.service.js';

export async function getBotStatus(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const session = getSessionInfo(req.user.id);
  if (session) {
    return res.json({ status: session.status });
  }
  const record = await getOrCreateBotSessionRecord(req.user.id);
  return res.json({ status: record.status });
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
