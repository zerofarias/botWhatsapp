/**
 * Socket.IO Event Schemas - Zod Validators
 * Ensures type-safety and prevents runtime errors from invalid payloads
 */

import { z } from 'zod';

// Message schema
export const MessageSchema = z.object({
  id: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val)),
  conversationId: z.number(),
  content: z.string().min(1),
  sender: z.enum(['user', 'bot', 'contact']),
  timestamp: z.number(),
  status: z.enum(['sent', 'delivered', 'read', 'error']).optional(),
  mediaUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// Conversation schema
export const ConversationSchema = z.object({
  id: z.number(),
  contactId: z.number(),
  botId: z.number(),
  context: z.record(z.string(), z.unknown()).default({}),
  lastMessage: z.string().optional(),
  lastMessageTime: z.number().optional(),
  unreadCount: z.number().default(0),
  contact: z
    .object({
      id: z.number(),
      name: z.string(),
      phone: z.string(),
      avatar: z.string().optional(),
    })
    .optional(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

// Socket events payloads
export const SocketEventPayloads = {
  // Server → Client events
  'message:new': MessageSchema,
  'message:updated': MessageSchema,
  'message:deleted': z.object({
    messageId: z.union([z.number(), z.string()]),
    conversationId: z.number(),
  }),

  'conversation:updated': ConversationSchema,
  'conversation:created': ConversationSchema,
  'conversation:deleted': z.object({
    conversationId: z.number(),
  }),

  'flow:started': z.object({
    conversationId: z.number(),
    flowId: z.number(),
    flowName: z.string(),
    timestamp: z.number(),
  }),

  'flow:ended': z.object({
    conversationId: z.number(),
    flowId: z.number(),
    reason: z.string().optional(),
    timestamp: z.number(),
  }),

  'typing:started': z.object({
    conversationId: z.number(),
    sender: z.enum(['user', 'bot', 'contact']),
  }),

  'typing:ended': z.object({
    conversationId: z.number(),
    sender: z.enum(['user', 'bot', 'contact']),
  }),

  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),

  'connection:status': z.object({
    connected: z.boolean(),
    timestamp: z.number(),
  }),
};

// Type-safe payload validator
export function validateSocketPayload(
  event: keyof typeof SocketEventPayloads,
  payload: unknown
): { valid: true; data: any } | { valid: false; error: string } {
  try {
    const schema = SocketEventPayloads[event];
    const data = schema.parse(payload);
    return { valid: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      return {
        valid: false,
        error: errorMessages,
      };
    }
    return { valid: false, error: String(error) };
  }
}

// Helper to safely extract and validate message data
export function parseMessagePayload(payload: unknown): Message | null {
  const result = validateSocketPayload('message:new', payload);
  if (result.valid) {
    return result.data;
  }
  console.warn('Invalid message payload:', result.error);
  return null;
}

// Helper to safely extract and validate conversation data
export function parseConversationPayload(
  payload: unknown
): Conversation | null {
  const result = validateSocketPayload('conversation:updated', payload);
  if (result.valid) {
    return result.data;
  }
  console.warn('Invalid conversation payload:', result.error);
  return null;
}
