/**
 * MessageBubble_v2 - Componente de burbuja de mensaje con soporte multimedia
 * Basado en Chat v1 pero adaptado para Chat v2 con la nueva interfaz Message
 */

import React, { useState } from 'react';
import { Message } from '../../store/chatStore';
import ImageViewerModal from './ImageViewerModal';
import { getFullMediaUrl } from '../../utils/urls';
import './MessageBubble_v2.css';

interface MessageBubbleV2Props {
  message: Message;
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MessageBubble_v2: React.FC<MessageBubbleV2Props> = ({ message }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Debug: Log multimedia messages only
  if (message.mediaType || message.mediaUrl) {
    console.log('MessageBubble_v2 - Multimedia message:', {
      id: message.id,
      mediaType: message.mediaType,
      mediaUrl: message.mediaUrl,
      fullUrl: message.mediaUrl ? getFullMediaUrl(message.mediaUrl) : null,
    });
  }

  const isOutgoing = message.sender === 'user' || message.sender === 'bot';

  const containerClass = isOutgoing
    ? 'message-bubble-v2-container--outgoing'
    : 'message-bubble-v2-container--incoming';
  const bubbleClass = isOutgoing
    ? 'message-bubble-v2--outgoing'
    : 'message-bubble-v2--incoming';

  return (
    <div className={`message-bubble-v2-container ${containerClass}`}>
      <div className={`message-bubble-v2 ${bubbleClass}`}>
        <div className="message-bubble-v2-content">
          {/* Renderizar contenido multimedia si existe */}
          {message.mediaType && message.mediaUrl ? (
            message.mediaType.includes('image') ? (
              <>
                <img
                  src={getFullMediaUrl(message.mediaUrl)}
                  alt="Imagen recibida"
                  onClick={() =>
                    setSelectedImage(getFullMediaUrl(message.mediaUrl))
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
                  onError={(e) => {
                    console.error(
                      'Error loading image:',
                      getFullMediaUrl(message.mediaUrl)
                    );
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <ImageViewerModal
                  isOpen={selectedImage === getFullMediaUrl(message.mediaUrl)}
                  imageUrl={getFullMediaUrl(message.mediaUrl)}
                  onClose={() => setSelectedImage(null)}
                  filename={`imagen-${message.id}.jpg`}
                />
              </>
            ) : message.mediaType.includes('audio') ? (
              <audio
                controls
                src={getFullMediaUrl(message.mediaUrl)}
                style={{ width: '200px', marginBottom: '0.5rem' }}
              />
            ) : (
              <a
                href={getFullMediaUrl(message.mediaUrl)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: isOutgoing ? '#fff' : '#007bff',
                  textDecoration: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  backgroundColor: isOutgoing
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,123,255,0.1)',
                  display: 'inline-block',
                  marginBottom: '0.5rem',
                }}
              >
                📎 Archivo recibido
              </a>
            )
          ) : null}

          {/* Texto del mensaje */}
          {message.content && (
            <p style={{ margin: 0, lineHeight: '1.4' }}>{message.content}</p>
          )}
        </div>

        {/* Footer con hora y estado */}
        <div className="message-bubble-v2-meta">
          <span className="message-bubble-v2-time">
            {formatTime(message.timestamp)}
          </span>
          {/* Indicadores de estado para mensajes salientes */}
          {isOutgoing && message.status && (
            <span className="message-bubble-v2-status">
              {message.status === 'sent' && '✓'}
              {message.status === 'delivered' && '✓✓'}
              {message.status === 'read' && '✓✓'}
              {message.status === 'error' && '✗'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble_v2;
