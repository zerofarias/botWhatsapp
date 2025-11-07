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

export function useConversations() {
  const conversations = useChatStore(selectConversations);
  const loading = useChatStore(selectLoading);

  const loadConversations = useCallback(async () => {
    try {
      useChatStore.setState({ loading: true });
      const response = await api.get('/conversations', {
        timeout: 5000,
      });
      console.log('📥 Conversations loaded:', response.data);

      // Ensure data is an array
      const conversations = Array.isArray(response.data) ? response.data : [];
      useChatStore.setState({ conversations, error: null });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load conversations';
      useChatStore.setState({ error: message, conversations: [] });
      console.error('Error loading conversations:', error);
    } finally {
      useChatStore.setState({ loading: false });
    }
  }, []);

  // Load conversations on mount only
  useEffect(() => {
    loadConversations();
  }, []);

  return {
    conversations,
    loading,
    refetch: loadConversations,
  };
}
