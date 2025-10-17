import type { Request, Response } from 'express';
import { ConversationStatus } from '@prisma/client';
import {
  addConversationEvent,
  closeConversationRecord,
  ensureConversationAccess,
  listConversationsForUser,
  touchConversation,
} from '../services/conversation.service.js';
import {
  broadcastConversationUpdate,
  broadcastMessageRecord,
  sendTextFromSession,
} from '../services/wpp.service.js';
import {
  createConversationMessage,
  listConversationMessages,
} from '../services/message.service.js';
import { getSocketServer } from '../lib/socket.js';

function parseStatuses(value: unknown) {
  if (!value) return undefined;
  const rawValues = Array.isArray(value) ? value : String(value).split(',');
  const values = rawValues.map((item) => String(item).trim()).filter(Boolean);
  const allowed = new Set(
    Object.values(ConversationStatus).map((status) => status.toLowerCase())
  );
  const result = values
    .map((item) => item.toLowerCase())
    .filter((item) => allowed.has(item))
    .map((item) => item.toUpperCase() as ConversationStatus);
  return result.length ? result : undefined;
}

export async function listConversationsHandler(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const statuses = parseStatuses(req.query.status);
  const conversations = await listConversationsForUser(req.user, statuses);
  res.json(
    conversations.map((conversation) => ({
      id: conversation.id.toString(),
      userPhone: conversation.userPhone,
      contactName: conversation.contactName,
      area: conversation.area
        ? { id: conversation.area.id, name: conversation.area.name }
        : null,
      assignedTo: conversation.assignedTo
        ? { id: conversation.assignedTo.id, name: conversation.assignedTo.name }
        : null,
      status: conversation.status,
      botActive: conversation.botActive,
      lastActivity: conversation.lastActivity,
      updatedAt: conversation.updatedAt,
      lastMessage: conversation.messages[0]
        ? {
            id: conversation.messages[0]!.id.toString(),
            senderType: conversation.messages[0]!.senderType,
            senderId: conversation.messages[0]!.senderId,
            content: conversation.messages[0]!.content,
            createdAt: conversation.messages[0]!.createdAt,
          }
        : null,
    }))
  );
}

export async function getConversationMessagesHandler(
  req: Request,
  res: Response
) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const conversationIdParam = req.params.id;
  let conversationId: bigint;
  try {
    conversationId = BigInt(conversationIdParam);
  } catch {
    return res.status(400).json({ message: 'Invalid conversation id.' });
  }

  const conversation = await ensureConversationAccess(req.user, conversationId);
  if (!conversation) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const limit = Number.parseInt(String(req.query.limit ?? '100'), 10);
  const messages = await listConversationMessages(
    conversationId,
    Number.isNaN(limit) ? 100 : Math.min(limit, 500)
  );

  res.json(
    messages
      .map((message) => ({
        id: message.id.toString(),
        conversationId: message.conversationId.toString(),
        senderType: message.senderType,
        senderId: message.senderId,
        content: message.content,
        mediaType: message.mediaType,
        mediaUrl: message.mediaUrl,
        isDelivered: message.isDelivered,
        createdAt: message.createdAt,
      }))
      .reverse()
  );
}

export async function sendConversationMessageHandler(
  req: Request,
  res: Response
) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const conversationIdParam = req.params.id;
  const { content } = req.body ?? {};

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ message: 'Content is required.' });
  }

  let conversationId: bigint;
  try {
    conversationId = BigInt(conversationIdParam);
  } catch {
    return res.status(400).json({ message: 'Invalid conversation id.' });
  }

  const conversation = await ensureConversationAccess(req.user, conversationId);
  if (!conversation) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const messageRecord = await createConversationMessage({
    conversationId,
    senderType: 'OPERATOR',
    senderId: req.user.id,
    content,
  });

  const now = new Date();
  await touchConversation(conversationId, {
    lastActivity: now,
    botActive: false,
    ...(conversation.assignedToId
      ? undefined
      : {
          assignedTo: {
            connect: { id: req.user.id },
          },
        }),
  });

  const sent = await sendTextFromSession(
    req.user.id,
    conversation.userPhone,
    content
  );
  if (!sent) {
    await addConversationEvent(conversationId, 'NOTE', {
      type: 'send_fail',
      reason: 'whatsapp_session_unavailable',
      content,
    });
  }

  const io = getSocketServer();
  await broadcastMessageRecord(io, conversationId, messageRecord, [
    req.user.id,
  ]);
  await broadcastConversationUpdate(io, conversationId);

  res.status(201).json({
    id: messageRecord.id.toString(),
    createdAt: messageRecord.createdAt,
    isDelivered: sent,
  });
}

export async function closeConversationHandler(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const conversationIdParam = req.params.id;
  let conversationId: bigint;
  try {
    conversationId = BigInt(conversationIdParam);
  } catch {
    return res.status(400).json({ message: 'Invalid conversation id.' });
  }

  const conversation = await ensureConversationAccess(req.user, conversationId);
  if (!conversation) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { message: customMessage } = req.body ?? {};
  const closingMessage =
    typeof customMessage === 'string' && customMessage.trim().length
      ? customMessage.trim()
      : '✅ Chat finalizado. ¡Gracias por tu tiempo!';

  const updated = await closeConversationRecord(conversationId, {
    closedById: req.user.id,
    reason: 'manual_close',
  });

  await addConversationEvent(
    conversationId,
    'STATUS_CHANGE',
    {
      previousStatus: conversation.status,
      newStatus: 'CLOSED',
      reason: 'manual_close',
    },
    req.user.id
  );

  const sent = await sendTextFromSession(
    req.user.id,
    conversation.userPhone,
    closingMessage
  );
  const messageRecord = await createConversationMessage({
    conversationId,
    senderType: 'BOT',
    senderId: req.user.id,
    content: closingMessage,
  });
  if (!sent) {
    await addConversationEvent(conversationId, 'NOTE', {
      type: 'send_fail',
      reason: 'whatsapp_session_unavailable',
      content: closingMessage,
    });
  }

  const io = getSocketServer();
  await broadcastMessageRecord(io, conversationId, messageRecord, [
    req.user.id,
  ]);
  await broadcastConversationUpdate(io, conversationId);

  res.json({
    id: updated.id.toString(),
    status: updated.status,
    closedAt: updated.closedAt,
  });
}
