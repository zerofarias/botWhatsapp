import React, { useEffect } from 'react';
import { markConversationMessagesAsRead } from '../../services/api';
import type { ConversationSummary, HistoryItem } from '../../types/chat';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatComposer from './ChatComposer';

/**
 * Props para ChatView
 * @param conversation Conversación activa o null
 * @param messages Historial combinado de mensajes, notas y etiquetas
 * @param loadingMessages Si está cargando el historial
 * @param isClosing Si la conversación se está cerrando
 * @param isNoteMode Si está en modo nota
 * @param setNoteMode Cambia el modo nota
 * @param onSendMessage Envía un mensaje o nota
 * @param onCloseConversation Cierra la conversación
 */
type ChatViewProps = {
  conversation: ConversationSummary | null;
  messages: HistoryItem[];
  loadingMessages: boolean;
  isClosing: boolean;
  isNoteMode: boolean;
  setNoteMode: (value: boolean) => void;
  onSendMessage: (content: string) => Promise<void>;
  onCloseConversation: () => void;
  isSending?: boolean;
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
  isSending = false,
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

  // Lógica de bloqueo: si el bot está activo y no hay operador asignado, bloquear input
  const isBotActive = conversation.botActive && !conversation.assignedTo;
  const composerDisabled =
    conversation.status === 'CLOSED' || isClosing || isBotActive;

  return (
    <section className="chat-view">
      <ChatHeader
        conversation={conversation}
        isClosing={isClosing}
        onCloseConversation={onCloseConversation}
        isBotActive={isBotActive}
        onTakeBot={async () => {
          try {
            // Llamar al endpoint para tomar la conversación
            const response = await fetch(
              `/api/conversations/${conversation.id}/take`,
              {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
              }
            );

            if (!response.ok) {
              throw new Error('Error al tomar la conversación');
            }

            // No recargar la página - el evento Socket.IO actualizará el estado
            console.log('Conversación tomada exitosamente');
          } catch (error) {
            console.error('Error al tomar conversación:', error);
            alert('No se pudo tomar la conversación.');
          }
        }}
      />
      <MessageList messages={messages} loading={loadingMessages} />
      {isBotActive && (
        <div
          style={{
            color: '#eab308',
            background: '#fef9c3',
            padding: '0.75rem',
            borderRadius: '8px',
            margin: '1rem 0',
            textAlign: 'center',
          }}
        >
          La conversación está siendo gestionada por el bot. Pulsa "Tomar" para
          intervenir como operador.
        </div>
      )}
      <ChatComposer
        disabled={composerDisabled}
        isNoteMode={isNoteMode}
        setNoteMode={setNoteMode}
        onSubmit={onSendMessage}
        isSending={isSending}
      />
    </section>
  );
};

export default ChatView;
