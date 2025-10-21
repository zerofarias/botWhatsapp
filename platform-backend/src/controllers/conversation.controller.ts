// Endpoint para listar todas las conversaciones del sistema (todas las personas)
import { prisma } from '../config/prisma.js';
import { conversationSelect } from '../services/conversation.service.js';

export async function listAllChatsHandler(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const allChats = await prisma.conversation.findMany({
      orderBy: { createdAt: 'asc' },
      select: conversationSelect,
    });
    const mapped = allChats.map((c) => ({
      ...c,
      id: c.id.toString(),
      contact: c.contact ? { ...c.contact, id: c.contact.id.toString() } : null,
    }));
    res.json(mapped);
  } catch (error) {
    res
      .status(500)
      .json({
        message: 'Error al obtener todas las conversaciones',
        error: String(error),
      });
  }
}
// Endpoint para listar todos los chats de un número, separados por estado

function mapConversationForResponse(conversation: any) {
  const contact = conversation.contact
    ? {
        ...conversation.contact,
        id: conversation.contact.id.toString(),
      }
    : null;

  return {
    ...conversation,
    id: conversation.id.toString(),
    contact,
  };
}

export async function listAllChatsByPhoneHandler(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const phone = req.params.phone;
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ message: 'Phone is required.' });
  }

  const possibleFormats = [
    phone,
    `+${phone}`,
    phone.startsWith('+') ? phone.substring(1) : null,
  ].filter(Boolean) as string[];

  // Buscar todas las conversaciones de ese número
  const allChats = await prisma.conversation.findMany({
    where: {
      userPhone: {
        in: possibleFormats,
      },
    },
    orderBy: { createdAt: 'asc' },
    select: conversationSelect,
  });

  const abiertosRaw = allChats.filter(
    (c: { status: ConversationStatus }) =>
      c.status === 'ACTIVE' || c.status === 'PENDING' || c.status === 'PAUSED'
  );
  const cerradosRaw = allChats.filter(
    (c: { status: ConversationStatus }) => c.status === 'CLOSED'
  );

  const abiertos = abiertosRaw.map(mapConversationForResponse);
  const cerrados = cerradosRaw.map(mapConversationForResponse);

  res.json({ abiertos, cerrados });
}
import type { Request, Response } from 'express';
import { ConversationStatus } from '@prisma/client';
import {
  getCombinedChatHistoryByPhone,
  addConversationEvent,
  closeConversationRecord,
  ensureConversationAccess,
  listConversationsForUser,
  touchConversation,
  addConversationNote,
  listConversationNotes,
} from '../services/conversation.service.js';
export async function getCombinedChatHistoryHandler(
  req: Request,
  res: Response
) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const phone = req.params.phone;
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ message: 'Phone is required.' });
  }
  // Opcional: verificar permisos del usuario sobre ese teléfono
  try {
    const history = await getCombinedChatHistoryByPhone(phone);
    res.json(history);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener historial combinado',
      error: String(error),
    });
  }
}

export async function createConversationNoteHandler(
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
  const { content } = req.body ?? {};
  if (!content || typeof content !== 'string' || !content.trim().length) {
    return res.status(400).json({ message: 'Content is required.' });
  }
  const note = await addConversationNote(
    conversationId,
    content.trim(),
    req.user.id
  );
  let noteContent = '';
  if (
    note.payload &&
    typeof note.payload === 'object' &&
    'content' in note.payload
  ) {
    noteContent = (note.payload as any).content;
  }
  res.status(201).json({
    id: note.id.toString(),
    content: noteContent,
    createdAt: note.createdAt,
    createdById: note.createdById,
  });
}

