/**
 * useGroupedConversations v2 - Group conversations by phone number
 * Similar to WhatsApp's chat list where multiple chats from same number are grouped
 */

import { useMemo, useState, useCallback, useEffect } from 'react';
import { ConversationSummary } from '../../types/chat';
import { api } from '../../services/api';

export interface PhoneGroup {
  phoneNumber: string;
  displayNumber: string; // Formatted phone number
  conversations: ConversationSummary[];
  unreadCount: number;
  lastActivity: string; // ISO timestamp of most recent conversation
}

/**
 * Format phone number for display (simple version)
 * Can be enhanced with better formatting like libphonenumber-js
 */
function formatPhoneNumber(phone: string): string {
  // Remove +, spaces, dashes for comparison but keep formatted for display
  const cleaned = phone.replace(/[^\d]/g, '');

  // If already has country code, keep it formatted
  if (phone.includes('+')) {
    // Try to format: +54 9 11 1234-5678
    const match = phone.match(/^\+(\d{1,3})\s?(\d{1,4})\s?(\d{4,})$/);
    if (match) {
      return `+${match[1]} ${match[2]} ${match[3]}`;
    }
  }

  // Fallback: return as-is
  return phone;
}

export function useGroupedConversations() {
  const [conversationData, setConversationData] = useState<
    ConversationSummary[]
  >([]);
  const [loading, setLoading] = useState(false);

  // Track which phone groups are expanded (by phone number)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set() // All collapsed by default
  );

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/conversations');
      const data = Array.isArray(response.data) ? response.data : [];
      setConversationData(data);
    } catch (error) {
      console.error('Error loading conversations for grouping:', error);
      setConversationData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load conversations initially
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Listen for multiple refresh events
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handler = () => {
      loadConversations();
    };
    
    // Listen to ALL the refresh events that might indicate new conversations
    window.addEventListener('chat:refresh-conversations', handler);
    window.addEventListener('chat:messageReceived', handler);
    window.addEventListener('chat:conversationUpdated', handler);
    window.addEventListener('chat:conversationListRefresh', handler);
    
    return () => {
      window.removeEventListener('chat:refresh-conversations', handler);
      window.removeEventListener('chat:messageReceived', handler);
      window.removeEventListener('chat:conversationUpdated', handler);
      window.removeEventListener('chat:conversationListRefresh', handler);
    };
  }, [loadConversations]);

  // Group conversations by phone number
  const groupedConversations = useMemo(() => {
    const groups = new Map<string, PhoneGroup>();

    conversationData.forEach((conv) => {
      const phone = conv.userPhone || 'Unknown';
      const contactName = conv.contact?.name?.trim();
      const formattedPhone = formatPhoneNumber(phone);

      if (!groups.has(phone)) {
        groups.set(phone, {
          phoneNumber: phone,
          displayNumber: contactName || formattedPhone,
          conversations: [],
          unreadCount: 0,
          lastActivity: '',
        });
      }

      const group = groups.get(phone)!;
      group.conversations.push(conv);

      // Prefer mostrar el nombre del contacto si estÃ¡ agendado
      if (contactName) {
        group.displayNumber = contactName;
      }

      // Update last activity timestamp (use the most recent)
      const convActivity = new Date(
        conv.updatedAt || conv.lastActivity
      ).getTime();
      const groupActivity = group.lastActivity
        ? new Date(group.lastActivity).getTime()
        : 0;

      if (convActivity > groupActivity) {
        group.lastActivity = conv.updatedAt || conv.lastActivity;
      }
    });

    // Convert to array and sort by last activity (most recent first)
    return Array.from(groups.values()).sort((a, b) => {
      const aTime = new Date(a.lastActivity).getTime();
      const bTime = new Date(b.lastActivity).getTime();
      return bTime - aTime; // Descending (most recent first)
    });
  }, [conversationData]);

  // Toggle group expansion
  const toggleGroup = useCallback((phoneNumber: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(phoneNumber)) {
        next.delete(phoneNumber);
      } else {
        next.add(phoneNumber);
      }
      return next;
    });
  }, []);

  // Get conversations for a specific phone group
  const getGroupConversations = useCallback(
    (phoneNumber: string) => {
      const group = groupedConversations.find(
        (g) => g.phoneNumber === phoneNumber
      );
      return group?.conversations || [];
    },
    [groupedConversations]
  );

  // Check if a group is expanded
  const isGroupExpanded = useCallback(
    (phoneNumber: string) => expandedGroups.has(phoneNumber),
    [expandedGroups]
  );

  // Expand all groups
  const expandAllGroups = useCallback(() => {
    setExpandedGroups(new Set(groupedConversations.map((g) => g.phoneNumber)));
  }, [groupedConversations]);

  // Collapse all groups
  const collapseAllGroups = useCallback(() => {
    setExpandedGroups(new Set());
  }, []);

  return {
    groupedConversations,
    expandedGroups,
    toggleGroup,
    getGroupConversations,
    isGroupExpanded,
    expandAllGroups,
    collapseAllGroups,
    loading,
  };
}
