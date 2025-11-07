/**
 * ConversationBroadcaster Service v2
 * Single Responsibility: Broadcast conversation-related events
 * Extracted and refactored from: wpp.service.ts
 */

import { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../../config/prisma';
import {
  SocketBroadcaster,
  ConversationSnapshot,
  ConversationSnapshotSchema,
} from './SocketBroadcaster';

/**
 * Service for broadcasting conversation updates
 */
export class ConversationBroadcaster {
  private socketBroadcaster: SocketBroadcaster;

  constructor(io: SocketIOServer) {
    this.socketBroadcaster = new SocketBroadcaster(io);
  }

  /**
   * Fetch conversation snapshot for broadcasting
   */
  async fetchSnapshot(
    conversationId: bigint | number
  ): Promise<ConversationSnapshot | null> {
    try {
      const record = await prisma.conversation.findUnique({
        where: { id: BigInt(conversationId) },
        select: {
          id: true,
          userPhone: true,
          contactName: true,
          contactId: true,
          areaId: true,
          assignedToId: true,
          status: true,
          botActive: true,
          lastActivity: true,
          updatedAt: true,
          contact: {
            select: {
              id: true,
              name: true,
              phone: true,
              dni: true,
            },
          },
        },
      });

      if (!record) return null;

      const snapshot: ConversationSnapshot = {
        id: record.id.toString(),
        userPhone: record.userPhone,
        contactName: record.contactName || '',
        contactId: record.contactId ?? null,
        contact: record.contact
          ? {
              id: record.contact.id,
              name: record.contact.name,
              phone: record.contact.phone,
              dni: record.contact.dni || undefined,
            }
          : null,
        areaId: record.areaId,
        assignedToId: record.assignedToId,
        status: record.status,
        botActive: record.botActive,
        lastActivity: record.lastActivity.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      };

      // Validate with Zod
      ConversationSnapshotSchema.parse(snapshot);

      return snapshot;
    } catch (error) {
      console.error('Error fetching conversation snapshot:', error);
      return null;
    }
  }

  /**
   * Broadcast conversation status update
   */
  async broadcastConversationUpdate(
    conversationId: bigint | number,
    updates: Partial<ConversationSnapshot>
  ): Promise<void> {
    try {
      const snapshot = await this.fetchSnapshot(conversationId);
      if (!snapshot) {
        console.warn('Conversation not found:', conversationId);
        return;
      }

      // Merge updates
      const updated = { ...snapshot, ...updates };

      // Broadcast
      await this.socketBroadcaster.emitConversationUpdate(updated);
    } catch (error) {
      console.error('Error broadcasting conversation update:', error);
    }
  }

  /**
   * Broadcast flow started in conversation
   */
  async broadcastFlowStarted(
    conversationId: bigint | number,
    flowId: number,
    flowName: string
  ): Promise<void> {
    try {
      const snapshot = await this.fetchSnapshot(conversationId);
      if (!snapshot) {
        console.warn('Conversation not found:', conversationId);
        return;
      }

      await this.socketBroadcaster.emitFlowStarted(snapshot, flowId, flowName);
    } catch (error) {
      console.error('Error broadcasting flow started:', error);
    }
  }

  /**
   * Broadcast flow ended in conversation
   */
  async broadcastFlowEnded(
    conversationId: bigint | number,
    flowId: number,
    reason?: string
  ): Promise<void> {
    try {
      const snapshot = await this.fetchSnapshot(conversationId);
      if (!snapshot) {
        console.warn('Conversation not found:', conversationId);
        return;
      }

      await this.socketBroadcaster.emitFlowEnded(snapshot, flowId, reason);
    } catch (error) {
      console.error('Error broadcasting flow ended:', error);
    }
  }

  /**
   * Broadcast bot status changed
   */
  async broadcastBotStatusChanged(
    conversationId: bigint | number,
    botActive: boolean
  ): Promise<void> {
    try {
      const snapshot = await this.fetchSnapshot(conversationId);
      if (!snapshot) {
        console.warn('Conversation not found:', conversationId);
        return;
      }

      const updated = { ...snapshot, botActive };
      await this.socketBroadcaster.emitConversationUpdate(updated);
    } catch (error) {
      console.error('Error broadcasting bot status:', error);
    }
  }

  /**
   * Broadcast conversation assigned to user
   */
  async broadcastAssignedToUser(
    conversationId: bigint | number,
    userId: number | null
  ): Promise<void> {
    try {
      const snapshot = await this.fetchSnapshot(conversationId);
      if (!snapshot) {
        console.warn('Conversation not found:', conversationId);
        return;
      }

      const updated = { ...snapshot, assignedToId: userId };
      await this.socketBroadcaster.emitConversationUpdate(updated);
    } catch (error) {
      console.error('Error broadcasting conversation assignment:', error);
    }
  }

  /**
   * Broadcast conversation status changed
   */
  async broadcastStatusChanged(
    conversationId: bigint | number,
    status: string
  ): Promise<void> {
    try {
      const snapshot = await this.fetchSnapshot(conversationId);
      if (!snapshot) {
        console.warn('Conversation not found:', conversationId);
        return;
      }

      const updated = { ...snapshot, status };
      await this.socketBroadcaster.emitConversationUpdate(updated);
    } catch (error) {
      console.error('Error broadcasting status change:', error);
    }
  }
}

// Singleton instance
let conversationBroadcaster: ConversationBroadcaster | null = null;

/**
 * Get or create conversation broadcaster instance
 */
export function getConversationBroadcaster(
  io?: SocketIOServer
): ConversationBroadcaster {
  if (!conversationBroadcaster && io) {
    conversationBroadcaster = new ConversationBroadcaster(io);
  }
  if (!conversationBroadcaster) {
    throw new Error('ConversationBroadcaster not initialized');
  }
  return conversationBroadcaster;
}
