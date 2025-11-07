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
  const { setLoading, setConversations, setError } = useChatStore((state) => ({
    setLoading: state.setLoading,
    setConversations: state.setConversations,
    setError: state.setError,
  }));

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/conversations', {
        timeout: 5000,
      });
      setConversations(response.data);
      setError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load conversations';
      setError(message);
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setConversations, setError]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    loading,
    refetch: loadConversations,
  };
}
