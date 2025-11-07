/**
 * useMessageSender v2 - Send messages with proper timeout and error handling
 * Replaces sendMessage logic from old useChatSession
 */

import { useCallback, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { api } from '../../services/api';

const SEND_TIMEOUT = 20000; // 20 seconds

export function useMessageSender() {
  const { setSending, setError, addMessage } = useChatStore((state) => ({
    setSending: state.setSending,
    setError: state.setError,
    addMessage: state.addMessage,
  }));

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendMessage = useCallback(
    async (
      conversationId: number,
      content: string,
      botId?: number
    ): Promise<{ success: boolean; messageId?: string | number }> => {
      try {
        setSending(true);
        setError(null);

        const controller = new AbortController();
        timeoutRef.current = setTimeout(() => controller.abort(), SEND_TIMEOUT);

        const response = await api.post('/api/messages', {
          conversationId,
          content,
          botId,
          signal: controller.signal,
        });

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        const message = response.data;

        // Add message to store (socket might also add it, but this ensures local update)
        addMessage({
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

        setError(errorMessage);
        console.error('Error sending message:', error);
        return { success: false };
      } finally {
        setSending(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    },
    [setSending, setError, addMessage]
  );

  return { sendMessage };
}
