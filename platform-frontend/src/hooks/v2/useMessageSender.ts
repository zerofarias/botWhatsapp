/**
 * useMessageSender v2 - Send messages with proper timeout and error handling
 * Replaces sendMessage logic from old useChatSession
 */

import { useCallback, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { api } from '../../services/api';

const SEND_TIMEOUT = 5000; // 5 seconds (reduced from 20s since backend now responds immediately)

export function useMessageSender() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendMessage = useCallback(
    async (
      conversationId: number,
      content: string,
      botId?: number
    ): Promise<{ success: boolean; messageId?: string | number }> => {
      try {
        useChatStore.setState({ sending: true, error: null });

        const controller = new AbortController();
        timeoutRef.current = setTimeout(() => controller.abort(), SEND_TIMEOUT);

        const url = `/conversations/${conversationId}/messages`;
        console.debug('[useMessageSender] Sending message to:', url, {
          conversationId,
          content,
          botId,
        });

        const response = await api.post(url, {
          content,
          botId,
          signal: controller.signal,
        });

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        const message = response.data;

        // Add message to store (socket might also add it, but this ensures local update)
        useChatStore.getState().addMessage({
          id: message.id,
          conversationId,
          content,
          sender: 'user',
          timestamp: Date.now(),
          status: 'sent',
          metadata: message.metadata,
        });

        return { success: true, messageId: message.id };
      } catch (error) {
        let errorMessage = 'Failed to send message';

        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            errorMessage = 'Message send timed out after 20 seconds';
          } else {
            errorMessage = error.message;
          }
        }

        useChatStore.setState({ error: errorMessage });
        console.error('Error sending message:', error);
        return { success: false };
      } finally {
        useChatStore.setState({ sending: false });
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    },
    []
  );

  return { sendMessage };
}
