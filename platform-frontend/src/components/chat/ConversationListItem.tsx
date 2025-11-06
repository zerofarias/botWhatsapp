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

function getPhotoUrl(photoUrl?: string | null): string | null {
  if (!photoUrl) return null;

  // Si ya es una URL completa, devolverla tal cual
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }

  // Si es una URL relativa, usar la base del API
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  const baseUrl = apiBase.replace('/api', '');
  return `${baseUrl}${photoUrl}`;
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
  const photoUrl = getPhotoUrl(conversation.contact?.photoUrl);

  // Determinar el estado visual basado en botActive y status
  const isBotActive = conversation.botActive && !conversation.assignedTo;
  const isClosed = conversation.status === 'CLOSED';

  const statusClass = isClosed
    ? 'conversation-item--closed'
    : isBotActive
    ? 'conversation-item--bot-active'
    : !conversation.botActive && conversation.status !== 'CLOSED'
    ? 'conversation-item--ready'
    : '';

  return (
    <button
      type="button"
      className={`conversation-item${
        isActive ? ' conversation-item--active' : ''
      }${statusClass ? ` ${statusClass}` : ''}`}
      onClick={onSelect}
    >
      <div className="conversation-item-avatar">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={displayName}
            className="conversation-item-avatar-image"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <span
          className={`conversation-item-avatar-fallback${
            photoUrl ? ' hidden' : ''
          }`}
        >
          {displayName.charAt(0).toUpperCase()}
        </span>
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
      {isBotActive && !isClosed && (
        <div className="conversation-item-bot-badge" title="Bot activo">
          🤖
        </div>
      )}
      {isUnread && <div className="conversation-item-unread" />}
    </button>
  );
};

export default ConversationListItem;
