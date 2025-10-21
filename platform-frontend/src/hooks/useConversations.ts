import { useState, useEffect, useMemo, useCallback } from 'react';
import { api, getAllChatsByPhone } from '../services/api';
import { useSocket } from './useSocket';
import { useAuth } from '../context/AuthContext';
import type { ConversationSummary, ConversationMessage } from '../types/chat';

function sortConversations(items: ConversationSummary[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );
}

export function useConversations(userPhone?: string) {
  const { user, loading: authLoading } = useAuth();
  const socket = useSocket();
  const [abiertos, setAbiertos] = useState<ConversationSummary[]>([]);
  const [cerrados, setCerrados] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (authLoading || !userPhone) {
      return;
    }

    let isMounted = true;
    setLoading(true);

    getAllChatsByPhone(userPhone)
      .then((data) => {
        if (isMounted) {
          setAbiertos(data.abiertos || []);
          setCerrados(data.cerrados || []);
        }
      })
      .catch((error) =>
        console.error('[useConversations] Failed to fetch', error)
      )
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userPhone, authLoading]);

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

  useEffect(() => {
    if (!socket) return;

    const handleConversationUpdate = (payload: ConversationSummary) => {
      setAbiertos((prev) => {
        const filtered = prev.filter((item) => item.id !== payload.id);
        if (!matchesFilter(payload)) {
          return filtered;
        }
        filtered.push(payload);
        return sortConversations(filtered);
      });
    };

    const handleNewMessage = (payload: ConversationMessage) => {
      setAbiertos((prev) => {
        const convIndex = prev.findIndex(
          (c) => c.id === payload.conversationId
        );
        if (convIndex === -1) return prev;
        const updatedConv = {
          ...prev[convIndex],
          lastMessage: { ...payload },
          lastActivity: payload.createdAt,
        };
        const without = prev.filter((c) => c.id !== payload.conversationId);
        return sortConversations([updatedConv, ...without]);
      });
      setUnread((prev) => new Set(prev).add(payload.conversationId));
    };

    socket.on('conversation:update', handleConversationUpdate);
    socket.on('message:new', handleNewMessage);
    socket.on('message:update', handleNewMessage);

    return () => {
      socket.off('conversation:update', handleConversationUpdate);
      socket.off('message:new', handleNewMessage);
      socket.off('message:update', handleNewMessage);
    };
  }, [socket, matchesFilter]);

  const unifiedConversations = useMemo(() => {
    const allConversations = [...abiertos, ...cerrados];

    const conversationsByPhone = new Map<string, ConversationSummary>();

    for (const conv of allConversations) {
      const key = conv.userPhone;
      const existing = conversationsByPhone.get(key);

      if (
        !existing ||
        new Date(conv.lastActivity) > new Date(existing.lastActivity)
      ) {
        conversationsByPhone.set(key, conv);
      }
    }

    const unified = Array.from(conversationsByPhone.values());
    return sortConversations(unified);
  }, [abiertos, cerrados]);

  const filteredConversations = useMemo(() => {
    const base = unifiedConversations.filter(matchesFilter);
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
  }, [unifiedConversations, searchTerm, matchesFilter]);

  return {
    loading,
    conversations: filteredConversations,
    unread,
    setUnread,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  };
}
