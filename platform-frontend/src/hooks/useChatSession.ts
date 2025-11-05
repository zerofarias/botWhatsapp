import { markAllMessagesAsReadByPhone } from '../services/api';
import { useState, useEffect } from 'react';
import type { HistoryItem } from '../types/chat';
import { useSocket } from './useSocket';
import {
  api,
  createConversationNote,
  getCombinedHistory,
  startConversationFlow,
} from '../services/api';
import type { ConversationSummary } from '../types/chat';

/**
 * Hook para gestionar la sesión de chat de una conversación activa
 * @param activeConversation Conversación activa o null
 * @returns history, loading, sending, closing, sendMessage, closeConversation
 */
export function useChatSession(activeConversation: ConversationSummary | null) {
  const socket = useSocket();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  // Auto-refresh del historial cada 2 segundos
  useEffect(() => {
    let isMounted = true;
    if (!activeConversation) {
      setHistory([]);
      return;
    }

    const loadHistory = () => {
      getCombinedHistory(activeConversation.userPhone)
        .then((fullHistory) => {
          if (isMounted) setHistory(fullHistory || []);
        })
        .catch((error) => {
          console.error(
            '[useChatSession] Failed to fetch combined history',
            error
          );
        });
    };

    // Cargar historial inicial
    setLoading(true);
    markAllMessagesAsReadByPhone(activeConversation.userPhone)
      .catch((error) => {
        console.error(
          '[useChatSession] Error al marcar mensajes como leídos',
          error
        );
      })
      .finally(() => {
        loadHistory();
        setLoading(false);
      });

    // Auto-refresh cada 2 segundos
    const refreshInterval = setInterval(() => {
      if (isMounted) {
        loadHistory();
      }
    }, 2000);

    if (socket && activeConversation) {
      console.log(
        '[useChatSession] Socket is ready, setting up listeners for conversation:',
        activeConversation.id
      );

      const onMessage = (payload: { conversationId: string }) => {
        console.log(
          `[useChatSession] Received message:new for conversation:`,
          payload.conversationId,
          'Active conversation:',
          activeConversation.id
        );
        if (payload.conversationId === activeConversation.id) {
          console.log('[useChatSession] Reloading history after message:new');
          getCombinedHistory(activeConversation.userPhone)
            .then((fullHistory) => {
              if (isMounted) setHistory(fullHistory || []);
            })
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            .catch(() => {});
        }
      };

      // Escuchar takeover y finish
      const onTake = (payload: {
        conversationId: string;
        assignedTo: number;
        botActive: boolean;
      }) => {
        if (payload.conversationId === activeConversation.id) {
          alert('Esta conversación fue tomada por un operador.');
          getCombinedHistory(activeConversation.userPhone)
            .then((fullHistory) => {
              if (isMounted) setHistory(fullHistory || []);
            })
            .catch(() => {});
        }
      };

      const onFinish = (payload: {
        conversationId: string;
        status: string;
        reason: string;
      }) => {
        if (payload.conversationId === activeConversation.id) {
          alert('La conversación fue finalizada.');
          // Actualizar el status de la conversación activa a CLOSED para bloquear el input
          if (isMounted && activeConversation) {
            activeConversation.status = 'CLOSED';
          }
          getCombinedHistory(activeConversation.userPhone)
            .then((fullHistory) => {
              if (isMounted) setHistory(fullHistory || []);
            })
            .catch(() => {});
        }
      };

      // Escuchar actualizaciones de conversación (incluyendo cuando END node se ejecuta)
      const onConversationUpdate = (payload: {
        id?: string;
        conversationId?: string;
        botActive?: boolean;
        status?: string;
        [key: string]: unknown;
      }) => {
        const payloadId = payload.id || payload.conversationId;
        if (payloadId === activeConversation.id) {
          // Actualizar el estado local si el bot se desactivó
          if (payload.botActive === false && activeConversation.botActive) {
            activeConversation.botActive = false;
            console.log(
              '[useChatSession] Bot desactivado para esta conversación'
            );
          }
          // Recargar el historial para mostrar los últimos mensajes/notas
          getCombinedHistory(activeConversation.userPhone)
            .then((fullHistory) => {
              if (isMounted) setHistory(fullHistory || []);
            })
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            .catch(() => {});
        }
      };

      socket.on('message:new', onMessage);
      socket.on('conversation:take', onTake);
      socket.on('conversation:finish', onFinish);
      socket.on('conversation:update', onConversationUpdate);

      return () => {
        isMounted = false;
        clearInterval(refreshInterval);
        socket.off('message:new', onMessage);
        socket.off('conversation:take', onTake);
        socket.off('conversation:finish', onFinish);
        socket.off('conversation:update', onConversationUpdate);
      };
    }
    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, [activeConversation, socket]);

  // Efecto para iniciar el flujo automáticamente cuando se selecciona una conversación
  useEffect(() => {
    let isMounted = true;
    if (!activeConversation) {
      return;
    }

    // Solo iniciar el flujo si el bot está activo y la conversación no está asignada
    if (activeConversation.botActive && !activeConversation.assignedTo) {
      startConversationFlow(activeConversation.id)
        .then(() => {
          if (isMounted) {
            console.log(
              '[useChatSession] Flujo iniciado para conversación',
              activeConversation.id
            );
            // Recargar el historial después de iniciar el flujo
            return getCombinedHistory(activeConversation.userPhone);
          }
        })
        .then((fullHistory) => {
          if (isMounted && fullHistory) {
            setHistory(fullHistory);
          }
        })
        .catch((error) => {
          console.error('[useChatSession] Error al iniciar flujo:', error);
        });
    }

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
        // Recargar historial después de enviar mensaje
        const fullHistory = await getCombinedHistory(
          activeConversation.userPhone
        );
        setHistory(fullHistory || []);
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
