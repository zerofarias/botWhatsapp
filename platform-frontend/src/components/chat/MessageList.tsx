import React from 'react';
import MessageBubble from './MessageBubble';

type Message = {
  type: 'message' | 'note' | 'label';
  id?: string;
  // ... other properties
};

type MessageListProps = {
  loading: boolean;
  messages: Message[];
};

const MessageList: React.FC<MessageListProps> = ({ loading, messages }) => {
  // const endOfMessagesRef = useRef<HTMLDivElement>(null);
  // useEffect(() => {
  //   endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [messages]);

  if (loading) {
    return <div className="chat-view-empty">Cargando mensajes...</div>;
  }

  if (messages.length === 0) {
    return <div className="chat-view-empty">No hay mensajes.</div>;
  }

  return (
    <div className="message-list">
      {messages.map((item, index) => (
        <MessageBubble key={`${item.id ?? 'msg'}-${index}`} item={item} />
      ))}
      {/* <div ref={endOfMessagesRef} /> */}
    </div>
  );
};

export default MessageList;
