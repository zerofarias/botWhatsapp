import React from 'react';

// Define types locally for now
type Message = {
  type: 'message' | 'note' | 'label';
  id?: string;
  content?: string;
  createdAt?: string;
  senderType?: 'USER' | 'OPERATOR' | 'BOT' | 'CONTACT';
  label?: string;
};

type MessageBubbleProps = {
  item: Message;
};

function formatTime(isoDate?: string) {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ item }) => {
  if (item.type === 'label') {
    const label = (item.label || '').toLowerCase();
    const isStart = label.includes('inicio');
    const isEnd = label.includes('fin');
    const isOpenEnd = isEnd && label.includes('abierta');
    // Ocultar etiqueta de fin si es "abierta"
    if (isOpenEnd) return null;
    const eventClass = isStart
      ? 'chat-event--start'
      : isEnd
      ? 'chat-event--end'
      : '';

    return (
      <div className={`chat-event-bubble ${eventClass}`}>{item.label}</div>
    );
  }

  if (item.type === 'note') {
    return (
      <div className="chat-note-bubble">
        📝 <b>Nota interna:</b> {item.content}{' '}
        <span style={{ marginLeft: '1rem', fontSize: '0.85rem' }}>
          {formatTime(item.createdAt)}
        </span>
      </div>
    );
  }

  const isOutgoing =
    item.senderType === 'OPERATOR' || item.senderType === 'BOT';
  const containerClass = isOutgoing
    ? 'message-bubble-container--outgoing'
    : 'message-bubble-container--incoming';
  const bubbleClass = isOutgoing
    ? 'message-bubble--outgoing'
    : 'message-bubble--incoming';

  return (
    <div className={`message-bubble-container ${containerClass}`}>
      <div className={`message-bubble ${bubbleClass}`}>
        <div className="message-bubble-content">
          {item.senderType !== 'CONTACT' && !isOutgoing && (
            <div className="message-bubble-meta sender">{item.senderType}</div>
          )}
          <p>{item.content}</p>
        </div>
        <div className="message-bubble-meta">
          <span>{formatTime(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
