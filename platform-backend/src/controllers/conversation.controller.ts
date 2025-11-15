import { getNextNodeAndContext } from '../services/flow.service';
/**
 * @swagger
 * /conversations:
 *   get:
 *     summary: Listar todas las conversaciones
 *     tags:
 *       - Conversaciones
 *     responses:
 *       200:
 *         description: Lista de conversaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   userPhone:
 *                     type: string
 *                   contactName:
 *                     type: string
 *                   status:
 *                     type: string
 *                   botActive:
 *                     type: boolean
 *                   lastActivity:
 *                     type: string
 *                   updatedAt:
 *                     type: string
 *                   contact:
 *                     type: object
 *                   area:
 *                     type: object
 *                   assignedTo:
 *                     type: object
 *                   lastMessage:
 *                     type: object
 *   post:
 *     summary: Crear una conversaciÃ³n
 *     tags:
 *       - Conversaciones
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userPhone:
 *                 type: string
 *               contactName:
 *                 type: string
 *               areaId:
 *                 type: integer
 *               botId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: ConversaciÃ³n creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 status:
 *                   type: string
 *                 botActive:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *       500:
 *         description: Error al crear conversaciÃ³n
 */

import {
  ConversationProgressStatus,
  ConversationStatus,
  OrderStatus,
} from '@prisma/client';
import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { getSocketServer } from '../lib/socket.js';
import {
  conversationSelect,
  getCombinedChatHistoryByPhone,
  addConversationEvent,
  closeConversationRecord,
  ensureConversationAccess,
  listConversationsForUser,
  touchConversation,
  addConversationNote,
  listConversationNotes,
} from '../services/conversation.service.js';
import {
  createConversationMessage,
  listConversationMessages,
  type ConversationMessage,
} from '../services/message.service.js';
import {
  broadcastMessageRecord,
  sendTextFromSession,
  extractMessageExternalId,
  resolveMessageDate,
  broadcastConversationEvent,
  broadcastConversationUpdate,
  resolveTemplateVariables,
} from '../services/wpp.service.js';
import { executeNode } from '../services/node-execution.service.js';

const PROGRESS_STATUS_MESSAGES: Record<ConversationProgressStatus, string> = {
  PENDING: 'Su pedido está pendiente. En breve le daremos novedades.',
  IN_PREPARATION: 'Su pedido está en preparación.',
  COMPLETED: 'Su pedido está completado.',
  CANCELLED:
    'Su pedido ha sido cancelado. Si necesita ayuda contáctenos nuevamente.',
  INACTIVE:
    'Cerramos esta conversación por inactividad. Escríbanos si necesita continuar.',
};

const PROGRESS_TO_ORDER_STATUS: Partial<
  Record<ConversationProgressStatus, OrderStatus>
> = {
  PENDING: OrderStatus.PENDING,
  IN_PREPARATION: OrderStatus.CONFIRMADO,
  COMPLETED: OrderStatus.COMPLETADO,
  CANCELLED: OrderStatus.CANCELADO,
};

function sanitizeOrderBigInts(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeOrderBigInts);
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeOrderBigInts(value);
    }
    return result;
  }
  return obj;
}

async function syncOrderStatusWithProgress(
  conversationId: bigint,
  progressStatus: ConversationProgressStatus
) {
  const targetStatus = PROGRESS_TO_ORDER_STATUS[progressStatus];
  if (!targetStatus) {
    return;
  }

  try {
    const updateData: Record<string, unknown> = {
      status: targetStatus,
      updatedAt: new Date(),
    };

    if (
      targetStatus === OrderStatus.COMPLETADO ||
      targetStatus === OrderStatus.CANCELADO
    ) {
      updateData.closedAt = new Date();
    } else {
      updateData.closedAt = null;
    }

    const result = await (prisma as any).order.updateMany({
      where: { conversationId },
      data: updateData,
    });

    if (!result.count) {
      return;
    }

    const updatedOrders = await (prisma as any).order.findMany({
      where: { conversationId },
      include: {
        conversation: {
          select: { userPhone: true, contactName: true },
        },
      },
    });

    const io = getSocketServer();
    updatedOrders.forEach((order: any) => {
      const sanitized = sanitizeOrderBigInts(order);
      io?.emit('order:updated', sanitized);
    });
  } catch (error) {
    console.warn(
      '[Conversation] Failed to sync order status',
      conversationId.toString(),
      error instanceof Error ? error.message : error
    );
  }
}

