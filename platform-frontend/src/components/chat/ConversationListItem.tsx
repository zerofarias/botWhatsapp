import React from 'react';
import type { ConversationSummary } from '../../types/chat';

// Helper functions (can be moved to a utils file)
function getDisplayName(conversation: ConversationSummary) {
  const name = conversation.contact?.name ?? conversation.contactName ?? '';
  if (name.trim().length) {
    return name.trim();
  }
  return formatPhone(conversation.contact?.phone ?? conversation.userPhone);
}

function formatPhone(phone: string) {
  if (!phone) return '';
  if (!phone.includes('@')) {
    return phone;
  }
  return phone.replace(/@.+$/, '');
}

function buildLastMessagePreview(message: ConversationSummary['lastMessage']) {
  if (!message) return '';
  const prefix =
    message.senderType === 'OPERATOR'
      ? 'Tú: '
      : message.senderType === 'BOT'
      ? 'Bot: '
      : '';
  return `${prefix}${message.content}`.slice(0, 80);
}

function formatRelativeTimestamp(isoDate: string) {
  const date = new Date(isoDate);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString();
}

type ConversationListItemProps = {
  conversation: ConversationSummary;
  isActive: boolean;
  isUnread: boolean;
  onSelect: () => void;
};

const ConversationListItem: React.FC<ConversationListItemProps> = ({
  conversation,
  isActive,
  isUnread,
  onSelect,
}) => {
  const lastMessageText = conversation.lastMessage
    ? buildLastMessagePreview(conversation.lastMessage)
    : 'Sin mensajes';

  const displayName = getDisplayName(conversation);

  return (
    <button
      type="button"
      className={`conversation-item${
        isActive ? ' conversation-item--active' : ''
      }`}
      onClick={onSelect}
    >
      <div className="conversation-item-avatar">
        {displayName.charAt(0).toUpperCase()}
      </div>
      <div className="conversation-item-content">
        <div className="conversation-item-header">
          <span className="conversation-item-name">{displayName}</span>
          <span className="conversation-item-time">
            {formatRelativeTimestamp(conversation.lastActivity)}
          </span>
        </div>
        <div className="conversation-item-preview">{lastMessageText}</div>
      </div>
      {isUnread && <div className="conversation-item-unread" />}
    </button>
  );
};

export default ConversationListItem;
