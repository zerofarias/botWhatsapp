// src/types/chat.ts

export type ConversationStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'CLOSED';

export type ContactSummary = {
  id: number | null;
  name: string | null;
  phone: string;
  dni: string | null;
};

export type ConversationSummary = {
  id: string;
  userPhone: string;
  contactName: string | null;
  contact: ContactSummary | null;
  area: { id: number; name: string | null } | null;
  assignedTo: { id: number; name: string | null } | null;
  status: ConversationStatus;
  botActive: boolean;
  lastActivity: string;
  updatedAt: string;
  lastMessage: {
    id: string;
    senderType: 'CONTACT' | 'BOT' | 'OPERATOR';
    senderId: number | null;
    content: string;
    externalId: string | null;
    isDelivered: boolean;
    createdAt: string;
  } | null;
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  senderType: 'CONTACT' | 'BOT' | 'OPERATOR';
  senderId: number | null;
  content: string;
  mediaType: string | null;
  mediaUrl: string | null;
  externalId: string | null;
  isDelivered: boolean;
  createdAt: string;
};

// Discriminated union for items in the chat history view

export type HistoryMessageItem = ConversationMessage & {
  type: 'message';
};

export type HistoryNoteItem = {
  type: 'note';
  id: string;
  content: string;
  createdAt: Date | string;
  createdById: number | null;
  conversationId: string;
};

export type HistoryLabelItem = {
  type: 'label';
  label: string;
  conversationId: string;
  timestamp: Date | string | null;
};

export type HistoryItem =
  | HistoryMessageItem
  | HistoryNoteItem
  | HistoryLabelItem;