// Controladores de conversaciÃ³n
export async function takeConversationHandler(req: Request, res: Response) {
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
  // Verifica permisos y estado actual
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) {
    return res.status(404).json({ message: 'Conversation not found.' });
  }
  if (conversation.assignedToId) {
    return res.status(409).json({ message: 'Conversation already taken.' });
  }
  // Asigna al operador y desactiva el bot
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      assignedTo: { connect: { id: req.user.id } },
      botActive: false,
    },
  });

  // NotificaciÃ³n en tiempo real
  const io = getSocketServer();
  io?.emit('conversation:take', {
    conversationId: conversationId.toString(),
    assignedTo: req.user.id,
    assignedToName: req.user.name,
    botActive: false,
  });

  // TambiÃ©n emitir actualizaciÃ³n completa de la conversaciÃ³n
  await broadcastConversationUpdate(io, conversationId);

  res.json({ success: true, assignedTo: req.user.id, botActive: false });
}

export async function finishConversationHandler(req: Request, res: Response) {
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

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { status: true },
  });
  if (!conversation) {
    return res.status(404).json({ message: 'Conversation not found.' });
  }

  const rawReason =
    typeof req.body?.reason === 'string' && req.body.reason.trim().length > 0
      ? req.body.reason.trim()
      : null;
  const resolvedReason = rawReason ?? 'manual_close';
  const now = new Date();

  const updatedConversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status: 'CLOSED',
      botActive: false,
      lastActivity: now,
      closedAt: now,
      closedReason: resolvedReason,
      assignedTo: { disconnect: true },
      closedBy: { connect: { id: req.user.id } },
    },
    select: {
      id: true,
      status: true,
      closedAt: true,
      closedReason: true,
    },
  });

  await addConversationEvent(
    conversationId,
    'STATUS_CHANGE',
    {
      previousStatus: conversation.status,
      newStatus: 'CLOSED',
      reason: resolvedReason,
      closedAt: now.toISOString(),
    },
    req.user.id
  );

  const io = getSocketServer();
  io?.emit('conversation:finish', {
    conversationId: conversationId.toString(),
    status: 'CLOSED',
    reason: resolvedReason,
    closedAt: updatedConversation.closedAt?.toISOString() ?? null,
    closedReason: resolvedReason,
  });
  await broadcastConversationUpdate(io, conversationId);

  res.json({
    success: true,
    status: updatedConversation.status,
    reason: resolvedReason,
    closedAt: updatedConversation.closedAt?.toISOString() ?? null,
    closedReason: resolvedReason,
  });
}

export async function reopenConversationHandler(req: Request, res: Response) {
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

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { status: true },
  });

  if (!conversation) {
    return res.status(404).json({ message: 'Conversation not found.' });
  }
  if (conversation.status !== 'CLOSED') {
    return res.status(409).json({ message: 'Conversation is not closed.' });
  }

  const now = new Date();
  const reopenedConversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status: 'ACTIVE',
      botActive: true,
      lastActivity: now,
      closedAt: null,
      closedReason: null,
      closedById: null,
    },
    select: {
      id: true,
      status: true,
      botActive: true,
      lastActivity: true,
    },
  });

  await addConversationEvent(
    conversationId,
    'STATUS_CHANGE',
    {
      previousStatus: 'CLOSED',
      newStatus: reopenedConversation.status,
      reason: 'manual_reopen',
      reopenedAt: now.toISOString(),
    },
    req.user.id
  );

  const io = getSocketServer();
  await broadcastConversationUpdate(io, conversationId);

  res.json({
    success: true,
    status: reopenedConversation.status,
    botActive: reopenedConversation.botActive,
    lastActivity: reopenedConversation.lastActivity.toISOString(),
  });
}
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
      messages:
        c.messages?.map((m) => ({
          ...m,
          id: m.id.toString(),
          conversationId: m.conversationId.toString(),
        })) ?? null,
      lastMessage:
        c.messages && c.messages.length > 0
          ? {
              ...c.messages[0],
              id: c.messages[0].id.toString(),
              conversationId: c.messages[0].conversationId.toString(),
            }
          : null,
    }));
    res.json(mapped);
  } catch (error) {
    console.error('[listAllChatsHandler] Error:', error);
    res.status(500).json({
      message: 'Error al obtener todas las conversaciones',
      error: String(error),
    });
  }
}
// Endpoint para listar todos los chats de un nÃºmero, separados por estado

