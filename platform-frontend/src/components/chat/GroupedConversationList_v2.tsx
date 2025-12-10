/**
 * GroupedConversationList_v2 - simplified list that shows one entry per contacto/teléfono
 */

import React from 'react';
import { useGroupedConversations } from '../../hooks/v2/useGroupedConversations';
import { useChatStore } from '../../store/chatStore';
import './GroupedConversationList_v2.css';

interface Props {
  onSelectConversation?: (conversationId: number | string) => void;
}

const formatPhone = (value?: string | null) => {
  if (!value) return 'Sin número';
  return value.includes('@') ? value.replace(/@.+$/, '') : value;
};

const getLatestConversation = (conversations: any[]) => {
  if (!conversations.length) return null;
  return [...conversations].sort(
    (a, b) =>
      new Date(b.updatedAt || b.lastActivity || 0).getTime() -
      new Date(a.updatedAt || a.lastActivity || 0).getTime()
  )[0];
};

type ConversationListItemProps = {
  conversation: any;
  isActive: boolean;
  onClick: () => void;
  groupCount?: number;
  displayLabel?: string;
  fallbackPhone?: string;
  hasUnreadIndicator?: boolean;
};

const ConversationListItem: React.FC<ConversationListItemProps> = ({
  conversation,
  isActive,
  onClick,
  groupCount = 1,
  displayLabel,
  fallbackPhone,
  hasUnreadIndicator = false,
}) => {
  const cleanPhone = formatPhone(
    conversation.contact?.phone || conversation.userPhone || fallbackPhone
  );
  const hasCustomName =
    Boolean(displayLabel?.trim()) ||
    Boolean(conversation.contact?.name?.trim());
  const displayName =
    displayLabel?.trim() ||
    conversation.contact?.name?.trim() ||
    cleanPhone ||
    'Sin número';

  const lastMessage =
    conversation.lastMessage?.content ||
    conversation.lastMessage ||
    'Sin mensajes';

  const timestamp = new Date(
    conversation.lastActivity || conversation.updatedAt
  ).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`conversation-item ${isActive ? 'active' : ''} ${
        hasCustomName ? 'contact-saved' : 'contact-unsaved'
      }`}
      onClick={onClick}
    >
      <div className="conversation-avatar">
        {conversation.contact?.photoUrl ? (
          <img src={conversation.contact.photoUrl} alt={displayName} />
        ) : (
          <div className="avatar-placeholder">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        {/* Status Icons on avatar corner */}
        {(conversation.contact?.isVip ||
          conversation.contact?.isProblematic ||
          conversation.contact?.isChronic) && (
          <span className="avatar-status-icons">
            {conversation.contact?.isVip && <span title="VIP">⭐</span>}
            {conversation.contact?.isProblematic && <span title="Problemático">⚠️</span>}
            {conversation.contact?.isChronic && <span title="Crónico">💊</span>}
          </span>
        )}
      </div>
      <div className="conversation-content">
        <div className="conversation-header">
          <div className="contact-info">
            <span
              className={`contact-name ${hasCustomName ? 'saved' : 'unsaved'}`}
            >
              {displayName}
            </span>
            {groupCount > 1 && (
              <span className="conversation-count-badge">
                {groupCount} chats
              </span>
            )}
            {hasCustomName && cleanPhone && displayName !== cleanPhone && (
              <span className="phone-subtitle">{cleanPhone}</span>
            )}
            {!hasCustomName && cleanPhone && (
              <span className="phone-main">{cleanPhone}</span>
            )}
          </div>
          <span className="timestamp">{timestamp}</span>
        </div>
        <div className="last-message">{lastMessage}</div>
      </div>
      {conversation.unreadCount > 0 && (
        <div className="unread-badge">{conversation.unreadCount}</div>
      )}
      {hasUnreadIndicator && !conversation.unreadCount && (
        <div className="unread-dot" title="Nuevo mensaje"></div>
      )}
    </div>
  );
};

export const GroupedConversationList_v2: React.FC<Props> = ({
  onSelectConversation,
}) => {
  const { groupedConversations, loading } = useGroupedConversations();

  const activeConversationId = useChatStore(
    (state) => state.activeConversationId
  );
  
  // Get unread conversations set for red dot indicator
  const unreadConversations = useChatStore(
    (state) => state.unreadConversations
  );

  const handleSelectConversation = (conversationId: number | string) => {
    const id =
      typeof conversationId === 'string'
        ? parseInt(conversationId, 10)
        : conversationId;
    // Use setActiveConversation which also clears unread status
    useChatStore.getState().setActiveConversation(id);
    onSelectConversation?.(id);
  };

  if (loading) {
    return (
      <div className="grouped-conversation-list loading">
        Cargando conversaciones...
      </div>
    );
  }

  if (groupedConversations.length === 0) {
    return (
      <div className="grouped-conversation-list empty">
        No hay conversaciones
      </div>
    );
  }

  return (
    <div className="grouped-conversation-list">
      {groupedConversations.map((group) => {
        const primaryConversation = getLatestConversation(group.conversations);
        if (!primaryConversation) {
          return null;
        }
        const groupHasActive = group.conversations.some(
          (conversation) =>
            activeConversationId ===
            (typeof conversation.id === 'string'
              ? parseInt(conversation.id, 10)
              : conversation.id)
        );
        
        // Check if any conversation in this group has unread messages
        const groupHasUnread = group.conversations.some((conversation) => {
          const convId = typeof conversation.id === 'string'
            ? parseInt(conversation.id, 10)
            : conversation.id;
          return unreadConversations.has(convId);
        });

        return (
          <div key={group.phoneNumber} className="phone-group single-entry">
            <ConversationListItem
              conversation={primaryConversation}
              isActive={groupHasActive}
              onClick={() => handleSelectConversation(primaryConversation.id)}
              groupCount={group.conversations.length}
              displayLabel={group.displayNumber}
              fallbackPhone={group.phoneNumber}
              hasUnreadIndicator={groupHasUnread}
            />
          </div>
        );
      })}
    </div>
  );
};

export default GroupedConversationList_v2;
