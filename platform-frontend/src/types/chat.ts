// src/types/chat.ts

export type ConversationStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'CLOSED';

export type ConversationProgressStatus =
  | 'PENDING'
  | 'IN_PREPARATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'INACTIVE';

export type ContactSummary = {
  id: number | null;
  name: string | null;
  phone: string;
  dni: string | null;
  address1?: string | null;
  address2?: string | null;
  photoUrl?: string | null;
  obraSocial?: string | null;
  obraSocial2?: string | null;
  isVip?: boolean;
  isProblematic?: boolean;
  isChronic?: boolean;
};

export type ConversationSummary = {
  id: string;
  userPhone: string;
  contactName: string | null;
  contact: ContactSummary | null;
  area: { id: number; name: string | null } | null;
  assignedTo: { id: number; name: string | null } | null;
  status: ConversationStatus;
  progressStatus?: ConversationProgressStatus;
  botActive: boolean;
  lastActivity: string;
  closedAt?: string | null;
  closedReason?: string | null;
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
  isRead: boolean;
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
  createdAt: string;
  createdById: number | null;
  conversationId: string;
};

export type HistoryLabelItem = {
  type: 'label';
  id?: string;
  label: string;
  conversationId: string;
  timestamp: string;
};

export type HistoryItem =
  | HistoryMessageItem
  | HistoryNoteItem
  | HistoryLabelItem;
