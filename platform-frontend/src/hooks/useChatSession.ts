import { markAllMessagesAsReadByPhone } from '../services/api';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { HistoryItem } from '../types/chat';
import { useSocket } from './useSocket';
import {
  api,
  createConversationNote,
  getCombinedHistory,
  getSingleConversationHistory,
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
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flowStartedRef = useRef<Set<string>>(new Set()); // Track conversations where flow was started

  // Batch processing para múltiples mensajes
  const messageQueueRef = useRef<HistoryItem[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const BATCH_DELAY = 50; // ms - agrupa mensajes que llegan en 50ms

  // Reset loading state cuando se monta el hook
  useEffect(() => {
    isMountedRef.current = true;
    loadingInProgressRef.current = false;

    return () => {
      isMountedRef.current = false;
      loadingInProgressRef.current = false;
      flowStartedRef.current.clear(); // Limpiar flows iniciados
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  // Función para procesar el lote de mensajes acumulados
  const processBatch = useCallback(() => {
    if (messageQueueRef.current.length === 0) return;

    const batch = messageQueueRef.current.splice(0);
    console.log(
      `[useChatSession] 🔄 Processing batch of ${batch.length} messages`
    );

    setHistory((prev) => {
      // Crear mapa de IDs existentes para detección rápida de duplicados
      const existingIds = new Set<string>();
      const existingContent = new Map<string, number>(); // content_hash -> timestamp

      prev.forEach((item) => {
        if (item.type === 'message') {
          if (item.id) existingIds.add(item.id);
          const key = `${item.senderType}_${item.content}`;
          existingContent.set(key, new Date(item.createdAt).getTime());
        }
      });

      // Filtrar duplicados del batch
      const uniqueNew = batch.filter((newItem) => {
        // Solo procesar items de mensaje
        if (newItem.type !== 'message') return true;

        if (newItem.id && existingIds.has(newItem.id)) {
          console.log(
            '[useChatSession] Skipping duplicate (by ID):',
            newItem.id
          );
          return false;
        }

        // Verificar contenido duplicado (mismo mensaje en <1s)
        const key = `${newItem.senderType}_${newItem.content}`;
        const existingTime = existingContent.get(key);
        if (
          existingTime &&
          Math.abs(new Date(newItem.createdAt).getTime() - existingTime) < 1000
        ) {
          console.log('[useChatSession] Skipping duplicate (by content):', key);
          return false;
        }

        if (newItem.id) existingIds.add(newItem.id);
        return true;
      });

      if (uniqueNew.length === 0) {
        console.log(
          '[useChatSession] ⚠️ All messages in batch were duplicates'
        );
        return prev;
      }

      // Agregar nuevos mensajes y sortear UNA SOLA VEZ
      const merged = [...prev, ...uniqueNew];
      const sorted = merged.sort((a, b) => {
        const aTime = a.type === 'label' ? a.timestamp : a.createdAt;
        const bTime = b.type === 'label' ? b.timestamp : b.createdAt;
        return new Date(aTime).getTime() - new Date(bTime).getTime();
      });

      console.log(
        `[useChatSession] ✅ Added ${uniqueNew.length} messages, history now has ${sorted.length} items`
      );
      return sorted;
    });

    batchTimeoutRef.current = null;
  }, []);

  // Limpiar timeout si el componente se desmonta
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      messageQueueRef.current = [];
    };
  }, []);

  // Función centralizada para cargar historial sin duplicación
  const loadHistoryOnce = useCallback(
    async (phoneNumber: string, conversationId?: string) => {
      // Evitar múltiples peticiones simultáneas
      if (loadingInProgressRef.current) {
        console.log('[useChatSession] Load already in progress, skipping');
        return;
      }

      console.log(
        '[useChatSession] Loading history for:',
        phoneNumber,
        'conversationId:',
        conversationId
      );
      loadingInProgressRef.current = true;
      setLoading(true);

      // Timeout de seguridad para resetear el flag si la request tarda mucho
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = setTimeout(() => {
        console.warn(
          '[useChatSession] ⚠️ Load timeout - forcefully resetting loading state'
        );
        loadingInProgressRef.current = false;
        setLoading(false);
        loadTimeoutRef.current = null;
      }, 10000); // 10 segundos de timeout

      try {
        // Si tenemos el ID de conversación, usar el endpoint específico
        // De lo contrario, cargar historial combinado (legacy)
        const fullHistory = conversationId
          ? await getSingleConversationHistory(conversationId)
          : await getCombinedHistory(phoneNumber);

        if (isMountedRef.current) {
          console.log(
            '[useChatSession] History loaded:',
            fullHistory?.length,
            'items'
          );
          setHistory(fullHistory || []);
        }
      } catch (error) {
        console.error('[useChatSession] Failed to fetch history', error);
        // En caso de error, asegurar que el estado se resetee
        if (isMountedRef.current) {
          setHistory([]);
        }
      } finally {
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }
        loadingInProgressRef.current = false;
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Efecto 1: Cargar datos iniciales de la conversación
  useEffect(() => {
    if (!activeConversation) {
      setHistory([]);
      setLoading(false);
      return;
    }

    console.log(
      '[useChatSession] Loading conversation:',
      activeConversation.id,
      'botActive:',
      activeConversation.botActive
    );

    // Marcar como leído y cargar historial en paralelo
    markAllMessagesAsReadByPhone(activeConversation.userPhone).catch(
      (error) => {
        console.warn('[useChatSession] Failed to mark as read:', error);
      }
    );

    loadHistoryOnce(activeConversation.userPhone, activeConversation.id);

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

    // Listener para nuevos mensajes - batch processing
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
          '[useChatSession] 📨 Received message:new event for message:',
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

        // Agregar a la cola en lugar de procesar inmediatamente
        messageQueueRef.current.push(newHistoryItem);
        console.log(
          `[useChatSession] 📦 Message queued. Queue size: ${messageQueueRef.current.length}`
        );

        // Si ya hay un timeout pendiente, no crear uno nuevo
        if (batchTimeoutRef.current) {
          console.log('[useChatSession] Timeout ya pendiente, no crear nuevo');
          return;
        }

        // Crear nuevo timeout para procesar el batch
        batchTimeoutRef.current = setTimeout(() => {
          console.log('[useChatSession] ⏰ Batch timeout triggered');
          processBatch();
        }, BATCH_DELAY);
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
          loadHistoryOnce(activeConversation.userPhone, activeConversation.id);
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
        loadHistoryOnce(activeConversation.userPhone, activeConversation.id);
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
          loadHistoryOnce(activeConversation.userPhone, activeConversation.id);
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
      // Limpiar timeout pendiente
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
    };
  }, [activeConversation, socket, loadHistoryOnce, processBatch]);

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
          // 404 es esperado si no hay flujo asignado - no es un error real
          if (error?.response?.status !== 404) {
            console.error('[useChatSession] Error starting flow:', error);
          }
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
      console.log('[useChatSession] 📨 sendMessage called with:', {
        content,
        isNote,
      });
      if (!activeConversation) {
        console.error('[useChatSession] No active conversation');
        return;
      }

      setSending(true);
      console.log('[useChatSession] 📤 setSending(true)');
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
          console.log('[useChatSession] ✅ Note sent');
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
            console.log('[useChatSession] 🚀 Sending message via API...');
            const sendStartTime = Date.now();

            // Crear promise con timeout
            const sendPromise = api.post(
              `/conversations/${activeConversation.id}/messages`,
              { content }
            );

            const timeoutPromise = new Promise(
              (_, reject) =>
                setTimeout(() => {
                  const elapsed = Date.now() - sendStartTime;
                  reject(
                    new Error(
                      `Send timeout after ${elapsed}ms - API not responding`
                    )
                  );
                }, 20000) // 20 segundos de timeout
            );

            // Usar Promise.race para aplicar timeout
            await Promise.race([sendPromise, timeoutPromise]);
            const elapsed = Date.now() - sendStartTime;
            console.log(
              `[useChatSession] ✅ Message sent via API in ${elapsed}ms`
            );
            // Socket notificará la actualización con el ID real
          } catch (error) {
            console.error('[useChatSession] ❌ API error:', error);
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
        console.error('[useChatSession] ❌ Failed to send message', error);
        alert('❌ No se pudo enviar el mensaje.');
      } finally {
        console.log('[useChatSession] 📤 Finally block: setting sending=false');
        setSending(false);
        console.log('[useChatSession] 📤 setSending(false) called');
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
