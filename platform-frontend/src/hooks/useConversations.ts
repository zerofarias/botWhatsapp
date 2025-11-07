import { useState, useEffect, useMemo, useCallback } from 'react';
import { api, getAllChats, getAllChatsByPhone } from '../services/api';
import { useSocket } from './useSocket';
import { useAuth } from '../context/AuthContext';
import type { ConversationSummary, ConversationMessage } from '../types/chat';

function sortConversations(items: ConversationSummary[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );
}

export function useConversations() {
  const { user, loading: authLoading } = useAuth();
  const socket = useSocket();
  const [abiertas, setAbiertas] = useState<ConversationSummary[]>([]);
  const [cerradas, setCerradas] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (authLoading) return;
    let isMounted = true;
    setLoading(true);
    getAllChats()
      .then((data) => {
        if (isMounted) {
          // Agrupar por abiertas/cerradas
          const abiertas = [];
          const cerradas = [];
          for (const conv of data || []) {
            if (
              conv.status === 'ACTIVE' ||
              conv.status === 'PENDING' ||
              conv.status === 'PAUSED'
            ) {
              abiertas.push(conv);
            } else if (conv.status === 'CLOSED') {
              cerradas.push(conv);
            }
          }
          setAbiertas(abiertas);
          setCerradas(cerradas);
        }
      })
      .catch((error) =>
        console.error('[useConversations] Failed to fetch', error)
      )
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [authLoading]);

  const matchesFilter = useCallback(
    (conversation: ConversationSummary) => {
      if (filter === 'all') return true;
      if (filter === 'mine') return conversation.assignedTo?.id === user?.id;
      if (filter === 'unassigned') return !conversation.assignedTo;
      if (filter === 'pending') return conversation.status === 'PENDING';
      if (filter === 'active') return conversation.status === 'ACTIVE';
      if (filter === 'closed') return conversation.status === 'CLOSED';
      return true;
    },
    [filter, user]
  );

  const abiertasFiltradas = useMemo(() => {
    const base = sortConversations(abiertas).filter(matchesFilter);
    if (!searchTerm.trim()) return base;
    const normalized = searchTerm.trim().toLowerCase();
    return base.filter((c) => {
      const name = c.contact?.name ?? c.contactName ?? '';
      const phone = c.userPhone;
      return (
        name.toLowerCase().includes(normalized) ||
        phone.toLowerCase().includes(normalized)
      );
    });
  }, [abiertas, searchTerm, matchesFilter]);

  const cerradasFiltradas = useMemo(() => {
    const base = sortConversations(cerradas).filter(matchesFilter);
    if (!searchTerm.trim()) return base;
    const normalized = searchTerm.trim().toLowerCase();
    return base.filter((c) => {
      const name = c.contact?.name ?? c.contactName ?? '';
      const phone = c.userPhone;
      return (
        name.toLowerCase().includes(normalized) ||
        phone.toLowerCase().includes(normalized)
      );
    });
  }, [cerradas, searchTerm, matchesFilter]);

  // Listener para actualizar la lista cuando la conversación cambia (ej: bot desactivado en END node)
  useEffect(() => {
    if (!socket) return;

    const handleConversationUpdate = (
      updatedConversation: ConversationSummary
    ) => {
      console.log(
        '[useConversations] Conversation updated:',
        updatedConversation.id,
        'botActive:',
        updatedConversation.botActive
      );

      setAbiertas((prev) => {
        const idx = prev.findIndex((c) => c.id === updatedConversation.id);
        if (idx === -1) {
          // ✅ CONVERSACIÓN NO EXISTE - CREARLA
          // Esto sucede cuando llega un mensaje de un número nuevo
          console.log(
            '[useConversations] ✅ NUEVA CONVERSACIÓN (no estaba en lista):',
            updatedConversation.id,
            'Agregando...'
          );
          const updated = [updatedConversation, ...prev];
          return sortConversations(updated);
        }

        // Conversación existe - actualizar
        const updated = [...prev];
        updated[idx] = updatedConversation;
        return updated;
      });

      setCerradas((prev) => {
        const idx = prev.findIndex((c) => c.id === updatedConversation.id);
        if (idx === -1) return prev;

        // Crear nueva lista con la conversación actualizada
        const updated = [...prev];
        updated[idx] = updatedConversation;
        return updated;
      });
    };

    const handleConversationTake = (payload: {
      conversationId: string;
      assignedTo: number;
      assignedToName?: string;
      botActive: boolean;
    }) => {
      console.log('[useConversations] Conversation taken:', payload);

      const updateConversation = (prev: ConversationSummary[]) => {
        const idx = prev.findIndex((c) => c.id === payload.conversationId);
        if (idx === -1) return prev;

        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          assignedTo: {
            id: payload.assignedTo,
            name: payload.assignedToName || null,
          },
          botActive: payload.botActive,
        };
        return updated;
      };

      setAbiertas(updateConversation);
      setCerradas(updateConversation);
    };

    // Listener para nueva conversación creada (desde teléfono)
    const handleConversationNew = (payload: {
      conversation: ConversationSummary;
      source: string;
    }) => {
      console.log(
        '[useConversations] ✅ NEW CONVERSATION INCOMING:',
        payload.conversation.id,
        'status:',
        payload.conversation.status,
        'botActive:',
        payload.conversation.botActive,
        'from:',
        payload.source
      );

      // Agregar a la lista de abiertas si no existe
      setAbiertas((prev) => {
        const exists = prev.some((c) => c.id === payload.conversation.id);
        if (exists) {
          console.log(
            '[useConversations] Conversation already exists, updating'
          );
          return prev;
        }

        console.log(
          '[useConversations] ✅ Adding new conversation to list',
          payload.conversation.id
        );
        // Agregar al inicio y ordenar
        const updated = [payload.conversation, ...prev];
        return sortConversations(updated);
      });
    };

    // Listener para actualizar lastActivity cuando llega un nuevo mensaje
    const handleMessageNew = (payload: {
      id: string;
      conversationId: string;
    }) => {
      console.log(
        '[useConversations] Message received for conversation:',
        payload.conversationId
      );

      // Actualizar la conversación con el nuevo lastActivity
      const updateConversation = (prev: ConversationSummary[]) => {
        const idx = prev.findIndex((c) => c.id === payload.conversationId);
        if (idx === -1) return prev;

        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          lastActivity: new Date().toISOString(),
        };
        // Reordenar para poner esta conversación arriba
        return sortConversations(updated);
      };

      setAbiertas(updateConversation);
      setCerradas(updateConversation);
    };

    // Listener para cuando una conversación se cierra (finish)
    const handleConversationFinish = (payload: {
      conversationId: string;
      status: string;
      reason?: string;
    }) => {
      console.log(
        '[useConversations] Conversation finished:',
        payload.conversationId,
        'reason:',
        payload.reason
      );

      // Mover de abiertas a cerradas
      setAbiertas((prev) => {
        const idx = prev.findIndex((c) => c.id === payload.conversationId);
        if (idx === -1) return prev;

        // Remover de abiertas
        const filtered = prev.filter((c) => c.id !== payload.conversationId);
        return filtered;
      });

      setCerradas((prev) => {
        const exists = prev.some((c) => c.id === payload.conversationId);
        if (exists) {
          // Ya existe, solo actualizar estado
          const idx = prev.findIndex((c) => c.id === payload.conversationId);
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            status: 'CLOSED',
            botActive: false,
          };
          return updated;
        } else {
          // No existe, buscar en memory o crear entrada actualizada
          // Por ahora solo actualizar si existe
          return prev;
        }
      });
    };

    socket.on('conversation:update', handleConversationUpdate);
    socket.on('conversation:take', handleConversationTake);
    socket.on('conversation:new', handleConversationNew);
    socket.on('message:new', handleMessageNew);
    socket.on('conversation:finish', handleConversationFinish);

    // DEBUG: Escuchar TODOS los eventos para ver cuáles llegan
    const allEventsHandler = (data: unknown) => {
      console.log(
        '[useConversations] 🔔 EVENTO SOCKET RECIBIDO (catch-all):',
        data,
        'timestamp:',
        new Date().toISOString()
      );
    };
    socket.onAny?.(allEventsHandler);

    return () => {
      socket.off('conversation:update', handleConversationUpdate);
      socket.off('conversation:take', handleConversationTake);
      socket.off('conversation:new', handleConversationNew);
      socket.off('message:new', handleMessageNew);
      socket.off('conversation:finish', handleConversationFinish);
      socket.offAny?.(allEventsHandler);
    };
  }, [socket]);

  return {
    loading,
    abiertas: abiertasFiltradas,
    cerradas: cerradasFiltradas,
    unread,
    setUnread,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  };
}
