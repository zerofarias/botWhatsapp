import { markAllMessagesAsReadByPhone } from '../services/api';
import { useState, useEffect } from 'react';
import {
  api,
  createConversationNote,
  getCombinedHistory,
} from '../services/api';
import type { ConversationSummary } from '../types/chat';

export function useChatSession(activeConversation: ConversationSummary | null) {
  const [history, setHistory] = useState<unknown[]>([]); // Cambia 'unknown' por el tipo correcto si lo tienes
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!activeConversation) {
      setHistory([]);
      return;
    }

    setLoading(true);
    markAllMessagesAsReadByPhone(activeConversation.userPhone)
      .catch((error) => {
        console.error(
          '[useChatSession] Error al marcar mensajes como leídos',
          error
        );
      })
      .finally(() => {
        getCombinedHistory(activeConversation.userPhone)
          .then((fullHistory) => {
            if (isMounted) setHistory(fullHistory || []);
          })
          .catch((error) => {
            console.error(
              '[useChatSession] Failed to fetch combined history',
              error
            );
            if (isMounted) setHistory([]);
          })
          .finally(() => {
            if (isMounted) setLoading(false);
          });
      });
    return () => {
      isMounted = false;
    };
  }, [activeConversation]);

  const sendMessage = async (content: string, isNote: boolean) => {
    if (!activeConversation) return;
    setSending(true);
    try {
      if (isNote) {
        const newNote = await createConversationNote(
          activeConversation.id,
          content
        );
        setHistory((prevHistory) => {
          const newHistory = [...prevHistory, { type: 'note', ...newNote }];
          newHistory.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          return newHistory;
        });
      } else {
        await api.post(`/conversations/${activeConversation.id}/messages`, {
          content,
        });
      }
    } catch (error) {
      console.error('[useChatSession] Failed to send message', error);
      alert('❌ No se pudo enviar el mensaje.');
    } finally {
      setSending(false);
    }
  };

  const closeConversation = async () => {
    if (!activeConversation || activeConversation.status === 'CLOSED') return;
    setClosing(true);
    try {
      await api.post(`/conversations/${activeConversation.id}/close`, {});
    } catch (error) {
      console.error('[useChatSession] Failed to close conversation', error);
    } finally {
      setClosing(false);
    }
  };

  return {
    history,
    loading,
    sending,
    closing,
    sendMessage,
    closeConversation,
  };
}
