/**
 * GroupedConversationList_v2 - WhatsApp-style conversation groups
 * Displays conversations grouped by phone number with expand/collapse
 */

import React from 'react';
import {
  useGroupedConversations,
  PhoneGroup,
} from '../../hooks/v2/useGroupedConversations';
import { useChatStore } from '../../store/chatStore';
import './GroupedConversationList_v2.css';

interface Props {
  onSelectConversation?: (conversationId: number | string) => void;
}

/**
 * PhoneGroupHeader - Displays phone number with expand/collapse toggle
 */
const PhoneGroupHeader: React.FC<{
  group: PhoneGroup;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ group, isExpanded, onToggle }) => (
  <div className="phone-group-header" onClick={onToggle}>
    <button className="expand-toggle" type="button">
      <span className={`arrow ${isExpanded ? 'expanded' : ''}`}>
        {isExpanded ? '▾' : '▸'}
      </span>
    </button>
    <div className="phone-info">
      <span className="phone-number">{group.displayNumber}</span>
      <span className="conversation-count">
        {group.conversations.length}{' '}
        {group.conversations.length === 1 ? 'chat' : 'chats'}
      </span>
    </div>
  </div>
);

const formatPhone = (value?: string | null) => {
  if (!value) return 'Sin número';
  return value.includes('@') ? value.replace(/@.+$/, '') : value;
};

/**
 * ConversationListItem - Single conversation within a group
 */
const ConversationListItem: React.FC<{
  conversation: any; // ConversationSummary
  isActive: boolean;
  onClick: () => void;
}> = ({ conversation, isActive, onClick }) => {
  const cleanPhone = formatPhone(
    conversation.contact?.phone || conversation.userPhone
  );
  const displayName =
    conversation.contact?.name?.trim() || cleanPhone || 'Sin número';
  const isContactSaved = Boolean(conversation.contact?.name?.trim());

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
        isContactSaved ? 'contact-saved' : 'contact-unsaved'
      }`}
      onClick={onClick}
    >
      <div className="conversation-avatar">
        {conversation.contact?.photoUrl ? (
          <img src={conversation.contact.photoUrl} alt={displayName} />
        ) : (
          <div className="avatar-placeholder">
            {displayName.charAt(0).toUpperCase()}
            {isContactSaved && <span className="contact-badge">★</span>}
          </div>
        )}
      </div>
      <div className="conversation-content">
        <div className="conversation-header">
          <div className="contact-info">
            <span
              className={`contact-name ${isContactSaved ? 'saved' : 'unsaved'}`}
            >
              {displayName}
            </span>
            {isContactSaved && displayName !== cleanPhone && (
              <span className="phone-subtitle">{cleanPhone}</span>
            )}
            {!isContactSaved && (
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
    </div>
  );
};

/**
 * Main component
 */
export const GroupedConversationList_v2: React.FC<Props> = ({
  onSelectConversation,
}) => {
  const { groupedConversations, isGroupExpanded, toggleGroup, loading } =
    useGroupedConversations();

  const activeConversationId = useChatStore(
    (state) => state.activeConversationId
  );

  const handleSelectConversation = (conversationId: number | string) => {
    const id =
      typeof conversationId === 'string'
        ? parseInt(conversationId, 10)
        : conversationId;
    useChatStore.setState({ activeConversationId: id });
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
      {groupedConversations.map((group) => (
        <div key={group.phoneNumber} className="phone-group">
          <PhoneGroupHeader
            group={group}
            isExpanded={isGroupExpanded(group.phoneNumber)}
            onToggle={() => toggleGroup(group.phoneNumber)}
          />
          {isGroupExpanded(group.phoneNumber) && (
            <div className="phone-group-content">
              {group.conversations.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={
                    activeConversationId ===
                    (typeof conversation.id === 'string'
                      ? parseInt(conversation.id, 10)
                      : conversation.id)
                  }
                  onClick={() => handleSelectConversation(conversation.id)}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default GroupedConversationList_v2;
