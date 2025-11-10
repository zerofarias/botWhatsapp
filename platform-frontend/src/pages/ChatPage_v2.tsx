/**
 * ChatPage v2 - Rewritten with clean architecture
 * NO prop drilling, uses Zustand store directly
 * Simplified from original 100+ lines
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { useChatStore, type Message } from '../store/chatStore';
import { initializeSocket } from '../services/socket/SocketManager';
import { useConversations } from '../hooks/v2/useConversations';
import { useSocketListeners } from '../hooks/v2/useSocketListeners';
import ErrorBoundary from '../components/ErrorBoundary';
import ChatView_v2 from '../components/chat/ChatView_v2';
import ChatComposer_v2 from '../components/chat/ChatComposer_v2';
import SimpleConversationList_v2 from '../components/chat/SimpleConversationList_v2';
import { api } from '../services/api';
import './ChatPage_v2.css';

const normalizeSender = (value?: string | null): Message['sender'] => {
  if (!value) return 'contact';
  const normalized = value.trim().toLowerCase();
  if (['operator', 'user', 'agent', 'admin'].includes(normalized)) {
    return 'user';
  }
  if (['bot', 'system'].includes(normalized)) {
    return 'bot';
  }
  return 'contact';
};

const ChatPage: React.FC = () => {
  // Refs for tracking initialization
  const hasInitializedConversation = useRef(false);
  const socketInitialized = useRef(false);

  // Store state - use simple getters to avoid infinite loops
  const error = useChatStore((state) => state.error);
  const selectedContactGroup = useChatStore(
    (state) => state.selectedContactGroup
  );
  const activeConversation = useChatStore(
    (state) =>
      state.conversations.find((c) => c.id === state.activeConversationId) ||
      null
  );

  // Load conversations
  const { conversations, loading: loadingConversations } = useConversations();

  // Initialize socket connection FIRST (before useSocketListeners)
  useEffect(() => {
    if (socketInitialized.current) return;
    socketInitialized.current = true;

    try {
      // Derive socket URL from current window location or VITE_API_URL
      const viteApiUrl = import.meta.env.VITE_API_URL;
      let socketUrl: string;

      if (viteApiUrl) {
        // Remove /api suffix if present
        socketUrl = viteApiUrl.replace(/\/api\/?$/, '');
      } else {
        // Fallback: use current location's protocol + hostname + port 4000
        socketUrl = `${window.location.protocol}//${window.location.hostname}:4000`;
      }

      console.log('🔌 Initializing socket with URL:', socketUrl);

      const socket = initializeSocket(socketUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      // Connect socket
      socket.connect().catch((error) => {
        console.error('Failed to connect socket:', error);
        useChatStore.setState({
          error: 'Connection failed. Please refresh the page.',
        });
      });

      return () => {
        // Don't disconnect on unmount - keep connection alive for other pages
      };
    } catch (error) {
      console.error('Socket initialization error:', error);
      useChatStore.setState({ error: 'Socket initialization failed' });
    }
  }, []);

  // Register socket listeners AFTER socket is initialized
  useSocketListeners();

  // Load messages for the active conversation
  useEffect(() => {
    const conversationId = activeConversation?.id;
    if (!conversationId) {
      return;
    }

    let cancelled = false;

    const fetchConversationHistory = async () => {
      try {
        useChatStore.getState().setLoading(true);
        const response = await api.get(
          `/conversations/${conversationId}/history`,
          {
            timeout: 5000,
          }
        );

        const normalizedMessages = Array.isArray(response.data)
          ? response.data.map((message: any) => {
              const parsedSenderId =
                typeof message.senderId === 'string'
                  ? parseInt(message.senderId, 10)
                  : message.senderId ?? null;

              return {
                id:
                  typeof message.id === 'string'
                    ? parseInt(message.id, 10)
                    : message.id,
                conversationId:
                  typeof message.conversationId === 'string'
                    ? parseInt(message.conversationId, 10)
                    : message.conversationId ?? conversationId,
                content: message.content ?? '',
                sender: normalizeSender(
                  message.senderType || message.sender || undefined
                ),
                senderId: parsedSenderId,
                senderName: message.senderName ?? null,
                senderUsername: message.senderUsername ?? null,
                timestamp: message.createdAt
                  ? new Date(message.createdAt).getTime()
                  : message.timestamp || Date.now(),
                status: (message.status as Message['status']) ?? 'delivered',
                mediaUrl: message.mediaUrl ?? undefined,
                mediaType: message.mediaType ?? undefined,
                metadata: {
                  senderType: message.senderType,
                  senderId: parsedSenderId,
                  senderName: message.senderName ?? null,
                  senderUsername: message.senderUsername ?? null,
                },
              };
            })
          : [];

        if (cancelled) return;

        const store = useChatStore.getState();
        store.setMessageHistory(conversationId, normalizedMessages);
        store.setMessages(normalizedMessages);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load conversation history', error);
          useChatStore
            .getState()
            .setError('No se pudo cargar el historial de mensajes.');
        }
      } finally {
        if (!cancelled) {
          useChatStore.getState().setLoading(false);
        }
      }
    };

    fetchConversationHistory();

    return () => {
      cancelled = true;
    };
  }, [activeConversation?.id]);

  // Auto-select first conversation on load (only once)
  useEffect(() => {
    if (
      !hasInitializedConversation.current &&
      !activeConversation &&
      conversations.length > 0
    ) {
      hasInitializedConversation.current = true;
      useChatStore.getState().setActiveConversation(conversations[0].id);
    }
  }, [conversations.length, activeConversation]); // Only depend on length and activeConversation to avoid infinite loop

  const handleSelectConversation = useCallback(
    (conversationId: number | string) => {
      const id =
        typeof conversationId === 'string'
          ? parseInt(conversationId, 10)
          : conversationId;
      useChatStore.getState().setActiveConversation(id);
    },
    []
  );

  const handleDismissError = useCallback(() => {
    useChatStore.getState().setError(null);
  }, []);

  return (
    <ErrorBoundary>
      <div className="chat-page-v2-container">
        {/* Conversation List - Now Grouped by Phone Number */}
        <div className="conversation-list-panel-v2">
          <div className="conversation-list-header-v2">
            <h2>Conversaciones</h2>
          </div>

          <SimpleConversationList_v2
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* Chat Area */}
        <div className="chat-area-v2">
          {error && (
            <div className="chat-error-banner-v2">
              <span>{error}</span>
              <button onClick={handleDismissError} title="Dismiss">
                ✕
              </button>
            </div>
          )}

          {selectedContactGroup || activeConversation ? (
            <>
              <ChatView_v2
                contactGroup={selectedContactGroup}
                conversationId={activeConversation?.id || 0}
              />
              <ChatComposer_v2 />
            </>
          ) : (
            <div className="chat-view-v2-empty">
              <div>Selecciona una conversación para empezar</div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ChatPage;
