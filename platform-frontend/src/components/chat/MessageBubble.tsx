import React from 'react';

// Define types locally for now
type Message = {
  type: 'message' | 'note' | 'label';
  id?: string;
  content?: string;
  createdAt?: string;
  senderType?: 'USER' | 'OPERATOR' | 'BOT' | 'CONTACT';
  label?: string;
  mediaType?: string | null;
  mediaUrl?: string | null;
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

  // Si la URL es relativa, anteponer el hostname y puerto del backend
  const getFullMediaUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('/uploads/')) {
      return `http://localhost:4000${url}`;
    }
    return url;
  };

  return (
    <div className={`message-bubble-container ${containerClass}`}>
      <div className={`message-bubble ${bubbleClass}`}>
        <div className="message-bubble-content">
          {item.senderType !== 'CONTACT' && !isOutgoing && (
            <div className="message-bubble-meta sender">{item.senderType}</div>
          )}
          {/* Renderizar contenido multimedia si existe */}
          {item.mediaType && item.mediaUrl ? (
            item.mediaType.includes('image') ? (
              <img
                src={getFullMediaUrl(item.mediaUrl)}
                alt="Imagen recibida"
                style={{
                  maxWidth: '220px',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                }}
              />
            ) : item.mediaType.includes('audio') ? (
              <audio
                controls
                src={getFullMediaUrl(item.mediaUrl)}
                style={{ width: '200px', marginBottom: '0.5rem' }}
              />
            ) : (
              <a
                href={getFullMediaUrl(item.mediaUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Archivo recibido
              </a>
            )
          ) : null}
          {/* Texto del mensaje */}
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
