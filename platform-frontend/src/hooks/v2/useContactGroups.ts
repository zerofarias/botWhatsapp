/**
 * useContactGroups v2 - Group conversations by unique contact/phone
 * Shows each contact only once, aggregating all their conversations
 */

import { useMemo } from 'react';
import { useConversations } from './useConversations';

export interface ContactGroup {
  // Identificación única del contacto
  contactKey: string; // phone number or contact.id
  displayName: string; // Nombre a mostrar
  phoneNumber: string; // Número de teléfono
  isContactSaved: boolean; // Si está agendado

  // Información agregada
  conversations: any[]; // Todas las conversaciones de este contacto
  totalUnreadCount: number; // Suma de mensajes no leídos
  lastActivity: string; // Última actividad entre todas las conversaciones
  lastMessage: string; // Último mensaje entre todas las conversaciones

  // Para la selección
  primaryConversationId: number; // ID de la conversación principal/más reciente
}

export function useContactGroups() {
  const { conversations, loading } = useConversations();

  const contactGroups = useMemo(() => {
    if (!conversations || conversations.length === 0) {
      return [];
    }

    // Agrupar conversaciones por contacto único
    const groupedByContact = new Map<string, ContactGroup>();

    conversations.forEach((conversation) => {
      // Determinar la clave única del contacto (priorizar phone, luego contact.id)
      const phoneNumber = conversation.contact?.phone || 'unknown';
      const contactKey = phoneNumber; // Usar teléfono como clave única

      // Información del contacto
      const displayName =
        conversation.contact?.name || `Contacto ${phoneNumber}`;
      const isContactSaved = !!conversation.contact?.name;

      // Si ya existe este contacto, agregar conversación
      if (groupedByContact.has(contactKey)) {
        const existingGroup = groupedByContact.get(contactKey)!;
        existingGroup.conversations.push(conversation);
        existingGroup.totalUnreadCount += conversation.unreadCount || 0;

        // Actualizar último mensaje/actividad si es más reciente
        const conversationTime =
          existingGroup.conversations[0].lastMessageTime || 0;
        const currentTime = conversation.lastMessageTime || 0;

        if (currentTime > conversationTime) {
          existingGroup.lastMessage =
            conversation.lastMessage || 'Sin mensajes';
          existingGroup.primaryConversationId = conversation.id;
        }
      } else {
        // Crear nuevo grupo de contacto
        const newGroup: ContactGroup = {
          contactKey,
          displayName,
          phoneNumber,
          isContactSaved,
          conversations: [conversation],
          totalUnreadCount: conversation.unreadCount || 0,
          lastActivity: new Date(
            conversation.lastMessageTime || Date.now()
          ).toISOString(),
          lastMessage: conversation.lastMessage || 'Sin mensajes',
          primaryConversationId: conversation.id,
        };

        groupedByContact.set(contactKey, newGroup);
      }
    });

    // Convertir Map a Array y ordenar por última actividad
    return Array.from(groupedByContact.values()).sort((a, b) => {
      const timeA = new Date(a.lastActivity).getTime();
      const timeB = new Date(b.lastActivity).getTime();
      return timeB - timeA; // Más recientes primero
    });
  }, [conversations]);

  return {
    contactGroups,
    loading,
  };
}
