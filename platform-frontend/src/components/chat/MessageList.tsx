import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

type Message = {
  type: 'message' | 'note' | 'label';
  id?: string;
  isRead?: boolean;
  // ... other properties
};

type MessageListProps = {
  loading: boolean;
  messages: Message[];
};

const MessageList: React.FC<MessageListProps> = ({ loading, messages }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const firstUnreadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Buscar el primer mensaje no leído
    const firstUnreadIndex = messages.findIndex(
      (msg) => msg.type === 'message' && msg.isRead === false
    );
    if (firstUnreadIndex !== -1 && firstUnreadRef.current) {
      firstUnreadRef.current.scrollIntoView({ behavior: 'auto' });
    } else if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

  if (loading) {
    return <div className="chat-view-empty">Cargando mensajes...</div>;
  }

  if (messages.length === 0) {
    return <div className="chat-view-empty">No hay mensajes.</div>;
  }

  return (
    <div className="message-list">
      {messages.map((item, index) => {
        if (item.type === 'message' && item.isRead === false) {
          // Solo el primer no leído
          const firstUnreadIndex = messages.findIndex(
            (msg) => msg.type === 'message' && msg.isRead === false
          );
          if (index === firstUnreadIndex) {
            return (
              <div ref={firstUnreadRef} key={`${item.id ?? 'msg'}-${index}`}>
                <MessageBubble item={item} />
              </div>
            );
          }
        }
        return (
          <MessageBubble key={`${item.id ?? 'msg'}-${index}`} item={item} />
        );
      })}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default MessageList;
