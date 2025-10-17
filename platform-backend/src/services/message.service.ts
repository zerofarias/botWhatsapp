import type { MessageSender, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

const messageSelect = {
  id: true,
  conversationId: true,
  senderType: true,
  senderId: true,
  content: true,
  mediaType: true,
  mediaUrl: true,
  isDelivered: true,
  createdAt: true,
} satisfies Prisma.MessageSelect;

export type ConversationMessage = Prisma.MessageGetPayload<{
  select: typeof messageSelect;
}>;

export async function listConversationMessages(
  conversationId: bigint | number,
  limit = 100
): Promise<ConversationMessage[]> {
  const id =
    typeof conversationId === 'bigint'
      ? conversationId
      : BigInt(conversationId);

  return prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: messageSelect,
  });
}

type CreateMessageInput = {
  conversationId: bigint | number;
  senderType: MessageSender;
  senderId?: number | null;
  content: string;
  mediaType?: string | null;
  mediaUrl?: string | null;
  isDelivered?: boolean;
};

export async function createConversationMessage(
  input: CreateMessageInput
): Promise<ConversationMessage> {
  const conversationId =
    typeof input.conversationId === 'bigint'
      ? input.conversationId
      : BigInt(input.conversationId);

  const data: Prisma.MessageUncheckedCreateInput = {
    conversationId,
    senderType: input.senderType,
    senderId: input.senderId ?? null,
    content: input.content,
    mediaType: input.mediaType ?? null,
    mediaUrl: input.mediaUrl ?? null,
    isDelivered: input.isDelivered ?? true,
  };

  const message = await prisma.message.create({
    data,
    select: messageSelect,
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastActivity: new Date(),
    },
  });

  return message;
}
