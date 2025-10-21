import { useState, useEffect, useMemo, useCallback } from 'react';
import { api, getAllChats } from '../services/api';
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
  const [allConversations, setAllConversations] = useState<
    ConversationSummary[]
  >([]);
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
        if (isMounted) setAllConversations(data || []);
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

  const unifiedConversations = useMemo(
    () => sortConversations(allConversations),
    [allConversations]
  );

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
