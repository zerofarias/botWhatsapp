/**
 * ChatPage v2 - Rewritten with clean architecture
 * NO prop drilling, uses Zustand store directly
 * Simplified from original 100+ lines
 */

import React, { useEffect, useCallback } from 'react';
import {
  useChatStore,
  selectActiveConversation,
  selectError,
} from '../store/chatStore';
import { initializeSocket } from '../services/socket/SocketManager';
import { useConversations } from '../hooks/v2/useConversations';
import { useSocketListeners } from '../hooks/v2/useSocketListeners';
import ErrorBoundary from '../components/ErrorBoundary';

const ChatPage: React.FC = () => {
  // Store state
  const error = useChatStore(selectError);
  const activeConversation = useChatStore(selectActiveConversation);
  const { setActiveConversation, setError } = useChatStore((state) => ({
    setActiveConversation: state.setActiveConversation,
    setError: state.setError,
  }));

  // Load conversations
  const { conversations, loading: loadingConversations } = useConversations();

  // Register socket listeners
  useSocketListeners();

  // Initialize socket connection
  useEffect(() => {
    try {
      // Get API URL from window or use default
      const apiUrl = (window as any).__API_URL__ || 'http://localhost:4000';
      const socketUrl = apiUrl.replace(/\/api\/?$/, '');

      const socket = initializeSocket(socketUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      // Connect socket
      socket.connect().catch((error) => {
        console.error('Failed to connect socket:', error);
        setError('Connection failed. Please refresh the page.');
      });

      return () => {
        // Don't disconnect on unmount - keep connection alive for other pages
      };
    } catch (error) {
      console.error('Socket initialization error:', error);
      setError('Socket initialization failed');
    }
  }, [setError]);

  // Auto-select first conversation on load
  useEffect(() => {
    if (!activeConversation && conversations.length > 0) {
      setActiveConversation(conversations[0].id);
    }
  }, [conversations, activeConversation, setActiveConversation]);

  const handleSelectConversation = useCallback(
    (conversationId: number) => {
      setActiveConversation(conversationId);
    },
    [setActiveConversation]
  );

  const handleDismissError = useCallback(() => {
    setError(null);
  }, [setError]);

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-100">
        {/* Conversation List */}
        <div className="w-64 bg-white border-r border-gray-300 flex flex-col">
          <div className="p-4 border-b border-gray-300">
            <h2 className="text-xl font-bold text-gray-800">Conversations</h2>
          </div>

          {loadingConversations ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-gray-500">No conversations</div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation.id)}
                  className={`w-full p-4 text-left border-b border-gray-200 hover:bg-gray-50 transition ${
                    activeConversation?.id === conversation.id
                      ? 'bg-blue-50 border-l-4 border-l-blue-500'
                      : ''
                  }`}
                >
                  <div className="font-semibold text-gray-800">
                    {conversation.contact?.name ||
                      `Contact ${conversation.contactId}`}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {conversation.lastMessage || 'No messages'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={handleDismissError}
                className="text-red-700 hover:text-red-900"
              >
                ✕
              </button>
            </div>
          )}

          {activeConversation ? (
            <>
              <div className="flex-1 overflow-y-auto bg-white p-4">
                <div className="text-center text-gray-500">
                  Chat view for {activeConversation.contact?.name}
                </div>
              </div>
              <div className="border-t border-gray-300 p-4 bg-white">
                <div className="text-center text-gray-500">
                  Message composer component
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-gray-500">
                Select a conversation to start
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ChatPage;