interface Contact {
  id: string | number;
  name?: string;
  phone?: string;
  dni?: string | null;
}

interface Conversation {
  id: bigint | string | number;
  contact?: Contact | null;
  userPhone?: string;
  contactName?: string | null;
  contactId?: number | null;
  areaId?: number | null;
  assignedToId?: number | null;
  status?: ConversationStatus;
  area?: { id: number; name: string } | null;
  assignedTo?: { id: number; name: string } | null;
  botActive?: boolean;
  lastActivity?: Date | string | null;
  updatedAt?: Date | string | null;
  messages?: MessagePreview[];
}

interface MessagePreview {
  id: bigint | string | number;
  conversationId: bigint | string | number;
  [key: string]: unknown;
}

function sanitizeBigInts<T>(value: T): T {
  return normalizeBigIntValue(value) as T;
}

function normalizeBigIntValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeBigIntValue(item));
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce(
      (acc, [key, entryValue]) => {
        acc[key] = normalizeBigIntValue(entryValue);
        return acc;
      },
      {} as Record<string, unknown>
    );
  }
  return value;
}

function mapConversationForResponse(conversation: Conversation) {
  const contact = conversation.contact
    ? sanitizeBigInts({
        ...conversation.contact,
        id:
          conversation.contact.id?.toString?.() ??
          String(conversation.contact.id),
      })
    : null;
  const messages = Array.isArray(conversation.messages)
    ? conversation.messages.map((message) =>
        sanitizeBigInts({
          ...message,
          id: message.id?.toString?.() ?? String(message.id),
          conversationId:
            message.conversationId?.toString?.() ??
            String(message.conversationId),
        })
      )
    : conversation.messages;
  return sanitizeBigInts({
    ...conversation,
    id: conversation.id?.toString?.() ?? String(conversation.id),
    contact,
    messages,
  });
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

  // Buscar todas las conversaciones de ese nÃºmero
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
// ...existing code...
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

  // Desabilitar cachÃ© del navegador para este endpoint
  res.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
  );
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  // Opcional: verificar permisos del usuario sobre ese telÃ©fono
  try {
    console.log(`[GET /api/conversations/history/${phone}] Starting...`);
    const history = await getCombinedChatHistoryByPhone(phone);
    console.log(
      `[GET /api/conversations/history/${phone}] âœ… History loaded: ${
        history?.length || 0
      } items`
    );
    res.json(history);
  } catch (error) {
    console.error(`[GET /api/conversations/history/${phone}] âŒ ERROR:`, error);
    res.status(500).json({
      message: 'Error al obtener historial combinado',
      error: String(error),
    });
  }
}

