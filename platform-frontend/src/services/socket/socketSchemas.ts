/**
 * Socket.IO Event Schemas - Zod Validators
 * Ensures type-safety and prevents runtime errors from invalid payloads
 */

import { z } from 'zod';

export const normalizeSender = (value: unknown): 'user' | 'bot' | 'contact' => {
  if (!value || typeof value !== 'string') {
    return 'contact';
  }

  const normalized = value.trim().toLowerCase();

  if (['user', 'operator', 'agent', 'admin'].includes(normalized)) {
    return 'user';
  }

  if (['bot', 'system', 'assistant'].includes(normalized)) {
    return 'bot';
  }

  return 'contact';
};

const parseTimestamp = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Numeric string: "1707423773000"
    if (/^-?\d+$/.test(trimmed)) {
      return Number(trimmed);
    }

    // Try ISO first, fallback to replacing space with T
    const parsed =
      Date.parse(trimmed) ||
      Date.parse(trimmed.replace(' ', 'T').replace(' ', 'T'));

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return Date.now();
};

const parseMediaUrl = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
};

const parseContent = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
};

// Message schema - Flexible to handle backend format variations
export const MessageSchema = z.object({
  id: z
    .union([z.number(), z.string(), z.bigint()])
    .transform((val) => {
      if (typeof val === 'string') return parseInt(val, 10);
      if (typeof val === 'bigint') return Number(val);
      return val;
    })
    .pipe(z.number()),
  conversationId: z
    .union([z.number(), z.string(), z.bigint()])
    .transform((val) => {
      if (typeof val === 'string') return parseInt(val, 10);
      if (typeof val === 'bigint') return Number(val);
      return val;
    })
    .pipe(z.number()),
  content: z
    .union([z.string(), z.null(), z.undefined()])
    .transform(parseContent),
  // Accept both v1 format (senderType) and v2 format (sender)
  sender: z
    .union([z.string(), z.null(), z.undefined()])
    .transform(normalizeSender),
  timestamp: z
    .union([z.number(), z.string(), z.date(), z.null(), z.undefined()])
    .transform(parseTimestamp),
  // Optional fields from both formats
  senderType: z.string().optional(),
  senderId: z.union([z.number(), z.string(), z.null()]).optional(),
  senderName: z.union([z.string(), z.null()]).optional(),
  senderUsername: z.union([z.string(), z.null()]).optional(),
  status: z.enum(['sent', 'delivered', 'read', 'error']).optional(),
  mediaUrl: z
    .union([z.string(), z.null(), z.undefined()])
    .transform(parseMediaUrl)
    .optional(),
  mediaType: z.string().nullable().optional(),
  externalId: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// Conversation schema
export const ConversationSchema = z.object({
  id: z.union([z.number(), z.string()]).transform((val) => {
    if (typeof val === 'string') return parseInt(val, 10);
    return val;
  }),
  contactId: z.union([z.number(), z.string()]).transform((val) => {
    if (typeof val === 'string') return parseInt(val, 10);
    return val;
  }),
  botId: z
    .union([z.number(), z.string(), z.null()])
    .transform((val) => {
      if (val === null) return null;
      if (typeof val === 'string') return parseInt(val, 10);
      return val;
    })
    .optional(),
  context: z
    .union([z.record(z.string(), z.unknown()), z.null()])
    .default({}),
  lastMessage: z
    .union([z.string(), z.null()])
    .optional(),
  lastMessageTime: z.number().optional(),
  unreadCount: z.number().default(0),
  progressStatus: z.string().optional(),
  closedAt: z.string().nullable().optional(),
  closedReason: z.string().nullable().optional(),
  contact: z
    .object({
      id: z.union([z.number(), z.string()]).transform((val) => {
        if (typeof val === 'string') return parseInt(val, 10);
        return val;
      }),
      name: z.string(),
      phone: z.string(),
      avatar: z.string().optional(),
    })
    .optional(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

const ConversationFinishSchema = z.object({
  conversationId: z.number(),
  status: z.string(),
  reason: z.string().optional(),
  closedAt: z.string().nullable().optional(),
  closedReason: z.string().nullable().optional(),
});

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
  'conversation:new': z.object({
    conversation: ConversationSchema,
    source: z.string().optional(),
  }),
  'conversation:finish': ConversationFinishSchema,
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
