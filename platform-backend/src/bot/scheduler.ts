import type { Server as SocketIOServer } from 'socket.io';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { addConversationEvent } from '../services/conversation.service.js';
import { createConversationMessage } from '../services/message.service.js';
import { getSystemSettingsCached } from '../services/settings.service.js';
import { listDueReminders } from '../services/contactReminder.service.js';
import {
  broadcastConversationEvent,
  broadcastConversationUpdate,
  broadcastMessageRecord,
  getActiveSessionOwnerIds,
  sendTextFromSession,
  extractMessageExternalId,
  resolveMessageDate,
  resolveTemplateVariables,
} from '../services/wpp.service.js';

const AUTO_CLOSE_REASON = 'auto_inactivity';

let schedulerStarted = false;
let lastDailyReminderRun: Date | null = null;

async function processDailyReminders(io: SocketIOServer) {
  const now = new Date();
  
  // Only run once per day
  if (lastDailyReminderRun) {
    const daysSinceLastRun = (now.getTime() - lastDailyReminderRun.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastRun < 1) {
      return;
    }
  }

  try {
    const todayReminders = await listDueReminders(now);
    if (!todayReminders.length) {
      console.log('[Scheduler] No hay recordatorios para hoy');
      lastDailyReminderRun = now;
      return;
    }

    console.log(`[Scheduler] Procesando ${todayReminders.length} recordatorios para hoy`);
    
    // Broadcast to all connected clients
    io.emit('daily-reminders', {
      date: now.toISOString(),
      reminders: todayReminders.map((r) => ({
        id: r.id,
        title: r.title,
        contactId: r.contactId,
        contactName: r.contact?.name,
        remindAt: r.remindAt,
      })),
    });

    lastDailyReminderRun = now;
  } catch (error) {
    console.error('[Scheduler] Error processing daily reminders:', error);
  }
}

async function closeInactiveConversations(io: SocketIOServer) {
  const settings = await getSystemSettingsCached();
  const minutes = settings.autoCloseMinutes ?? env.autoCloseMinutes;
  const autoCloseMinutes = minutes > 0 ? minutes : env.autoCloseMinutes;
  const threshold = new Date(Date.now() - autoCloseMinutes * 60 * 1000);

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

      const renderedMessage = await resolveTemplateVariables(
        conversationId,
        env.autoCloseMessage
      );

      let messageRecorded = false;
      for (const ownerId of sessionOwners) {
        const outbound = await sendTextFromSession(
          ownerId,
          conversation.userPhone,
          renderedMessage
        );
        if (outbound) {
          const messageRecord = await createConversationMessage({
            conversationId,
            senderType: 'BOT',
            senderId: null,
            content: renderedMessage,
            isDelivered: true,
            externalId: extractMessageExternalId(outbound),
            createdAt: resolveMessageDate(outbound),
          });
          await broadcastMessageRecord(io, conversationId, messageRecord, [
            ownerId,
          ]);
          messageRecorded = true;
          break;
        }
      }

      if (!messageRecorded) {
        const messageRecord = await createConversationMessage({
          conversationId,
          senderType: 'BOT',
          senderId: null,
          content: renderedMessage,
          isDelivered: false,
        });
        await broadcastMessageRecord(io, conversationId, messageRecord);
      }

      await broadcastConversationUpdate(io, conversationId);
      await broadcastConversationEvent(
        io,
        conversationId,
        'conversation:closed'
      );
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
      console.error('[Scheduler] Unexpected error closing conversations', error)
    );
    processDailyReminders(io).catch((error) =>
      console.error('[Scheduler] Unexpected error processing reminders', error)
    );
  };

  setInterval(run, env.schedulerIntervalMs).unref();
}
