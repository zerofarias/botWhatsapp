/**
 * Utilidades para manejo de conversaciones
 * Centraliza lógica reutilizable para reducir spaghetti code
 */

import type { ConversationSummary } from '../types/chat';

/**
 * Agrupa conversaciones por usuario (última actividad)
 * Útil para mostrar solo el último chat por contacto
 */
export function groupConversationsByLatest(
  conversations: ConversationSummary[]
): ConversationSummary[] {
  const latestByUser: Record<string, ConversationSummary> = {};

  for (const conv of conversations) {
    const label =
      conv.contact?.name?.trim() || conv.contactName?.trim() || conv.userPhone;

    if (
      !latestByUser[label] ||
      new Date(conv.lastActivity).getTime() >
        new Date(latestByUser[label].lastActivity).getTime()
    ) {
      latestByUser[label] = conv;
    }
  }

  return Object.values(latestByUser);
}

/**
 * Busca conversaciones por término
 */
export function searchConversations(
  conversations: ConversationSummary[],
  searchTerm: string
): ConversationSummary[] {
  if (!searchTerm.trim()) return conversations;

  const normalized = searchTerm.trim().toLowerCase();
  return conversations.filter((c) => {
    const name = c.contact?.name ?? c.contactName ?? '';
    const phone = c.userPhone;
    return (
      name.toLowerCase().includes(normalized) ||
      phone.toLowerCase().includes(normalized)
    );
  });
}

/**
 * Obtiene nombre de display para una conversación
 */
export function getDisplayName(conversation: ConversationSummary): string {
  return (
    conversation.contact?.name?.trim() ||
    conversation.contactName?.trim() ||
    conversation.userPhone
  );
}

/**
 * Formatea un número de teléfono
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';
  if (!phone.includes('@')) {
    return phone;
  }
  return phone.replace(/@.+$/, '');
}

/**
 * Construye vista previa del último mensaje
 * lastMessage es un objeto ConversationMessage con senderType: 'CONTACT' | 'BOT' | 'OPERATOR'
 */
export function buildLastMessagePreview(
  message: ConversationSummary['lastMessage']
): string {
  if (!message) return 'Sin mensajes';

  // Construir prefijo según el tipo de remitente
  const prefix =
    message.senderType === 'OPERATOR'
      ? 'Tú: '
      : message.senderType === 'BOT'
      ? 'Bot: '
      : '';

  return `${prefix}${message.content}`.slice(0, 80);
}

/**
 * Formatea timestamp relativo (ej: "hace 2 horas")
 */
export function formatRelativeTimestamp(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `hace ${diffMins}m`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDays < 7) return `hace ${diffDays}d`;

    return date.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}
