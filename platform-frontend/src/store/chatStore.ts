/**
 * Chat Store - Zustand v2 architecture
 * Centralized state management for all chat operations
 * Replaces: useChatSession (534 lines) with modular responsibility separation
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ContactGroup } from '../hooks/v2/useContactGroups';
import type {
  ConversationProgressStatus,
  ConversationStatus,
} from '../types/chat';

// Types
export interface Message {
  id: number | string;
  conversationId: number;
  content: string;
  sender: 'user' | 'bot' | 'contact';
  timestamp: number;
  senderId?: number | null;
  senderName?: string | null;
  senderUsername?: string | null;
  status?: 'sent' | 'delivered' | 'read' | 'error';
  mediaUrl?: string;
  mediaType?: string; // Para soporte multimedia: image/jpeg, audio/mpeg, etc.
  metadata?: Record<string, any>;
}

export interface ConversationNote {
  id: number | string;
  conversationId: number;
  content: string;
  createdAt: number;
  createdById?: number | null;
  createdByName?: string | null;
}

export interface Conversation {
  id: number;
  contactId: number;
  botId: number;
  context: Record<string, any>;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
  status?: ConversationStatus;
  progressStatus?: ConversationProgressStatus;
  botActive?: boolean;
  closedAt?: string | null;
  closedReason?: string | null;
  contact?: {
    id: number;
    name: string;
    phone: string;
    photoUrl?: string;
    dni?: string | null;
    address1?: string | null;
    address2?: string | null;
    obraSocial?: string | null;
    obraSocial2?: string | null;
    isVip?: boolean;
    isProblematic?: boolean;
    isChronic?: boolean;
  };
}

export interface ChatStoreState {
  // UI State
  loading: boolean;
  sending: boolean;
  error: string | null;
  socketConnected: boolean;

  // Data State
  conversations: Conversation[];
  activeConversationId: number | null;
  selectedContactGroup: ContactGroup | null; // Para agrupar mensajes por contacto
  messages: Message[];
  messageHistory: Map<number, Message[]>;
  conversationNotes: Map<number, ConversationNote[]>;
  
  // Unread indicators (local state - resets on page refresh)
  unreadConversations: Set<number>;

  // Metadata
  hasMoreHistory: boolean;
  historyPage: number;
  totalMessages: number;

  // Actions
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
  setError: (error: string | null) => void;
  setSocketConnected: (connected: boolean) => void;

  // Conversation actions
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: number | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: number, updates: Partial<Conversation>) => void;

  // Contact group actions
  setSelectedContactGroup: (contactGroup: ContactGroup | null) => void;
  loadContactGroupMessages: (contactGroup: ContactGroup) => void;

  // Message actions
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string | number, updates: Partial<Message>) => void;
  deleteMessage: (id: string | number) => void;
  setMessageHistory: (conversationId: number, messages: Message[]) => void;
  prependMessages: (conversationId: number, messages: Message[]) => void;
  setConversationNotes: (
    conversationId: number,
    notes: ConversationNote[]
  ) => void;
  addConversationNote: (conversationId: number, note: ConversationNote) => void;

  // History pagination
  setHasMoreHistory: (hasMore: boolean) => void;
  setHistoryPage: (page: number) => void;
  setTotalMessages: (total: number) => void;

  // Unread actions
  markConversationUnread: (conversationId: number) => void;
  markConversationRead: (conversationId: number) => void;
  isConversationUnread: (conversationId: number) => boolean;

  // Utility
  getActiveConversation: () => Conversation | undefined;
  clearChat: () => void;
}

// Initialize store with proper middleware
export const useChatStore = create<ChatStoreState>()(
  subscribeWithSelector((set, get) => ({
    // Initial UI state
    loading: false,
    sending: false,
    error: null,
    socketConnected: false,

    // Initial data state
    conversations: [],
    activeConversationId: null,
    selectedContactGroup: null,
    messages: [],
    messageHistory: new Map(),
    conversationNotes: new Map(),
    unreadConversations: new Set(),

    // Initial metadata
    hasMoreHistory: true,
    historyPage: 0,
    totalMessages: 0,

    // UI Actions
    setLoading: (loading) => set({ loading }),
    setSending: (sending) => set({ sending }),
    setError: (error) => set({ error }),
    setSocketConnected: (connected) => set({ socketConnected: connected }),

    // Conversation actions
    setConversations: (conversations) => set({ conversations }),
    setActiveConversation: (id) => {
      // Load messages for this conversation from cache or fetch
      const state = get();
      const cachedMessages = state.messageHistory.get(id || 0) || [];
      
      // Mark conversation as read when selected
      let newUnreadSet = state.unreadConversations;
      if (id != null && state.unreadConversations.has(id)) {
        newUnreadSet = new Set(state.unreadConversations);
        newUnreadSet.delete(id);
      }
      
      set({ 
        activeConversationId: id, 
        messages: cachedMessages,
        unreadConversations: newUnreadSet
      });
    },
    addConversation: (conversation) =>
      set((state) => ({
        conversations: [conversation, ...state.conversations],
      })),
    updateConversation: (id, updates) =>
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      })),

    // Message actions
    setMessages: (messages) =>
      set((state) => {
        const currentConversationId = state.activeConversationId;
        let newHistory = state.messageHistory;
        if (currentConversationId != null) {
          newHistory = new Map(state.messageHistory);
          newHistory.set(currentConversationId, messages);
        }
        return {
          messages,
          ...(newHistory === state.messageHistory
            ? {}
            : { messageHistory: newHistory }),
        };
      }),
    addMessage: (message) =>
      set((state) => {
        const normalizedId =
          typeof message.id === 'string'
            ? message.id
            : message.id != null
            ? message.id.toString()
            : `${Date.now()}-${Math.random()}`;
        const normalizedMessage: Message = { ...message, id: normalizedId };

        const newHistory = new Map(state.messageHistory);
        const existing = newHistory.get(message.conversationId) || [];
        const historyHasMessage = existing.some(
          (m) => String(m.id) === normalizedId
        );
        if (!historyHasMessage) {
          newHistory.set(message.conversationId, [
            ...existing,
            normalizedMessage,
          ]);
        }

        // Check if message is for the active conversation
        // Compare as numbers to avoid type mismatch issues
        const activeId = state.activeConversationId;
        const msgConvId = message.conversationId;
        const isForActiveConversation = activeId != null && 
          Number(activeId) === Number(msgConvId);
        
        const notDuplicate = !state.messages.some((m) => String(m.id) === normalizedId);
        const shouldAppend = isForActiveConversation && notDuplicate;

        return {
          messageHistory: newHistory,
          messages: shouldAppend
            ? [...state.messages, normalizedMessage]
            : state.messages,
        };
      }),
    updateMessage: (id, updates) =>
      set((state) => {
        const updatedMessages = state.messages.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        );

        const newHistory = new Map(state.messageHistory);
        newHistory.forEach((msgs, conversationId) => {
          let changed = false;
          const nextMsgs = msgs.map((msg) => {
            if (msg.id === id) {
              changed = true;
              return { ...msg, ...updates };
            }
            return msg;
          });
          if (changed) {
            newHistory.set(conversationId, nextMsgs);
          }
        });

        return {
          messages: updatedMessages,
          messageHistory: newHistory,
        };
      }),
    deleteMessage: (id) =>
      set((state) => {
        const filteredMessages = state.messages.filter((m) => m.id !== id);
        const newHistory = new Map(state.messageHistory);
        newHistory.forEach((msgs, conversationId) => {
          const nextMsgs = msgs.filter((msg) => msg.id !== id);
          newHistory.set(conversationId, nextMsgs);
        });

        return {
          messages: filteredMessages,
          messageHistory: newHistory,
        };
      }),
    setMessageHistory: (conversationId, messages) =>
      set((state) => {
        const newHistory = new Map(state.messageHistory);
        newHistory.set(conversationId, messages);
        return { messageHistory: newHistory };
      }),
    setConversationNotes: (conversationId, notes) =>
      set((state) => {
        const next = new Map(state.conversationNotes);
        next.set(
          conversationId,
          [...notes].sort((a, b) => a.createdAt - b.createdAt)
        );
        return { conversationNotes: next };
      }),
    addConversationNote: (conversationId, note) =>
      set((state) => {
        const next = new Map(state.conversationNotes);
        const existing = next.get(conversationId) || [];
        const updated = [...existing, note].sort(
          (a, b) => a.createdAt - b.createdAt
        );
        next.set(conversationId, updated);
        return { conversationNotes: next };
      }),
    prependMessages: (conversationId, messages) =>
      set((state) => {
        const newHistory = new Map(state.messageHistory);
        const existing = newHistory.get(conversationId) || [];
        newHistory.set(conversationId, [...messages, ...existing]);
        return { messageHistory: newHistory };
      }),

    // History pagination
    setHasMoreHistory: (hasMore) => set({ hasMoreHistory: hasMore }),
    setHistoryPage: (page) => set({ historyPage: page }),
    setTotalMessages: (total) => set({ totalMessages: total }),

    // Contact group actions
    setSelectedContactGroup: (contactGroup) =>
      set({ selectedContactGroup: contactGroup }),

    loadContactGroupMessages: (contactGroup) => {
      // Cargar mensajes de todas las conversaciones del contacto desde el servidor
      const conversationIds = contactGroup.conversations.map((c) => c.id);

      // Por ahora, usar los mensajes del cache
      // En el futuro, aquí harías fetch('/api/conversations/messages/bulk', { conversationIds })
      const state = get();
      const allMessages: Message[] = [];

      conversationIds.forEach((conversationId) => {
        const messages = state.messageHistory.get(conversationId) || [];
        allMessages.push(...messages);
      });

      // Ordenar cronológicamente y actualizar estado
      const sortedMessages = allMessages.sort(
        (a, b) => a.timestamp - b.timestamp
      );
      set({
        selectedContactGroup: contactGroup,
        messages: sortedMessages,
        activeConversationId: null, // Clear single conversation since we're showing grouped
      });
    },

    // Utility
    getActiveConversation: () => {
      const state = get();
      return state.conversations.find(
        (c) => c.id === state.activeConversationId
      );
    },
    
    // Unread conversations management
    markConversationUnread: (conversationId) => {
      const state = get();
      // Don't mark as unread if it's the active conversation
      if (state.activeConversationId === conversationId) return;
      
      const newSet = new Set(state.unreadConversations);
      newSet.add(conversationId);
      set({ unreadConversations: newSet });
    },
    markConversationRead: (conversationId) => {
      const state = get();
      if (!state.unreadConversations.has(conversationId)) return;
      
      const newSet = new Set(state.unreadConversations);
      newSet.delete(conversationId);
      set({ unreadConversations: newSet });
    },
    isConversationUnread: (conversationId) => {
      return get().unreadConversations.has(conversationId);
    },
    
    clearChat: () =>
      set({
        messages: [],
        conversations: [],
        activeConversationId: null,
        messageHistory: new Map(),
        conversationNotes: new Map(),
        unreadConversations: new Set(),
        loading: false,
        sending: false,
        error: null,
      }),
  }))
);

// Selectors for performance optimization
export const selectLoading = (state: ChatStoreState) => state.loading;
export const selectSending = (state: ChatStoreState) => state.sending;
export const selectError = (state: ChatStoreState) => state.error;
export const selectMessages = (state: ChatStoreState) => state.messages;
export const selectConversations = (state: ChatStoreState) =>
  state.conversations;
export const selectActiveConversation = (state: ChatStoreState) => {
  const conversation = state.conversations.find(
    (c) => c.id === state.activeConversationId
  );
  return conversation || null;
};
export const selectSocketConnected = (state: ChatStoreState) =>
  state.socketConnected;

// Selector para obtener mensajes agrupados por contacto
export const selectContactGroupMessages = (
  state: ChatStoreState
): Message[] => {
  if (!state.selectedContactGroup) {
    return [];
  }

  // Obtener todos los IDs de conversaciones del contacto seleccionado
  const conversationIds = state.selectedContactGroup.conversations.map(
    (c) => c.id
  );

  // Obtener mensajes de todas las conversaciones del contacto desde messageHistory
  const allMessages: Message[] = [];
  conversationIds.forEach((conversationId) => {
    const messages = state.messageHistory.get(conversationId) || [];
    allMessages.push(...messages);
  });

  // Ordenar mensajes cronológicamente
  return allMessages.sort((a, b) => a.timestamp - b.timestamp);
};
