import React, { useState } from 'react';
import type { HistoryItem } from '../../types/chat';
import ImageViewerModal from './ImageViewerModal';
import { getFullMediaUrl, getApiBaseUrl } from '../../utils/urls';

type MessageBubbleProps = {
  item: HistoryItem;
};

function formatTime(isoDate?: string) {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ item }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

  // Tipo 'message'
  const isOutgoing =
    item.senderType === 'OPERATOR' || item.senderType === 'BOT';
  const containerClass = isOutgoing
    ? 'message-bubble-container--outgoing'
    : 'message-bubble-container--incoming';
  const bubbleClass = isOutgoing
    ? 'message-bubble--outgoing'
    : 'message-bubble--incoming';

  // Si la URL es relativa, construir la URL completa usando la base del API
  // Nota: getFullMediaUrl es importada desde utils/urls

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
              <>
                <img
                  src={getFullMediaUrl(item.mediaUrl)}
                  alt="Imagen recibida"
                  onClick={() =>
                    setSelectedImage(getFullMediaUrl(item.mediaUrl))
                  }
                  style={{
                    maxWidth: '220px',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLImageElement).style.transform =
                      'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLImageElement).style.transform = 'scale(1)';
                  }}
                />
                <ImageViewerModal
                  isOpen={selectedImage === getFullMediaUrl(item.mediaUrl)}
                  imageUrl={getFullMediaUrl(item.mediaUrl)}
                  onClose={() => setSelectedImage(null)}
                  filename={`imagen-${Date.now()}.jpg`}
                />
              </>
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
          <p>{item.content || ''}</p>
        </div>
        <div className="message-bubble-meta">
          <span>{formatTime(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
