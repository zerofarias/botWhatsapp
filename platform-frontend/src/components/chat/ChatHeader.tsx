import React from 'react';
import type { ConversationSummary } from '../../types/chat';

// Helper functions from ChatPage (to be moved to utils)
function getDisplayName(conversation: ConversationSummary) {
  const name = conversation.contact?.name ?? conversation.contactName ?? '';
  if (name.trim().length) {
    return name.trim();
  }
  return conversation.userPhone;
}

type ChatHeaderProps = {
  conversation: ConversationSummary;
  onCloseConversation: () => void;
  // onToggleNoteMode y isNoteMode eliminados, funcionalidad movida a ChatComposer
  isClosing: boolean;
};

const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onCloseConversation,
  // onToggleNoteMode, isNoteMode eliminados
  isClosing,
}) => {
  const displayName = getDisplayName(conversation);

  return (
    <header className="chat-header">
      <div className="chat-header-info">
        <div className="chat-header-avatar">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="chat-header-details">
          <div className="name">{displayName}</div>
          <div className="status">{conversation.status}</div>
        </div>
      </div>
      <div className="chat-header-actions">
        {/* Botón Nota eliminado, funcionalidad movida a ChatComposer */}
        <button
          onClick={onCloseConversation}
          disabled={isClosing || conversation.status === 'CLOSED'}
        >
          {isClosing ? 'Cerrando...' : 'Finalizar'}
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
