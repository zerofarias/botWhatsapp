import { Prisma, type MessageSender } from '@prisma/client';
import { prisma } from '../config/prisma.js';

const messageSelect = Prisma.validator<Prisma.MessageSelect>()({
  id: true,
  conversationId: true,
  senderType: true,
  senderId: true,
  content: true,
  mediaType: true,
  mediaUrl: true,
  isDelivered: true,
  externalId: true,
  createdAt: true,
});

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
    orderBy: { createdAt: 'asc' },
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
  externalId?: string | null;
  createdAt?: Date;
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
    externalId: input.externalId ?? null,
  };

  if (
    input.createdAt instanceof Date &&
    !Number.isNaN(input.createdAt.valueOf())
  ) {
    data.createdAt = input.createdAt;
  }

  try {
    const message = await prisma.message.create({
      data,
      select: messageSelect,
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastActivity: message.createdAt,
        ...(message.senderType === 'BOT'
          ? { lastBotMessageAt: message.createdAt }
          : undefined),
      },
    });

    return message;
  } catch (error) {
    if (
      input.externalId &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existing = await prisma.message.findUnique({
        where: { externalId: input.externalId },
        select: messageSelect,
      });
      if (existing) {
        return existing;
      }
    }
    throw error;
  }
}

export async function findMessageByExternalId(externalId: string) {
  return prisma.message.findUnique({
    where: { externalId },
    select: messageSelect,
  });
}
