/**
 * ChatPage v2 - Rewritten with clean architecture
 * NO prop drilling, uses Zustand store directly
 * Simplified from original 100+ lines
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { initializeSocket } from '../services/socket/SocketManager';
import { useConversations } from '../hooks/v2/useConversations';
import { useSocketListeners } from '../hooks/v2/useSocketListeners';
import ErrorBoundary from '../components/ErrorBoundary';
import ChatView_v2 from '../components/chat/ChatView_v2';
import ChatComposer_v2 from '../components/chat/ChatComposer_v2';
import './ChatPage_v2.css';

const ChatPage: React.FC = () => {
  // Refs for tracking initialization
  const hasInitializedConversation = useRef(false);
  const socketInitialized = useRef(false);

  // Store state - use simple getters to avoid infinite loops
  const error = useChatStore((state) => state.error);
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

  const handleSelectConversation = useCallback((conversationId: number) => {
    useChatStore.getState().setActiveConversation(conversationId);
  }, []);

  const handleDismissError = useCallback(() => {
    useChatStore.getState().setError(null);
  }, []);

  return (
    <ErrorBoundary>
      <div className="chat-page-v2-container">
        {/* Conversation List */}
        <div className="conversation-list-panel-v2">
          <div className="conversation-list-header-v2">
            <h2>Conversations</h2>
          </div>

          {loadingConversations ? (
            <div className="chat-loading">
              <div>Loading conversations...</div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="conversation-empty-state">
              <div>No conversations</div>
            </div>
          ) : (
            <div className="conversation-list-items-v2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation.id)}
                  className={`conversation-item-button-v2 ${
                    activeConversation?.id === conversation.id ? 'active' : ''
                  }`}
                >
                  <div className="conversation-item-name">
                    {typeof conversation.contact?.name === 'string'
                      ? conversation.contact.name
                      : `Contact ${conversation.contactId}`}
                  </div>
                  <div className="conversation-item-preview">
                    {typeof conversation.lastMessage === 'string'
                      ? conversation.lastMessage
                      : 'No messages'}
                  </div>
                </button>
              ))}
            </div>
          )}
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
            <div className="chat-area-empty-v2">
              <div>Select a conversation to start</div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ChatPage;
