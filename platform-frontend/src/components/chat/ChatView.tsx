import React, { useEffect } from 'react';
import { markConversationMessagesAsRead } from '../../services/api';
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
  setNoteMode: (value: boolean) => void;
  onSendMessage: (content: string) => void;
  onCloseConversation: () => void;
};

const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  messages,
  loadingMessages,
  isClosing,
  isNoteMode,
  setNoteMode,
  onSendMessage,
  onCloseConversation,
}) => {
  useEffect(() => {
    if (conversation) {
      markConversationMessagesAsRead(conversation.id).catch(() => {});
    }
  }, [conversation]);

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
        onCloseConversation={onCloseConversation}
      />
      <MessageList messages={messages} loading={loadingMessages} />
      <ChatComposer
        disabled={composerDisabled}
        isNoteMode={isNoteMode}
        setNoteMode={setNoteMode}
        onSubmit={onSendMessage}
      />
    </section>
  );
};

export default ChatView;
