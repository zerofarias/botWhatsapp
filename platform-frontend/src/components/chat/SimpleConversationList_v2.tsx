/**
 * SimpleConversationList_v2 - Contact-based conversation list
 * Shows each contact/phone only once, aggregating their conversations
 */

import React from 'react';
import {
  useContactGroups,
  ContactGroup,
} from '../../hooks/v2/useContactGroups';
import { useChatStore } from '../../store/chatStore';
import './SimpleConversationList_v2.css';

interface Props {
  onSelectConversation?: (conversationId: number | string) => void;
}

/**
 * ContactListItem - Single contact/phone item (aggregated)
 */
const ContactListItem: React.FC<{
  contactGroup: ContactGroup;
  isActive: boolean;
  onClick: () => void;
}> = ({ contactGroup, isActive, onClick }) => {
  const {
    displayName,
    phoneNumber,
    isContactSaved,
    totalUnreadCount,
    lastMessage,
    conversations,
    lastActivity,
  } = contactGroup;

  const timestamp = new Date(lastActivity).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Indicador de múltiples conversaciones
  const hasMultipleConversations = conversations.length > 1;

  return (
    <div
      className={`conversation-item ${isActive ? 'active' : ''} ${
        isContactSaved ? 'contact-saved' : 'contact-unsaved'
      }`}
      onClick={onClick}
    >
      <div className="conversation-avatar">
        <div className="avatar-placeholder">
          {displayName.charAt(0).toUpperCase()}
          {isContactSaved && <span className="contact-badge">📋</span>}
          {hasMultipleConversations && (
            <span className="multiple-badge">{conversations.length}</span>
          )}
        </div>
      </div>
      <div className="conversation-content">
        <div className="conversation-header">
          <div className="contact-info">
            <span
              className={`contact-name ${isContactSaved ? 'saved' : 'unsaved'}`}
            >
              {displayName}
            </span>
            {isContactSaved && displayName !== phoneNumber && (
              <span className="phone-subtitle">{phoneNumber}</span>
            )}
            {!isContactSaved && (
              <span className="phone-main">{phoneNumber}</span>
            )}
            {hasMultipleConversations && (
              <span className="conversations-count">
                {conversations.length} conversaciones
              </span>
            )}
          </div>
          <span className="timestamp">{timestamp}</span>
        </div>
        <div className="last-message">{lastMessage}</div>
      </div>
      {totalUnreadCount > 0 && (
        <div className="unread-badge">{totalUnreadCount}</div>
      )}
    </div>
  );
};

/**
 * Main component
 */
export const SimpleConversationList_v2: React.FC<Props> = ({
  onSelectConversation,
}) => {
  const { contactGroups, loading } = useContactGroups();
  const activeConversationId = useChatStore(
    (state) => state.activeConversationId
  );

  const handleSelectContact = (contactGroup: ContactGroup) => {
    // Seleccionar la conversación principal del contacto
    const conversationId = contactGroup.primaryConversationId;

    // Update store with primary conversation
    useChatStore.setState({ activeConversationId: conversationId });

    // También guardar información del contacto para el chat
    useChatStore.setState({
      selectedContactGroup: contactGroup,
    });

    // Call prop callback if provided
    onSelectConversation?.(conversationId);
  };

  if (loading) {
    return (
      <div className="simple-conversation-list loading">
        Cargando contactos...
      </div>
    );
  }

  if (contactGroups.length === 0) {
    return (
      <div className="simple-conversation-list empty">No hay contactos</div>
    );
  }

  return (
    <div className="simple-conversation-list">
      {contactGroups.map((contactGroup) => {
        // Determinar si este contacto está activo (cualquiera de sus conversaciones)
        const isActive = contactGroup.conversations.some(
          (conv) => conv.id === activeConversationId
        );

        return (
          <ContactListItem
            key={contactGroup.contactKey}
            contactGroup={contactGroup}
            isActive={isActive}
            onClick={() => handleSelectContact(contactGroup)}
          />
        );
      })}
    </div>
  );
};

export default SimpleConversationList_v2;
