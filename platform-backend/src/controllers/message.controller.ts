import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { listConversationMessages } from '../services/message.service.js';

export async function getMessages(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const conversationIdRaw = req.query.conversationId;
  if (!conversationIdRaw) {
    return res.status(400).json({
      message: 'conversationId query parameter is required.',
    });
  }

  let rawValue: string | undefined;
  if (typeof conversationIdRaw === 'string') {
    rawValue = conversationIdRaw;
  } else if (Array.isArray(conversationIdRaw)) {
    rawValue =
      typeof conversationIdRaw[0] === 'string'
        ? conversationIdRaw[0]
        : undefined;
  }

  if (!rawValue) {
    return res.status(400).json({ message: 'Invalid conversationId.' });
  }

  let conversationId: bigint;
  try {
    conversationId = BigInt(rawValue);
  } catch {
    return res.status(400).json({ message: 'Invalid conversationId.' });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      assignedToId: true,
    },
  });

  if (!conversation) {
    return res.status(404).json({ message: 'Conversation not found.' });
  }

  if (
    req.user.role === 'OPERATOR' &&
    conversation.assignedToId !== req.user.id
  ) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const limit = Number.parseInt(String(req.query.limit ?? '100'), 10);
  const messages = await listConversationMessages(
    conversationId,
    Number.isNaN(limit) ? 100 : Math.min(limit, 500)
  );

  return res.json(messages.reverse());
}
