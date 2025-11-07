import React, { useState } from 'react';
import type { ConversationSummary } from '../../types/chat';
import AddContactModal from './AddContactModal';

// Helper functions from ChatPage (to be moved to utils)
function getDisplayName(conversation: ConversationSummary) {
  const name = conversation.contact?.name ?? conversation.contactName ?? '';
  if (name.trim().length) {
    return name.trim();
  }
  return conversation.userPhone;
}

/**
 * Props para ChatHeader
 * @param conversation Conversación activa
 * @param onCloseConversation Handler para finalizar
 * @param isClosing Si está cerrando
 * @param isBotActive Si el bot está gestionando
 * @param onTakeBot Handler para tomar la conversación
 */
type ChatHeaderProps = {
  conversation: ConversationSummary;
  onCloseConversation: () => void;
  isClosing: boolean;
  isBotActive?: boolean;
  onTakeBot?: () => void;
};

const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onCloseConversation,
  isClosing,
  isBotActive,
  onTakeBot,
}) => {
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const displayName = getDisplayName(conversation);

  return (
    <header className="chat-header">
      <div className="chat-header-info">
        <div className="chat-header-avatar">
          {conversation.contact?.photoUrl ? (
            <img
              src={conversation.contact.photoUrl}
              alt={displayName}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 'inherit',
              }}
            />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="chat-header-details">
          <div className="name">
            {displayName}
            {conversation.contact?.dni && (
              <span className="chat-header-dni">
                {' '}
                • DNI: {conversation.contact.dni}
              </span>
            )}
          </div>
          <div className="status">
            {conversation.status}
            {isBotActive && (
              <span
                style={{ marginLeft: 8, color: '#eab308', fontWeight: 600 }}
              >
                (Bot activo)
              </span>
            )}
            {!isBotActive && conversation.assignedTo && (
              <span
                style={{ marginLeft: 8, color: '#22c55e', fontWeight: 600 }}
              >
                (Operador)
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="chat-header-actions">
        {!conversation.contact || !conversation.contact.id ? (
          <button
            onClick={() => setShowAddContactModal(true)}
            className="btn-add-contact"
            title="Agregar este número como contacto"
          >
            + Contacto
          </button>
        ) : null}
        {isBotActive && onTakeBot && (
          <button
            onClick={onTakeBot}
            style={{
              marginRight: 8,
              background: '#eab308',
              color: '#333',
              border: 'none',
              borderRadius: 6,
              padding: '0.5rem 1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tomar
          </button>
        )}
        <button
          onClick={async () => {
            try {
              await fetch(`/api/conversations/${conversation.id}/finish`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'manual_close' }),
              });
              // NO hacer reload - dejar que Socket.IO actualice el estado
              // El evento 'conversation:finish' llegará automáticamente
              onCloseConversation();
            } catch {
              alert('No se pudo finalizar la conversación.');
            }
          }}
          disabled={isClosing || conversation.status === 'CLOSED'}
        >
          {isClosing ? 'Cerrando...' : 'Finalizar'}
        </button>
      </div>

      <AddContactModal
        isOpen={showAddContactModal}
        onClose={() => setShowAddContactModal(false)}
        phoneNumber={conversation.userPhone}
        onSubmit={async (name, dni) => {
          try {
            const response = await fetch('/api/contacts', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name,
                phone: conversation.userPhone,
                dni: dni || null,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Error al agregar contacto');
            }

            // Recargar para reflejar el nuevo contacto
            window.location.reload();
          } catch (error) {
            throw error;
          }
        }}
      />
    </header>
  );
};

export default ChatHeader;
