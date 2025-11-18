/**
 * ChatPage v2 - Rewritten with clean architecture
 * NO prop drilling, uses Zustand store directly
 * Simplified from original 100+ lines
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { useChatStore, type Message } from '../store/chatStore';
import { getSocketManager } from '../services/socket/SocketManager';
import { useConversations } from '../hooks/v2/useConversations';
import { useSocketListeners } from '../hooks/v2/useSocketListeners';
import ErrorBoundary from '../components/ErrorBoundary';
import ChatView_v2 from '../components/chat/ChatView_v2';
import ChatComposer_v2 from '../components/chat/ChatComposer_v2';
import GroupedConversationList_v2 from '../components/chat/GroupedConversationList_v2';
import { FiX } from 'react-icons/fi';
import { api } from '../services/api';
import { normalizeSender } from '../services/socket/socketSchemas';
import './ChatPage_v2.css';

const ChatPage: React.FC = () => {
  // Refs for tracking initialization
  const hasInitializedConversation = useRef(false);

  // Store state - use simple getters to avoid infinite loops
  const error = useChatStore((state) => state.error);
  const activeConversation = useChatStore(
    (state) =>
      state.conversations.find((c) => c.id === state.activeConversationId) ||
      null
  );

  // Load conversations
  const { conversations, loading: loadingConversations } = useConversations();

  // Register socket listeners (socket is already initialized in DashboardLayout)
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
          ? response.data.map((message: any) => ({
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
                message.senderType ?? message.sender ?? 'contact'
              ),
              senderId:
                typeof message.senderId === 'string'
                  ? parseInt(message.senderId, 10)
                  : message.senderId ?? null,
              senderName:
                message.senderName ??
                message.sender?.name ??
                (message.senderType === 'BOT' ? 'Bot' : null),
              senderUsername:
                message.senderUsername ?? message.sender?.username ?? null,
              timestamp: message.createdAt
                ? new Date(message.createdAt).getTime()
                : message.timestamp || Date.now(),
              status: (message.status as Message['status']) ?? 'delivered',
              mediaUrl:
                message.mediaUrl ??
                message.media?.url ??
                message.metadata?.mediaUrl ??
                undefined,
              mediaType:
                message.mediaType ??
                message.media?.mediaType ??
                message.media?.type ??
                message.metadata?.mediaType ??
                undefined,
              metadata: {
                senderType: message.senderType,
                senderId:
                  typeof message.senderId === 'string'
                    ? parseInt(message.senderId, 10)
                    : message.senderId ?? null,
                senderName:
                  message.senderName ??
                  message.sender?.name ??
                  (message.senderType === 'BOT' ? 'Bot' : null),
                senderUsername:
                  message.senderUsername ?? message.sender?.username ?? null,
                mediaUrl: message.mediaUrl ?? message.metadata?.mediaUrl,
                mediaType:
                  message.mediaType ??
                  message.media?.mediaType ??
                  message.metadata?.mediaType,
              },
            }))
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

          <GroupedConversationList_v2
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

          {activeConversation ? (
            <>
              <ChatView_v2 conversationId={activeConversation.id} />
              <ChatComposer_v2 />
            </>
          ) : (
            <div className="chat-view-v2-empty">
              <div>Selecciona una conversaci�n para empezar</div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ChatPage;
