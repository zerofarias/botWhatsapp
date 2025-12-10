/**
 * ChatPage v2 - Rewritten with clean architecture
 * NO prop drilling, uses Zustand store directly
 * Simplified from original 100+ lines
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useChatStore, type Message } from '../store/chatStore';
import { useThemeStore } from '../store/themeStore';
import { getSocketManager } from '../services/socket/SocketManager';
import { useConversations } from '../hooks/v2/useConversations';
import { useSocketListeners } from '../hooks/v2/useSocketListeners';
import ErrorBoundary from '../components/ErrorBoundary';
import ChatView_v2 from '../components/chat/ChatView_v2';
import ChatComposer_v2 from '../components/chat/ChatComposer_v2';
import GroupedConversationList_v2 from '../components/chat/GroupedConversationList_v2';
import { FiX } from 'react-icons/fi';
import { api, closeAllConversations } from '../services/api';
import { normalizeSender } from '../services/socket/socketSchemas';
import Swal from 'sweetalert2';
import './ChatPage_v2.css';

// Theme Toggle Button Component
const ThemeToggleButton: React.FC = () => {
  const theme = useThemeStore((state) => state.resolvedTheme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      {theme === 'dark' ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
};

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
  const {
    conversations,
    loading: loadingConversations,
    refetch: refreshConversations,
  } = useConversations();
  const setActiveConversation = useChatStore(
    (state) => state.setActiveConversation
  );
  const [closingAllChats, setClosingAllChats] = useState(false);

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

  // Refresh message history when new messages arrive for the ACTIVE conversation
  useEffect(() => {
    const conversationId = activeConversation?.id;
    if (!conversationId) return;

    const handleActiveConversationMessage = async (event: Event) => {
      const customEvent = event as CustomEvent<{ conversationId: number }>;
      const eventConvId = customEvent.detail?.conversationId;
      
      // Double check this is for our conversation
      if (eventConvId !== conversationId) {
        return;
      }
      
      try {
        const response = await api.get(`/conversations/${conversationId}/history`, {
          timeout: 5000,
        });

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

        const store = useChatStore.getState();
        store.setMessageHistory(conversationId, normalizedMessages);
        store.setMessages(normalizedMessages);
      } catch (error) {
        console.error('Failed to reload conversation history', error);
      }
    };

    window.addEventListener('chat:activeConversationMessage', handleActiveConversationMessage);

    return () => {
      window.removeEventListener('chat:activeConversationMessage', handleActiveConversationMessage);
    };
  }, [activeConversation?.id]);

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

  const handleCloseAllChats = useCallback(async () => {
    const confirmed = await Swal.fire({
      title: 'Cerrar todos los chats',
      text: 'Esta acción marcará todas las conversaciones abiertas como cerradas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Cerrar todos',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });
    if (!confirmed.isConfirmed) {
      return;
    }

    setClosingAllChats(true);
    try {
      const result = await closeAllConversations();
      await refreshConversations();
      setActiveConversation(null);
      if (result?.closed && result.closed > 0) {
        await Swal.fire(
          'Chats cerrados',
          `Se cerraron ${result.closed} chat${result.closed === 1 ? '' : 's'}.`,
          'success'
        );
      } else {
        await Swal.fire(
          'No hay chats abiertos',
          'No se encontraron conversaciones pendientes para cerrar.',
          'info'
        );
      }
    } catch (error) {
      console.error('Error cerrando todos los chats', error);
      await Swal.fire(
        'Error',
        'No se pudieron cerrar todos los chats. Intenta de nuevo.',
        'error'
      );
    } finally {
      setClosingAllChats(false);
    }
  }, [refreshConversations, closeAllConversations]);

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
            <div className="header-actions">
              <ThemeToggleButton />
              <button
                type="button"
                className="conversation-close-all-btn"
                onClick={handleCloseAllChats}
                disabled={
                  closingAllChats ||
                  loadingConversations ||
                  conversations.length === 0
                }
                title={closingAllChats ? 'Cerrando chats...' : 'Cerrar todos los chats'}
              >
                {closingAllChats ? (
                  <span className="btn-spinner"></span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="conversation-list-items-v2">
            <GroupedConversationList_v2
              onSelectConversation={handleSelectConversation}
            />
          </div>
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
              <div>Selecciona una conversacion para empezar</div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ChatPage;
