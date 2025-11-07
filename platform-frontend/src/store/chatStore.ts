/**
 * Chat Store - Zustand v2 architecture
 * Centralized state management for all chat operations
 * Replaces: useChatSession (534 lines) with modular responsibility separation
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Types
export interface Message {
  id: number | string;
  conversationId: number;
  content: string;
  sender: 'user' | 'bot' | 'contact';
  timestamp: number;
  status?: 'sent' | 'delivered' | 'read' | 'error';
  mediaUrl?: string;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: number;
  contactId: number;
  botId: number;
  context: Record<string, any>;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
  contact?: {
    id: number;
    name: string;
    phone: string;
    avatar?: string;
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
  messages: Message[];
  messageHistory: Map<number, Message[]>;

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

  // Message actions
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string | number, updates: Partial<Message>) => void;
  deleteMessage: (id: string | number) => void;
  setMessageHistory: (conversationId: number, messages: Message[]) => void;
  prependMessages: (conversationId: number, messages: Message[]) => void;

  // History pagination
  setHasMoreHistory: (hasMore: boolean) => void;
  setHistoryPage: (page: number) => void;
  setTotalMessages: (total: number) => void;

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
    messages: [],
    messageHistory: new Map(),

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
      set({ activeConversationId: id, messages: cachedMessages });
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
    setMessages: (messages) => set({ messages }),
    addMessage: (message) =>
      set((state) => ({
        messages: [...state.messages, message],
      })),
    updateMessage: (id, updates) =>
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      })),
    deleteMessage: (id) =>
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== id),
      })),
    setMessageHistory: (conversationId, messages) =>
      set((state) => {
        const newHistory = new Map(state.messageHistory);
        newHistory.set(conversationId, messages);
        return { messageHistory: newHistory };
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

    // Utility
    getActiveConversation: () => {
      const state = get();
      return state.conversations.find(
        (c) => c.id === state.activeConversationId
      );
    },
    clearChat: () =>
      set({
        messages: [],
        conversations: [],
        activeConversationId: null,
        messageHistory: new Map(),
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
