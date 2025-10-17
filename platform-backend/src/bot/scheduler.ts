import type { Server as SocketIOServer } from 'socket.io';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { addConversationEvent } from '../services/conversation.service.js';
import { createConversationMessage } from '../services/message.service.js';
import {
  broadcastConversationUpdate,
  broadcastMessageRecord,
  getActiveSessionOwnerIds,
  sendTextFromSession,
} from '../services/wpp.service.js';

const AUTO_CLOSE_REASON = 'auto_inactivity';

let schedulerStarted = false;

async function closeInactiveConversations(io: SocketIOServer) {
  const threshold = new Date(Date.now() - env.autoCloseMinutes * 60 * 1000);

  const staleConversations = await prisma.conversation.findMany({
    where: {
      status: {
        in: ['PENDING', 'ACTIVE', 'PAUSED'],
      },
      lastActivity: {
        lt: threshold,
      },
    },
    select: {
      id: true,
      userPhone: true,
      assignedToId: true,
      areaId: true,
      status: true,
    },
  });

  if (!staleConversations.length) return;

  for (const conversation of staleConversations) {
    const conversationId = conversation.id;
    const now = new Date();

    try {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: 'CLOSED',
          botActive: true,
          closedAt: now,
          closedReason: AUTO_CLOSE_REASON,
          lastActivity: now,
        },
      });

      await addConversationEvent(
        conversationId,
        'STATUS_CHANGE',
        {
          previousStatus: conversation.status,
          newStatus: 'CLOSED',
          reason: AUTO_CLOSE_REASON,
        },
        null
      );

      const sessionOwners = new Set<number>();
      if (conversation.assignedToId) {
        sessionOwners.add(conversation.assignedToId);
      }
      getActiveSessionOwnerIds().forEach((ownerId) =>
        sessionOwners.add(ownerId)
      );

      let messageRecorded = false;
      for (const ownerId of sessionOwners) {
        const sent = await sendTextFromSession(
          ownerId,
          conversation.userPhone,
          env.autoCloseMessage
        );
        if (sent) {
          const messageRecord = await createConversationMessage({
            conversationId,
            senderType: 'BOT',
            senderId: ownerId,
            content: env.autoCloseMessage,
          });
          await broadcastMessageRecord(io, conversationId, messageRecord, [
            ownerId,
          ]);
          messageRecorded = true;
          break;
        }
      }

      if (!messageRecorded) {
        // Record the message locally even if we could not send it through WPP
        const messageRecord = await createConversationMessage({
          conversationId,
          senderType: 'BOT',
          senderId: null,
          content: env.autoCloseMessage,
        });
        await broadcastMessageRecord(io, conversationId, messageRecord);
      }

      await broadcastConversationUpdate(io, conversationId);
    } catch (error) {
      console.error(
        '[Scheduler] Failed to close conversation',
        conversationId,
        error
      );
    }
  }
}

export function startConversationScheduler(io: SocketIOServer) {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const run = () => {
    closeInactiveConversations(io).catch((error) =>
      console.error('[Scheduler] Unexpected error', error)
    );
  };

  setInterval(run, env.schedulerIntervalMs).unref();
}
