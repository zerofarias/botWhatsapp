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
 *     summary: Crear una conversación
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
 *         description: Conversación creada
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
 *         description: Error al crear conversación
 */

import { ConversationStatus } from '@prisma/client';
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
} from '../services/message.service.js';
import {
  broadcastMessageRecord,
  sendTextFromSession,
  extractMessageExternalId,
  resolveMessageDate,
  broadcastConversationEvent,
  broadcastConversationUpdate,
} from '../services/wpp.service.js';
import { executeNode } from '../services/node-execution.service.js';

// Controladores de conversación
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
  // Notificación en tiempo real
  const io = getSocketServer();
  io?.emit('conversation:take', {
    conversationId: conversationId.toString(),
    assignedTo: req.user.id,
    botActive: false,
  });
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
  const { reason } = req.body ?? {};
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status: 'CLOSED',
      botActive: false,
      assignedTo: { disconnect: true },
    },
  });
  // Notificación en tiempo real
  const io = getSocketServer();
  io?.emit('conversation:finish', {
    conversationId: conversationId.toString(),
    status: 'CLOSED',
    reason: reason ?? 'manual_close',
  });
  res.json({
    success: true,
    status: 'CLOSED',
    reason: reason ?? 'manual_close',
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
    }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener todas las conversaciones',
      error: String(error),
    });
  }
}
// Endpoint para listar todos los chats de un número, separados por estado

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
  messages?: Array<unknown>;
}

function mapConversationForResponse(conversation: Conversation) {
  const contact = conversation.contact
    ? {
        ...conversation.contact,
        id:
          conversation.contact.id?.toString?.() ??
          String(conversation.contact.id),
      }
    : null;
  return {
    ...conversation,
    id: conversation.id?.toString?.() ?? String(conversation.id),
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
  if (note.payload && typeof note.payload === 'string') {
    try {
      const parsed = JSON.parse(note.payload);
      noteContent = (parsed as { content?: string }).content ?? '';
    } catch {
      // ignore parse error
    }
  } else if (
    note.payload &&
    typeof note.payload === 'object' &&
    'content' in note.payload
  ) {
    noteContent = (note.payload as { content?: string }).content ?? '';
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
      if (note.payload && typeof note.payload === 'string') {
        try {
          const parsed = JSON.parse(note.payload);
          noteContent = (parsed as { content?: string }).content ?? '';
        } catch {
          // ignore parse error
        }
      } else if (
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

  // Lógica para determinar el siguiente nodo y contexto

  // Implementación real: Determinar el siguiente nodo y contexto según el trigger/mensaje recibido
  // Supongamos que existe una función getNextNodeAndContext que recibe el nodo actual, el mensaje y el contexto actual
  // y retorna el siguiente nodo y el nuevo contexto
  const { nextNodeId, newContext } = await getNextNodeAndContext({
    currentNodeId: conversation.currentFlowNodeId,
    message: bodyContent,
    context: conversation.context,
    botId: conversation.botId,
    conversationId,
  });

  // Si la función no retorna un nodo válido, se mantiene el actual y el contexto
  const finalNodeId = nextNodeId ?? conversation.currentFlowNodeId;
  const finalContext = newContext ?? conversation.context;

  await touchConversation(conversationId, {
    lastActivity: messageRecord.createdAt,
    status: 'ACTIVE',
    botActive: false,
    currentFlowNodeId: finalNodeId,
    context: finalContext,
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

/**
 * Inicia el flujo de una conversación ejecutando el nodo START
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

  // Actualizar la conversación con el siguiente nodo
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
      // Aquí se podría integrar con WhatsApp para enviar el mensaje
      // Por ahora, se retorna la acción para que el cliente la maneje
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
