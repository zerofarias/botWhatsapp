import type { Request, Response } from 'express';
import { listMessages } from '../services/message.service.js';

export async function getMessages(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const messages = await listMessages(req.user.id, limit);
  return res.json(messages);
}
