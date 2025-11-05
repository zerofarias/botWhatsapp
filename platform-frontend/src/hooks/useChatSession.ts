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
  const flowStartedRef = useRef<Set<string>>(new Set()); // Track conversations where flow was started

  // Reset loading state cuando se monta el hook
  useEffect(() => {
    isMountedRef.current = true;
    loadingInProgressRef.current = false;

    return () => {
      isMountedRef.current = false;
      loadingInProgressRef.current = false;
      flowStartedRef.current.clear(); // Limpiar flows iniciados
    };
  }, []);

  // Función centralizada para cargar historial sin duplicación
  const loadHistoryOnce = useCallback(async (phoneNumber: string) => {
    // Evitar múltiples peticiones simultáneas
    if (loadingInProgressRef.current) {
      console.log('[useChatSession] Load already in progress, skipping');
      return;
    }

    console.log('[useChatSession] Loading history for:', phoneNumber);
    loadingInProgressRef.current = true;

    try {
      const fullHistory = await getCombinedHistory(phoneNumber);
      if (isMountedRef.current) {
        console.log(
          '[useChatSession] History loaded:',
          fullHistory?.length,
          'items'
        );
        setHistory(fullHistory || []);
      }
    } catch (error) {
      console.error('[useChatSession] Failed to fetch combined history', error);
      // En caso de error, asegurar que el estado se resetee
      if (isMountedRef.current) {
        setHistory([]);
      }
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

    console.log(
      '[useChatSession] Loading conversation:',
      activeConversation.id,
      'botActive:',
      activeConversation.botActive
    );
    setLoading(true);

    // Marcar como leído y cargar historial en paralelo
    Promise.all([
      markAllMessagesAsReadByPhone(activeConversation.userPhone).catch(
        (error) => {
          console.warn('[useChatSession] Failed to mark as read:', error);
        }
      ),
      loadHistoryOnce(activeConversation.userPhone),
    ]).finally(() => {
      if (isMountedRef.current) {
        console.log('[useChatSession] Finished loading conversation data');
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

    // Listener para nuevos mensajes - actualización incremental
    const onMessage = (payload: {
      id: string;
      conversationId: string;
      senderType: string;
      senderId: string | null;
      content: string;
      mediaType: string | null;
      mediaUrl: string | null;
      createdAt: string;
    }) => {
      if (payload.conversationId === activeConversation.id) {
        console.log(
          '[useChatSession] Received message:new event for message:',
          payload.id
        );

        // Agregar el mensaje al historial existente en lugar de recargar todo
        const newHistoryItem: HistoryItem = {
          type: 'message',
          id: payload.id,
          conversationId: payload.conversationId,
          senderType: payload.senderType as 'CONTACT' | 'BOT' | 'OPERATOR',
          senderId: payload.senderId ? Number(payload.senderId) : null,
          content: payload.content,
          mediaType: payload.mediaType,
          mediaUrl: payload.mediaUrl,
          externalId: null, // No disponible en el evento
          isDelivered: true,
          isRead: false, // Asumimos que no está leído inicialmente
          createdAt: payload.createdAt,
        };

        setHistory((prev) => {
          // Verificación más robusta de duplicados
          const exists = prev.some(
            (item) =>
              item.type === 'message' &&
              (item.id === payload.id ||
                (item.content === payload.content &&
                  item.senderType === payload.senderType &&
                  Math.abs(
                    new Date(item.createdAt).getTime() -
                      new Date(payload.createdAt).getTime()
                  ) < 1000))
          );

          if (exists) {
            console.log(
              '[useChatSession] Duplicate message detected, ignoring:',
              payload.id
            );
            return prev;
          }

          console.log(
            '[useChatSession] Adding new message to history:',
            payload.id
          );
          const sortedHistory = [...prev, newHistoryItem].sort((a, b) => {
            const aTime = a.type === 'label' ? a.timestamp : a.createdAt;
            const bTime = b.type === 'label' ? b.timestamp : b.createdAt;
            return new Date(aTime).getTime() - new Date(bTime).getTime();
          });
          return sortedHistory;
        });
      }
    };

    // Listener para takeover - solo actualizar si realmente cambia el estado
    const onTake = (payload: {
      conversationId: string;
      assignedTo: number;
      botActive: boolean;
    }) => {
      if (payload.conversationId === activeConversation.id) {
        console.log('[useChatSession] Conversation taken over:', payload);
        // Evitar recargas innecesarias - solo si hay cambio real
        const stateChanged =
          payload.botActive !== activeConversation.botActive ||
          payload.assignedTo !== activeConversation.assignedTo?.id;

        if (stateChanged) {
          console.log(
            '[useChatSession] State actually changed, reloading history'
          );
          loadHistoryOnce(activeConversation.userPhone);
        } else {
          console.log(
            '[useChatSession] No significant state change, skipping reload'
          );
        }
      }
    };

    // Listener para finish - siempre recargar para estado final
    const onFinish = (payload: {
      conversationId: string;
      status: string;
      reason: string;
    }) => {
      if (payload.conversationId === activeConversation.id) {
        console.log(
          '[useChatSession] Conversation finished, reloading final state'
        );
        loadHistoryOnce(activeConversation.userPhone);
      }
    };

    // Listener consolidado para actualizaciones (incluyendo END node)
    const onConversationUpdate = (payload: {
      id?: string;
      conversationId?: string;
      botActive?: boolean;
      status?: string;
      assignedTo?: number;
      [key: string]: unknown;
    }) => {
      const payloadId = payload.id || payload.conversationId;
      if (payloadId === activeConversation.id) {
        console.log('[useChatSession] Conversation update received:', {
          botActive: payload.botActive,
          status: payload.status,
          assignedTo: payload.assignedTo,
        });

        // Solo recargar si hay cambios significativos
        const significantChanges =
          payload.status === 'CLOSED' ||
          payload.status === 'FINISHED' ||
          (payload.botActive !== undefined &&
            payload.botActive !== activeConversation.botActive) ||
          (payload.assignedTo !== undefined &&
            payload.assignedTo !== activeConversation.assignedTo?.id);

        if (significantChanges) {
          console.log(
            '[useChatSession] Significant change detected, reloading history'
          );
          loadHistoryOnce(activeConversation.userPhone);
        } else {
          console.log('[useChatSession] Minor update, skipping history reload');
        }
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

  // Efecto 3: Iniciar flujo automáticamente si es necesario (solo una vez por conversación)
  useEffect(() => {
    if (!activeConversation) return;

    const conversationKey = `${activeConversation.id}_${activeConversation.botActive}`;

    if (
      activeConversation.botActive &&
      !activeConversation.assignedTo &&
      !flowStartedRef.current.has(conversationKey)
    ) {
      flowStartedRef.current.add(conversationKey);

      startConversationFlow(activeConversation.id)
        .then(() => {
          console.log(
            '[useChatSession] Flow started for conversation',
            activeConversation.id
          );
          // NO recargar historial aquí - ya se cargó en el efecto principal
        })
        .catch((error) => {
          console.error('[useChatSession] Error starting flow:', error);
          // Remover de la lista si falló para permitir reintento
          flowStartedRef.current.delete(conversationKey);
        });
    }
  }, [activeConversation]);

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
              prevHistory.filter(
                (m: HistoryItem) => m.id !== optimisticMessage.id
              )
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