// Listar notas internas de una conversación
export async function listConversationNotesHandler(
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
  const notes = await listConversationNotes(conversationId);
  res.json(
    notes.map((note) => {
      let noteContent = '';
      if (
        note.payload &&
        typeof note.payload === 'object' &&
        'content' in note.payload
      ) {
        noteContent = (note.payload as any).content;
      }
      return {
        id: note.id.toString(),
        content: noteContent,
        createdAt: note.createdAt,
        createdById: note.createdById,
      };
    })
  );
}
import {
  broadcastConversationEvent,
  broadcastConversationUpdate,
  broadcastMessageRecord,
  sendTextFromSession,
  extractMessageExternalId,
  resolveMessageDate,
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
      contact: conversation.contact
        ? {
            id: conversation.contact.id,
            name: conversation.contact.name,
            phone: conversation.contact.phone,
            dni: conversation.contact.dni,
          }
        : {
            id: conversation.contactId ?? null,
            name: conversation.contactName,
            phone: conversation.userPhone,
            dni: null,
          },
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
            externalId: conversation.messages[0]!.externalId,
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
  if (conversation.status === 'CLOSED') {
    return res
      .status(409)
      .json({ message: 'Conversation is closed. Start a new chat.' });
  }

  const limit = Number.parseInt(String(req.query.limit ?? '100'), 10);
  const messages = await listConversationMessages(
    conversationId,
    Number.isNaN(limit) ? 100 : Math.min(limit, 500)
  );

  res.json(
    messages.map((message) => ({
      id: message.id.toString(),
      conversationId: message.conversationId.toString(),
      senderType: message.senderType,
      senderId: message.senderId,
      content: message.content,
      mediaType: message.mediaType,
      mediaUrl: message.mediaUrl,
      isDelivered: message.isDelivered,
      externalId: message.externalId,
      createdAt: message.createdAt,
    }))
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

  const bodyContent = content.trim();
  if (!bodyContent.length) {
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

  const outbound = await sendTextFromSession(
    req.user.id,
    conversation.userPhone,
    bodyContent
  );
  if (!outbound) {
    await addConversationEvent(conversationId, 'NOTE', {
      type: 'send_fail',
      reason: 'whatsapp_session_unavailable',
      content,
    });
  }

  const messageRecord = await createConversationMessage({
    conversationId,
    senderType: 'OPERATOR',
    senderId: req.user.id,
    content: bodyContent,
    isDelivered: Boolean(outbound),
    externalId: outbound ? extractMessageExternalId(outbound) : null,
    createdAt: outbound ? resolveMessageDate(outbound) : new Date(),
  });

  await touchConversation(conversationId, {
    lastActivity: messageRecord.createdAt,
    status: 'ACTIVE',
    botActive: false,
    ...(conversation.assignedToId
      ? undefined
      : {
          assignedTo: {
            connect: { id: req.user.id },
          },
        }),
  });

  const io = getSocketServer();
  await broadcastMessageRecord(io, conversationId, messageRecord, [
    req.user.id,
  ]);
  await broadcastConversationUpdate(io, conversationId);

  res.status(201).json({
    id: messageRecord.id.toString(),
    createdAt: messageRecord.createdAt,
    isDelivered: messageRecord.isDelivered,
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
      : '\\u2705 Chat finalizado por el operador';

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

  const outbound = await sendTextFromSession(
    req.user.id,
    conversation.userPhone,
    closingMessage
  );
  if (!outbound) {
    await addConversationEvent(conversationId, 'NOTE', {
      type: 'send_fail',
      reason: 'whatsapp_session_unavailable',
      content: closingMessage,
    });
  }

  const messageRecord = await createConversationMessage({
    conversationId,
    senderType: 'BOT',
    senderId: req.user.id,
    content: closingMessage,
    isDelivered: Boolean(outbound),
    externalId: outbound ? extractMessageExternalId(outbound) : null,
    createdAt: outbound ? resolveMessageDate(outbound) : new Date(),
  });

  const io = getSocketServer();
  await broadcastMessageRecord(io, conversationId, messageRecord, [
    req.user.id,
  ]);
  await broadcastConversationUpdate(io, conversationId);
  await broadcastConversationEvent(io, conversationId, 'conversation:closed');

  res.json({
    id: updated.id.toString(),
    status: updated.status,
    closedAt: updated.closedAt,
  });
}
