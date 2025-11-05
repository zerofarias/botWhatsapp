import { markAllMessagesAsReadByPhone } from '../services/api';
import { useState, useEffect, useCallback, useRef } from 'react';
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
 * Mejoras:
 * - Sin polling automático (solo event-driven)
 * - Sin mutaciones directas del estado
 * - Listeners optimizados sin refetch duplicado
 * - Manejo correcto de efectos y cleanup
 */
export function useChatSession(activeConversation: ConversationSummary | null) {
  const socket = useSocket();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  // Usar ref para tracking sin efectos secundarios
  const isMountedRef = useRef(true);
  const loadingInProgressRef = useRef(false);

  // Función centralizada para cargar historial sin duplicación
  const loadHistoryOnce = useCallback(async (phoneNumber: string) => {
    // Evitar múltiples peticiones simultáneas
    if (loadingInProgressRef.current) return;

    loadingInProgressRef.current = true;
    try {
      const fullHistory = await getCombinedHistory(phoneNumber);
      if (isMountedRef.current) {
        setHistory(fullHistory || []);
      }
    } catch (error) {
      console.error('[useChatSession] Failed to fetch combined history', error);
    } finally {
      loadingInProgressRef.current = false;
    }
  }, []);

  // Efecto 1: Cargar datos iniciales de la conversación
  useEffect(() => {
    if (!activeConversation) {
      setHistory([]);
      return;
    }

    setLoading(true);

    // Marcar como leído y cargar historial en paralelo
    Promise.all([
      markAllMessagesAsReadByPhone(activeConversation.userPhone).catch(
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        () => {}
      ),
      loadHistoryOnce(activeConversation.userPhone),
    ]).finally(() => {
      if (isMountedRef.current) {
        setLoading(false);
      }
    });

    return () => {
      // Cleanup: no hacer nada especial aquí, solo mantener isMounted actualizado
    };
  }, [activeConversation, loadHistoryOnce]);

  // Efecto 2: Setup listeners de socket SOLO (sin polling)
  useEffect(() => {
    if (!socket || !activeConversation) return;

    console.log(
      '[useChatSession] Setting up socket listeners for conversation:',
      activeConversation.id
    );

    // Listener para nuevos mensajes
    const onMessage = (payload: { conversationId: string }) => {
      if (payload.conversationId === activeConversation.id) {
        console.log('[useChatSession] Received message:new event');
        loadHistoryOnce(activeConversation.userPhone);
      }
    };

    // Listener para takeover
    const onTake = (payload: {
      conversationId: string;
      assignedTo: number;
      botActive: boolean;
    }) => {
      if (payload.conversationId === activeConversation.id) {
        console.log('[useChatSession] Conversation taken over');
        loadHistoryOnce(activeConversation.userPhone);
      }
    };

    // Listener para finish
    const onFinish = (payload: {
      conversationId: string;
      status: string;
      reason: string;
    }) => {
      if (payload.conversationId === activeConversation.id) {
        console.log('[useChatSession] Conversation finished');
        loadHistoryOnce(activeConversation.userPhone);
      }
    };

    // Listener para actualizaciones (incluyendo END node)
    const onConversationUpdate = (payload: {
      id?: string;
      conversationId?: string;
      botActive?: boolean;
      status?: string;
      [key: string]: unknown;
    }) => {
      const payloadId = payload.id || payload.conversationId;
      if (payloadId === activeConversation.id) {
        console.log('[useChatSession] Conversation update received');
        loadHistoryOnce(activeConversation.userPhone);
      }
    };

    // Registrar listeners
    socket.on('message:new', onMessage);
    socket.on('conversation:take', onTake);
    socket.on('conversation:finish', onFinish);
    socket.on('conversation:update', onConversationUpdate);

    return () => {
      socket.off('message:new', onMessage);
      socket.off('conversation:take', onTake);
      socket.off('conversation:finish', onFinish);
      socket.off('conversation:update', onConversationUpdate);
    };
  }, [activeConversation, socket, loadHistoryOnce]);

  // Efecto 3: Iniciar flujo automáticamente si es necesario
  useEffect(() => {
    if (!activeConversation) return;

    if (activeConversation.botActive && !activeConversation.assignedTo) {
      startConversationFlow(activeConversation.id)
        .then(() => {
          console.log(
            '[useChatSession] Flow started for conversation',
            activeConversation.id
          );
          // Recargar historial después de iniciar el flujo
          return loadHistoryOnce(activeConversation.userPhone);
        })
        .catch((error) => {
          console.error('[useChatSession] Error starting flow:', error);
        });
    }
  }, [activeConversation, loadHistoryOnce]);

  // Cleanup mount ref
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Función para enviar mensaje o nota
  const sendMessage = useCallback(
    async (content: string, isNote: boolean) => {
      if (!activeConversation) return;

      setSending(true);
      try {
        if (isNote) {
          const newNote = await createConversationNote(
            activeConversation.id,
            content
          );
          // Actualizar estado inmediatamente en lugar de recargar todo
          setHistory((prevHistory: HistoryItem[]) => {
            const newHistory = [...prevHistory, { type: 'note', ...newNote }];
            newHistory.sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            );
            return newHistory;
          });
        } else {
          // Agregar mensaje optimista al historial inmediatamente
          const optimisticMessage: HistoryItem = {
            type: 'message',
            id: `temp-${Date.now()}`,
            content,
            senderType: 'OPERATOR',
            createdAt: new Date().toISOString(),
            conversationId: activeConversation.id,
            senderId: null,
            mediaType: null,
            mediaUrl: null,
            externalId: null,
            isDelivered: false,
            isRead: false,
          };

          setHistory((prevHistory: HistoryItem[]) => [
            ...prevHistory,
            optimisticMessage,
          ]);

          try {
            // Enviar mensaje
            await api.post(`/conversations/${activeConversation.id}/messages`, {
              content,
            });
            // Socket notificará la actualización con el ID real
          } catch (error) {
            // Si falla, remover el mensaje optimista
            setHistory((prevHistory: HistoryItem[]) =>
              prevHistory.filter((m: HistoryItem) => m.id !== optimisticMessage.id)
            );
            throw error;
          }
        }
      } catch (error) {
        console.error('[useChatSession] Failed to send message', error);
        alert('❌ No se pudo enviar el mensaje.');
      } finally {
        setSending(false);
      }
    },
    [activeConversation]
  );

  // Función para cerrar conversación
  const closeConversation = useCallback(async () => {
    if (!activeConversation || activeConversation.status === 'CLOSED') return;

    setClosing(true);
    try {
      await api.post(`/conversations/${activeConversation.id}/close`, {});
      // El socket notificará la actualización
    } catch (error) {
      console.error('[useChatSession] Failed to close conversation', error);
    } finally {
      setClosing(false);
    }
  }, [activeConversation]);

  return {
    history,
    loading,
    sending,
    closing,
    sendMessage,
    closeConversation,
  };
}
