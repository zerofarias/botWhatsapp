/**
 * SocketBroadcaster Service v2
 * Single Responsibility: Emit socket events to clients
 * Extracted from: wpp.service.ts (lines 102-900)
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Conversation, Message } from '@prisma/client';
import { z } from 'zod';

// Types
export interface ConversationSnapshot {
  id: string;
  userPhone: string;
  contactName: string;
  contactId: number | null;
  contact: {
    id: number;
    name: string;
    phone: string;
    dni?: string;
    address1?: string | null;
    address2?: string | null;
  } | null;
  areaId: number | null;
  assignedToId: number | null;
  status: string;
  botActive: boolean;
  lastActivity: string;
  updatedAt: string;
}

// Validator schemas
export const ConversationSnapshotSchema = z.object({
  id: z.string(),
  userPhone: z.string(),
  contactName: z.string(),
  contactId: z.number().nullable(),
  contact: z
    .object({
      id: z.number(),
      name: z.string(),
      phone: z.string(),
      dni: z.string().optional(),
      address1: z.string().nullable().optional(),
      address2: z.string().nullable().optional(),
    })
    .nullable(),
  areaId: z.number().nullable(),
  assignedToId: z.number().nullable(),
  status: z.string(),
  botActive: z.boolean(),
  lastActivity: z.string(),
  updatedAt: z.string(),
});

export const MessageEventSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  content: z.string(),
  sender: z.enum(['user', 'bot', 'contact']),
  timestamp: z.number(),
  status: z.enum(['sent', 'delivered', 'read', 'error']).optional(),
});

/**
 * Socket Broadcaster - Handles all socket emissions
 */
export class SocketBroadcaster {
  constructor(private io: SocketIOServer) {}

  /**
   * Get rooms for a conversation
   */
  getConversationRooms(snapshot: ConversationSnapshot): Set<string> {
    const rooms = new Set<string>();
    if (snapshot.assignedToId) {
      rooms.add(`user:${snapshot.assignedToId}`);
    }
    if (snapshot.areaId) {
      rooms.add(`area:${snapshot.areaId}`);
    }
    rooms.add('role:ADMIN');
    rooms.add('role:SUPERVISOR');
    return rooms;
  }

  /**
   * Emit conversation update to relevant rooms
   */
  async emitConversationUpdate(snapshot: ConversationSnapshot): Promise<void> {
    try {
      // Validate payload
      const validSnapshot = ConversationSnapshotSchema.parse(snapshot);

      const rooms = this.getConversationRooms(validSnapshot);

      for (const room of rooms) {
        this.io.to(room).emit('conversation:updated', {
          id: validSnapshot.id,
          contactName: validSnapshot.contactName,
          contactId: validSnapshot.contactId,
          status: validSnapshot.status,
          lastActivity: validSnapshot.lastActivity,
          updatedAt: validSnapshot.updatedAt,
          botActive: validSnapshot.botActive,
        });
      }

      console.log(`✉️ Emitted conversation update to ${rooms.size} rooms`);
    } catch (error) {
      console.error('Error emitting conversation update:', error);
    }
  }

  /**
   * Emit new message to relevant rooms
   */
  async emitNewMessage(
    conversationSnapshot: ConversationSnapshot,
    message: Message
  ): Promise<void> {
    try {
      // Validate payload
      const messagePayload = {
        id: message.id.toString(),
        conversationId: message.conversationId.toString(),
        content: message.content,
        sender: this.determineSender(message),
        timestamp: message.createdAt.getTime(),
        status: 'sent' as const,
      };

      MessageEventSchema.parse(messagePayload);

      const rooms = this.getConversationRooms(conversationSnapshot);

      for (const room of rooms) {
        this.io.to(room).emit('message:new', messagePayload);
      }

      console.log(
        `✉️ Emitted new message ${message.id} to ${rooms.size} rooms`
      );
    } catch (error) {
      console.error('Error emitting new message:', error);
    }
  }

  /**
   * Emit message update
   */
  async emitMessageUpdate(
    conversationSnapshot: ConversationSnapshot,
    message: Message
  ): Promise<void> {
    try {
      const rooms = this.getConversationRooms(conversationSnapshot);

      const messagePayload = {
        id: message.id.toString(),
        conversationId: message.conversationId.toString(),
        content: message.content,
        sender: this.determineSender(message),
        timestamp: message.createdAt.getTime(),
        status: 'delivered' as const,
      };

      MessageEventSchema.parse(messagePayload);

      for (const room of rooms) {
        this.io.to(room).emit('message:updated', messagePayload);
      }

      console.log(
        `✉️ Emitted message update ${message.id} to ${rooms.size} rooms`
      );
    } catch (error) {
      console.error('Error emitting message update:', error);
    }
  }

  /**
   * Emit flow started event
   */
  async emitFlowStarted(
    conversationSnapshot: ConversationSnapshot,
    flowId: number,
    flowName: string
  ): Promise<void> {
    try {
      const rooms = this.getConversationRooms(conversationSnapshot);

      const payload = {
        conversationId: conversationSnapshot.id,
        flowId,
        flowName,
        timestamp: Date.now(),
      };

      for (const room of rooms) {
        this.io.to(room).emit('flow:started', payload);
      }

      console.log(`🚀 Emitted flow started to ${rooms.size} rooms`);
    } catch (error) {
      console.error('Error emitting flow started:', error);
    }
  }

  /**
   * Emit flow ended event
   */
  async emitFlowEnded(
    conversationSnapshot: ConversationSnapshot,
    flowId: number,
    reason?: string
  ): Promise<void> {
    try {
      const rooms = this.getConversationRooms(conversationSnapshot);

      const payload = {
        conversationId: conversationSnapshot.id,
        flowId,
        reason,
        timestamp: Date.now(),
      };

      for (const room of rooms) {
        this.io.to(room).emit('flow:ended', payload);
      }

      console.log(`🛑 Emitted flow ended to ${rooms.size} rooms`);
    } catch (error) {
      console.error('Error emitting flow ended:', error);
    }
  }

  /**
   * Emit typing started
   */
  emitTypingStarted(
    conversationSnapshot: ConversationSnapshot,
    sender: 'user' | 'bot' | 'contact'
  ): void {
    const rooms = this.getConversationRooms(conversationSnapshot);

    const payload = {
      conversationId: conversationSnapshot.id,
      sender,
    };

    for (const room of rooms) {
      this.io.to(room).emit('typing:started', payload);
    }
  }

  /**
   * Emit typing ended
   */
  emitTypingEnded(
    conversationSnapshot: ConversationSnapshot,
    sender: 'user' | 'bot' | 'contact'
  ): void {
    const rooms = this.getConversationRooms(conversationSnapshot);

    const payload = {
      conversationId: conversationSnapshot.id,
      sender,
    };

    for (const room of rooms) {
      this.io.to(room).emit('typing:ended', payload);
    }
  }

  /**
   * Determine message sender type
   */
  private determineSender(message: Message): 'user' | 'bot' | 'contact' {
    if (message.externalId) return 'contact';
    if (message.senderType === 'OPERATOR') return 'user';
    return 'bot';
  }

  /**
   * Emit error event
   */
  emitError(
    socket: Socket,
    code: string,
    message: string,
    details?: any
  ): void {
    socket.emit('error', {
      code,
      message,
      details,
      timestamp: Date.now(),
    });
  }
}
