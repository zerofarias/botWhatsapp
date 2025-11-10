import type { Response } from 'express';
import { prisma } from '../config/prisma';
import { executeNodeChain } from '../services/node-execution.service';
import {
  listConversationMessages,
  markAllMessagesAsReadByPhone,
} from '../services/message.service';
import type {
  AuthenticatedRequest,
  ProcessMessageBody,
  MarkReadBody,
} from '../types/controller.types';

// Extiende el tipo Request para incluir user y body tipado

export async function processMessageAndAdvanceFlow(
  req: AuthenticatedRequest<ProcessMessageBody>,
  res: Response
) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const { conversationId, content } = req.body;
  if (!conversationId || !content) {
    return res
      .status(400)
      .json({ message: 'conversationId and content are required.' });
  }
  const conversation = await prisma.conversation.findUnique({
    where: { id: BigInt(conversationId) },
  });
  if (!conversation) {
    return res.status(404).json({ message: 'Conversation not found.' });
  }
  if (conversation.botId == null || conversation.currentFlowNodeId == null) {
    return res
      .status(400)
      .json({ message: 'Conversation is missing botId or currentFlowNodeId.' });
  }
  let context: import('../services/flow.service').ConversationContext;
  if (
    typeof conversation.context === 'object' &&
    conversation.context !== null &&
    'lastMessage' in conversation.context &&
    'previousNode' in conversation.context &&
    'updatedAt' in conversation.context
  ) {
    context =
      conversation.context as unknown as import('../services/flow.service').ConversationContext;
  } else {
    context = {
      lastMessage: '',
      previousNode: null,
      updatedAt: new Date().toISOString(),
    };
  }
  const normalizedContent =
    typeof content === 'string' ? content.trim() : String(content);
  const now = new Date().toISOString();
  const contextWithMessage: import('../services/flow.service').ConversationContext =
    {
      ...context,
      lastMessage: normalizedContent,
      updatedAt: now,
      variables: {
        ...(context.variables ?? {}),
      },
    };
  const variableBag = contextWithMessage.variables ?? {};
  contextWithMessage.variables = variableBag;
  let capturedVariableName: string | null = null;
  if (context.waitingForInput && context.waitingVariable) {
    const key = context.waitingVariable;
    // Detectar y procesar imágenes en base64
    let processedContent = normalizedContent;
    const hasImageBase64 =
      normalizedContent.includes('/9j/4AAQSkZJRg') ||
      normalizedContent.includes('data:image');

    if (hasImageBase64) {
      const base64Match = normalizedContent.match(
        /(\n)?\/9j\/4AAQSkZJRg[\w+/]*={0,2}|data:image[^;]*;base64,[A-Za-z0-9+/]*={0,2}/
      );
      if (base64Match) {
        if (base64Match.index) {
          // Si hay texto antes de la imagen, mantenerlo + agregar marca de imagen
          const textBeforeImage = normalizedContent
            .substring(0, base64Match.index)
            .trim();
          processedContent = textBeforeImage
            ? `${textBeforeImage}\n📸 ENVÍO UNA IMAGEN`
            : '📸 ENVÍO UNA IMAGEN';
        } else {
          // Solo hay imagen, sin texto previo
          processedContent = '📸 ENVÍO UNA IMAGEN';
        }
        console.log(
          `[processMessage] Imagen detectada en variable "${key}". Procesado como: "${processedContent}"`
        );
      }
    }
    variableBag[key] = processedContent;
    contextWithMessage.waitingForInput = false;
    contextWithMessage.waitingVariable = null;
    capturedVariableName = key;
  }

  const result = await executeNodeChain({
    botId: Number(conversation.botId),
    nodeId: Number(conversation.currentFlowNodeId),
    context: contextWithMessage,
    capturedVariableName,
  });
  await prisma.conversation.update({
    where: { id: BigInt(conversationId) },
    data: {
      currentFlowNodeId: result.nextNodeId,
      context: JSON.stringify(result.updatedContext),
    },
  });
  return res.json({
    actions: result.actions,
    nextNodeId: result.nextNodeId,
    updatedContext: result.updatedContext,
    capturedVariable: capturedVariableName,
  });
}

// Endpoint para marcar todos los mensajes de todas las conversaciones de un número como leídos
export async function markAllMessagesAsReadByPhoneHandler(
  req: AuthenticatedRequest<MarkReadBody>,
  res: Response
) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const userPhone = req.body?.userPhone;
  if (!userPhone || typeof userPhone !== 'string') {
    return res.status(400).json({ message: 'userPhone is required.' });
  }
  const updatedCount = await markAllMessagesAsReadByPhone(userPhone);
  return res.json({ updated: updatedCount });
}

export async function getMessages(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const conversationIdRaw = req.query?.conversationId;
  if (!conversationIdRaw) {
    return res
      .status(400)
      .json({ message: 'conversationId query parameter is required.' });
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
  const messages = await listConversationMessages(conversationId);
  return res.json(messages.reverse());
}
