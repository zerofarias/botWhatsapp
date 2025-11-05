import React, { useEffect, useRef, useMemo } from 'react';
import type { HistoryItem } from '../../types/chat';
import MessageBubble from './MessageBubble';

type MessageListProps = {
  loading: boolean;
  messages: HistoryItem[];
};

const MessageList: React.FC<MessageListProps> = ({ loading, messages }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const firstUnreadRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const previousLengthRef = useRef(messages.length);

  // Calcular el índice del primer no leído UNA SOLA VEZ por render
  const firstUnreadIndex = useMemo(() => {
    return messages.findIndex(
      (msg) => msg.type === 'message' && msg.isRead === false
    );
  }, [messages]);

  // Detectar si el usuario está cerca del final (últimos 100px)
  const isUserNearBottom = useRef(true);

  // Monitorear scroll del usuario
  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messageList;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      isUserNearBottom.current = distanceFromBottom < 100;
    };

    messageList.addEventListener('scroll', handleScroll);
    return () => messageList.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll cuando lleguen nuevos mensajes
  useEffect(() => {
    const isNewMessage = messages.length > previousLengthRef.current;
    previousLengthRef.current = messages.length;

    if (!messages.length) return;

    // Si el usuario estaba cerca del final o es un mensaje nuevo, scroll al final
    if (isNewMessage && isUserNearBottom.current && endOfMessagesRef.current) {
      // Usar setTimeout para asegurar que el DOM está actualizado
      setTimeout(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
    } else if (firstUnreadIndex !== -1 && firstUnreadRef.current) {
      // Si hay mensajes no leídos, ir al primero
      setTimeout(() => {
        firstUnreadRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 0);
    } else if (!isNewMessage && endOfMessagesRef.current) {
      // Si es la carga inicial, ir al final
      setTimeout(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 0);
    }
  }, [messages.length, firstUnreadIndex]);

  if (loading) {
    return <div className="chat-view-empty">Cargando mensajes...</div>;
  }

  if (messages.length === 0) {
    return <div className="chat-view-empty">No hay mensajes.</div>;
  }

  return (
    <div className="message-list" ref={messageListRef}>
      {messages.map((item, index) => {
        // Generar key consistente basado en id o índice
        let itemKey: string;

        if (item.type === 'message') {
          itemKey = `message-${item.id}`;
        } else if (item.type === 'note') {
          itemKey = `note-${item.id}`;
        } else {
          // label - puede no tener id
          itemKey = `label-${index}`;
        }

        // Si es el primer no leído, envolver en ref
        if (index === firstUnreadIndex) {
          return (
            <div ref={firstUnreadRef} key={itemKey}>
              <MessageBubble item={item} />
            </div>
          );
        }

        return <MessageBubble key={itemKey} item={item} />;
      })}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default MessageList;