export async function getSingleConversationHistoryHandler(
  req: Request,
  res: Response
) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const conversationIdParam = req.params.conversationId;
  let conversationId: bigint;
  try {
    conversationId = BigInt(conversationIdParam);
  } catch {
    return res.status(400).json({ message: 'Invalid conversation id.' });
  }

  // Desabilitar cachÃ©
  res.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
  );
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    console.log(
      `[GET /api/conversations/${conversationId}/history] Starting...`
    );
    const { getSingleConversationHistory } = await import(
      '../services/conversation.service.js'
    );
    const history = await getSingleConversationHistory(conversationId);
    console.log(
      `[GET /api/conversations/${conversationId}/history] âœ… History loaded: ${
        history?.length || 0
      } items`
    );
    res.json(history);
  } catch (error) {
    console.error(
      `[GET /api/conversations/${conversationId}/history] âŒ ERROR:`,
      error
    );
    res.status(500).json({
      message: 'Error al obtener historial de conversaciÃ³n',
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
    noteContent = (note.payload as { content?: string }).content ?? '';
  }

  // Emitir evento socket para que el frontend se actualice en tiempo real
  const io = getSocketServer();
  await broadcastConversationUpdate(io, conversationId);

  res.status(201).json({
    id: note.id.toString(),
    content: noteContent,
    createdAt: note.createdAt,
    createdById: note.createdById,
  });
}

// Listar notas internas de una conversaciÃ³n
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
        noteContent = (note.payload as { content?: string }).content ?? '';
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

function parseStatuses(value: unknown): ConversationStatus[] | undefined {
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
            id: conversation.messages[0]?.id?.toString() ?? '',
            senderType: conversation.messages[0]?.senderType ?? '',
            senderId: conversation.messages[0]?.senderId ?? '',
            content: conversation.messages[0]?.content ?? '',
            externalId: conversation.messages[0]?.externalId ?? '',
            createdAt: conversation.messages[0]?.createdAt ?? '',
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
  const safeLimit = Number.isNaN(limit) ? 100 : Math.min(limit, 500);
  const messages = await listConversationMessages(conversationId, safeLimit);

  res.json(
    messages.map((message) => ({
      id: message.id.toString(),
      conversationId: message.conversationId.toString(),
      senderType: message.senderType,
      senderId: message.senderId,
      senderName: message.sender?.name ?? null,
      senderUsername: message.sender?.username ?? null,
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

  const hydratedContent = await resolveTemplateVariables(
    conversationId,
    bodyContent
  );

  const outbound = await sendTextFromSession(
    req.user.id,
    conversation.userPhone,
    hydratedContent
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
    content: hydratedContent,
    isDelivered: Boolean(outbound),
    externalId: outbound ? extractMessageExternalId(outbound) : null,
    createdAt: outbound ? resolveMessageDate(outbound) : new Date(),
  });

  // ðŸš€ RESPOND IMMEDIATELY to client (before background processing)
  res.status(201).json({
    id: messageRecord.id.toString(),
    createdAt: messageRecord.createdAt,
    isDelivered: messageRecord.isDelivered,
  });

  // ðŸ”„ BACKGROUND PROCESSING - Fire and forget (no await)
  // This prevents blocking the HTTP response while still updating state
  // Use setImmediate instead of process.nextTick to ensure request context is fully released
  setImmediate(async () => {
    try {
      // Skip flow processing for now - only handle socket broadcasts
      // This is safer and avoids Prisma connection issues
      const io = getSocketServer();
      if (io) {
        await broadcastMessageRecord(io, conversationId, messageRecord, [
          req.user!.id,
        ]);
        await broadcastConversationUpdate(io, conversationId);
        console.log(
          `[sendConversationMessageHandler] âœ… Background socket broadcast completed for message ${messageRecord.id}`
        );
      }

      // Try to update conversation context, but don't fail if it errors
      try {
        // LÃ³gica para determinar el siguiente nodo y contexto
        const { nextNodeId, newContext } = await getNextNodeAndContext({
          currentNodeId: conversation.currentFlowNodeId,
          message: bodyContent,
          context: conversation.context,
          botId: conversation.botId,
          conversationId,
        });

        // Si la funciÃ³n no retorna un nodo vÃ¡lido, se mantiene el actual y el contexto
        const finalNodeId = nextNodeId ?? conversation.currentFlowNodeId;
        const finalContext = newContext ?? conversation.context;

        // Asegurar que context sea un string JSON vÃ¡lido
        let contextValue: string | null = null;
        if (finalContext) {
          contextValue =
            typeof finalContext === 'string'
              ? finalContext
              : JSON.stringify(finalContext);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {
          lastActivity: messageRecord.createdAt,
          status: 'ACTIVE',
          botActive: false,
          currentFlowNodeId: finalNodeId,
          context: contextValue,
        };

        // Si no tiene asignado, asignarlo al usuario actual
        if (!conversation.assignedToId) {
          updateData.assignedTo = {
            connect: { id: req.user!.id },
          };
        }

        await touchConversation(conversationId, updateData);
        console.log(
          `[sendConversationMessageHandler] âœ… Background context update completed for message ${messageRecord.id}`
        );
      } catch (contextError) {
        console.warn(
          `[sendConversationMessageHandler] âš ï¸ Background context update failed (non-critical):`,
          contextError instanceof Error ? contextError.message : contextError
        );
        // Don't fail - context update is optional
      }
    } catch (error) {
      console.error(
        `[sendConversationMessageHandler] âŒ Background processing error for message ${messageRecord.id}:`,
        error instanceof Error ? error.message : error
      );
      // Client already has message confirmation, so we don't fail the request
      // Just log the error for debugging
    }
  });
}

export async function updateConversationProgressStatusHandler(
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

  const rawStatus = req.body?.status;
  if (!rawStatus || typeof rawStatus !== 'string') {
    return res.status(400).json({ message: 'Status is required.' });
  }

  const normalizedStatus =
    rawStatus.toUpperCase() as ConversationProgressStatus;
  const allowedStatuses = Object.values(ConversationProgressStatus);
  if (!allowedStatuses.includes(normalizedStatus)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  const conversation = await ensureConversationAccess(req.user, conversationId);
  if (!conversation) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const [updatedConversation] = await Promise.all([
    prisma.conversation.update({
      where: { id: conversationId },
      data: { progressStatus: normalizedStatus },
      select: conversationSelect,
    }),
    addConversationEvent(
      conversationId,
      'STATUS_CHANGE',
      {
        status: normalizedStatus,
        updatedBy: req.user.id,
        type: 'progress_status',
      },
      req.user.id
    ),
  ]);

  await syncOrderStatusWithProgress(conversationId, normalizedStatus);

  let messageRecord: ConversationMessage | null = null;
  const shouldSendMessage = req.body?.sendMessage !== false;
  const customMessage =
    typeof req.body?.message === 'string' && req.body.message.trim().length
      ? req.body.message.trim()
      : PROGRESS_STATUS_MESSAGES[normalizedStatus];

  if (shouldSendMessage && customMessage) {
    const hydratedContent = await resolveTemplateVariables(
      conversationId,
      customMessage
    );
    const outbound = await sendTextFromSession(
      req.user.id,
      conversation.userPhone,
      hydratedContent
    );

    if (!outbound) {
      await addConversationEvent(conversationId, 'NOTE', {
        type: 'send_fail',
        reason: 'whatsapp_session_unavailable',
        content: hydratedContent,
      });
    }

    messageRecord = await createConversationMessage({
      conversationId,
      senderType: 'OPERATOR',
      senderId: req.user.id,
      content: hydratedContent,
      isDelivered: Boolean(outbound),
      externalId: outbound ? extractMessageExternalId(outbound) : null,
      createdAt: outbound ? resolveMessageDate(outbound) : new Date(),
    });

    const io = getSocketServer();
    if (io) {
      await broadcastMessageRecord(io, conversationId, messageRecord, [
        req.user.id,
      ]);
    }
  }

  const io = getSocketServer();
  if (io) {
    await broadcastConversationUpdate(io, conversationId);
  }

  return res.json({
    conversation: mapConversationForResponse(updatedConversation),
    messageId: messageRecord ? messageRecord.id.toString() : null,
  });
}
/**
 * Inicia el flujo de una conversaciÃ³n ejecutando el nodo START
 * POST /conversations/:id/start-flow
 */
export async function startFlowHandler(req: Request, res: Response) {
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

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    return res.status(404).json({ message: 'Conversation not found.' });
  }

  if (!conversation.botId) {
    return res
      .status(400)
      .json({ message: 'Conversation has no bot assigned.' });
  }

  // Buscar el nodo START en el flujo del bot
  const startNode = await prisma.flow.findFirst({
    where: {
      type: 'START',
      botId: conversation.botId,
      isActive: true,
    },
  });

  if (!startNode) {
    return res
      .status(404)
      .json({ message: 'START node not found for this bot.' });
  }

  // Inicializar contexto si no existe
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsedContext: any = {
    lastMessage: '',
    previousNode: null,
    updatedAt: new Date().toISOString(),
    variables: {},
  };

  if (conversation.context) {
    if (typeof conversation.context === 'string') {
      try {
        const parsed = JSON.parse(conversation.context);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          parsedContext = {
            ...parsed,
            variables: parsed.variables ?? {},
          };
        }
      } catch {
        // Mantener contexto por defecto
      }
    } else if (
      typeof conversation.context === 'object' &&
      !Array.isArray(conversation.context)
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsedContext = {
        ...(conversation.context as any),
        variables: (conversation.context as any).variables ?? {},
      };
    }
  }

  // Ejecutar el nodo START
  const result = await executeNode({
    botId: conversation.botId,
    nodeId: startNode.id,
    context: parsedContext,
  });

  // Actualizar la conversaciÃ³n con el siguiente nodo
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      currentFlowNodeId: result.nextNodeId,
      context: JSON.stringify(result.updatedContext),
      botActive: true,
    },
  });

  // Enviar el mensaje de START al cliente si existe
  if (result.actions && result.actions.length > 0) {
    const sendMessageAction = result.actions.find(
      (a: any) => a.type === 'send_message'
    );
    if (sendMessageAction) {
      // AquÃ­ se podrÃ­a integrar con WhatsApp para enviar el mensaje
      // Por ahora, se retorna la acciÃ³n para que el cliente la maneje
    }
  }

  const io = getSocketServer();
  await broadcastConversationUpdate(io, conversationId);

  return res.json({
    success: true,
    nextNodeId: result.nextNodeId,
    actions: result.actions,
    updatedContext: result.updatedContext,
  });
}

export async function closeConversationHandler(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
