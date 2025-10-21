import React from 'react';
import type { ConversationSummary } from '../../types/chat';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatComposer from './ChatComposer';

type ChatViewProps = {
  conversation: ConversationSummary | null;
  messages: any[]; // Combined history
  loadingMessages: boolean;
  isClosing: boolean;
  isNoteMode: boolean;
  onSendMessage: (content: string) => void;
  onCloseConversation: () => void;
  onToggleNoteMode: () => void;
};

const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  messages,
  loadingMessages,
  isClosing,
  isNoteMode,
  onSendMessage,
  onCloseConversation,
  onToggleNoteMode,
}) => {
  if (!conversation) {
    return (
      <div className="chat-view-empty">
        <div>
          <h2>Bienvenido al Panel de Chat</h2>
          <p>Selecciona una conversación de la lista para empezar a chatear.</p>
        </div>
      </div>
    );
  }

  const composerDisabled = conversation.status === 'CLOSED' || isClosing;

  return (
    <section className="chat-view">
      <ChatHeader
        conversation={conversation}
        isClosing={isClosing}
        isNoteMode={isNoteMode}
        onCloseConversation={onCloseConversation}
        onToggleNoteMode={onToggleNoteMode}
      />
      <MessageList messages={messages} loading={loadingMessages} />
      <ChatComposer
        disabled={composerDisabled}
        isNoteMode={isNoteMode}
        onSubmit={onSendMessage}
      />
    </section>
  );
};

export default ChatView;
