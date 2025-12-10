/**
 * useConversations v2 - Load and manage conversations
 * Replaces complexity from old useChatSession
 */

import { useEffect, useCallback } from 'react';
import {
  useChatStore,
  selectConversations,
  selectLoading,
} from '../../store/chatStore';
import { api } from '../../services/api';
import type { ConversationProgressStatus } from '../../types/chat';

export function useConversations() {
  const conversations = useChatStore(selectConversations);
  const loading = useChatStore(selectLoading);

  const loadConversations = useCallback(async () => {
    try {
      useChatStore.setState({ loading: true });
      const response = await api.get('/conversations', {
        timeout: 10000, // Increased from 5000ms to handle slower connections
      });

      // Ensure data is an array and normalize each conversation
      const conversations = Array.isArray(response.data)
        ? response.data.map((conv: any) => {
            // Convert string IDs to numbers
            const id =
              typeof conv.id === 'string' ? parseInt(conv.id, 10) : conv.id;
            const botId =
              typeof conv.botId === 'string'
                ? parseInt(conv.botId, 10)
                : conv.botId;
            const contactId =
              typeof conv.contactId === 'string'
                ? parseInt(conv.contactId, 10)
                : conv.contactId;

            const progressStatus =
              typeof conv.progressStatus === 'string'
                ? (conv.progressStatus.toUpperCase() as ConversationProgressStatus)
                : undefined;

            return {
              ...conv,
              id,
              botId,
              contactId,
              progressStatus: progressStatus ?? 'PENDING',
              // Ensure lastMessage is a string, not an object
              lastMessage:
                typeof conv.lastMessage === 'string'
                  ? conv.lastMessage
                  : conv.lastMessage?.content ||
                    (conv.lastMessage ? '...' : 'No messages'),
            };
          })
        : [];
      useChatStore.setState({ conversations, error: null });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load conversations';
      
      // Log error details but don't spam the console
      if (error instanceof Error && error.message.includes('timeout')) {
        console.warn('Conversations request timeout - server may be slow');
      } else {
        console.error('Error loading conversations:', error);
      }
      
      useChatStore.setState({ error: message, conversations: [] });
    } finally {
      useChatStore.setState({ loading: false });
    }
  }, []);

  // Load conversations on mount and keep polling to refresh list
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const handleManualRefresh = () => {
      loadConversations();
    };

    window.addEventListener('chat:refreshRequested', handleManualRefresh);
    return () =>
      window.removeEventListener('chat:refreshRequested', handleManualRefresh);
  }, [loadConversations]);

  // Add event listeners for real-time updates
  useEffect(() => {
    const handleMessageReceived = () => {
      loadConversations();
    };

    const handleConversationUpdated = () => {
      loadConversations();
    };

    const handleConversationListRefresh = () => {
      loadConversations();
    };

    window.addEventListener('chat:messageReceived', handleMessageReceived);
    window.addEventListener('chat:conversationUpdated', handleConversationUpdated);
    window.addEventListener('chat:conversationListRefresh', handleConversationListRefresh);

    return () => {
      window.removeEventListener('chat:messageReceived', handleMessageReceived);
      window.removeEventListener('chat:conversationUpdated', handleConversationUpdated);
      window.removeEventListener('chat:conversationListRefresh', handleConversationListRefresh);
    };
  }, [loadConversations]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
    }, 15000); // Changed from 5s to 15s to reduce server load and timeout issues

    return () => clearInterval(interval);
  }, [loadConversations]);

  return {
    conversations,
    loading,
    refetch: loadConversations,
  };
}
