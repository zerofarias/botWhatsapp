import React, { useState } from 'react';
import { FiUserPlus } from 'react-icons/fi';
import type { ConversationSummary } from '../../types/chat';
import AddContactModal from './AddContactModal';
import { api } from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';
import Swal from 'sweetalert2';

const getDisplayName = (conversation: ConversationSummary) => {
  const name = conversation.contact?.name ?? conversation.contactName ?? '';
  if (name.trim().length > 0) {
    return name.trim();
  }
  return conversation.userPhone;
};

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
  const shouldShowAddContactButton =
    !conversation.contact || !conversation.contact.id;

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
            {conversation.contact?.dni ? (
              <span className="chat-header-dni">
                {' '}
                DNI: {conversation.contact.dni}
              </span>
            ) : null}
          </div>
          <div className="status">
            {conversation.status}
            {isBotActive ? (
              <span
                style={{ marginLeft: 8, color: '#eab308', fontWeight: 600 }}
              >
                (Bot activo)
              </span>
            ) : conversation.assignedTo ? (
              <span
                style={{ marginLeft: 8, color: '#22c55e', fontWeight: 600 }}
              >
                (Operador)
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="chat-header-actions">
        {shouldShowAddContactButton && (
          <button
            onClick={() => setShowAddContactModal(true)}
            className="chat-header-icon-btn"
            title="Agregar este numero como contacto"
            aria-label="Agregar este numero como contacto"
            type="button"
          >
            <FiUserPlus size={18} />
          </button>
        )}

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
              await api.post(`/conversations/${conversation.id}/finish`, {
                reason: 'manual_close',
              });
              onCloseConversation();
            } catch (error) {
              await Swal.fire({
                icon: 'error',
                title: 'No se pudo finalizar la conversación.',
                text: getApiErrorMessage(
                  error,
                  'No se pudo finalizar la conversación.'
                ),
                confirmButtonText: 'Entendido',
              });
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
        onSubmit={async ({ name, dni, address1, address2 }) => {
          try {
            await api.post('/contacts', {
              name,
              phone: conversation.userPhone,
              dni: dni || null,
              address1: address1 || null,
              address2: address2 || null,
            });
            window.location.reload();
          } catch (error) {
            throw new Error(
              getApiErrorMessage(error, 'Error al agregar contacto')
            );
          }
        }}
      />
    </header>
  );
};

export default ChatHeader;
