// Marcar todos los mensajes de todas las conversaciones de un número como leídos
export async function markAllMessagesAsReadByPhone(userPhone: string) {
  const res = await api.post(`/messages/mark-read-by-phone`, { userPhone });
  return res.data;
}
// Marcar todos los mensajes de una conversación como leídos
export async function markConversationMessagesAsRead(
  conversationId: string | number
) {
  const res = await api.post(`/messages/mark-read`, {
    conversationId,
  });
  return res.data;
}
// Todas las conversaciones del sistema (todos los usuarios)
export async function getAllChats() {
  const res = await api.get('/conversations/all');
  return res.data;
}
import axios from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.length
    ? import.meta.env.VITE_API_URL
    : '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Si el backend solo usa sesión, no agregues Authorization

// Si el backend solo usa sesión, no agregues Authorization

// Notas internas de conversaci��n
export interface ConversationNoteDTO {
  id: string;
  content: string;
  createdAt: string;
  createdById: number | null;
  createdByName: string | null;
}

export async function createConversationNote(
  conversationId: string | number,
  content: string
) {
  const res = await api.post<ConversationNoteDTO>(
    `/conversations/${conversationId}/notes`,
    {
      content,
    }
  );
  return res.data;
}

export async function listConversationNotes(conversationId: string | number) {
  const res = await api.get<ConversationNoteDTO[]>(
    `/conversations/${conversationId}/notes`
  );
  return res.data;
}

export async function getAllChatsByPhone(userPhone: string) {
  const res = await api.get(`/conversations/all-by-phone/${userPhone}`);
  return res.data;
}

export async function listConversationMessages(
  conversationId: string | number
) {
  const res = await api.get(`/conversations/${conversationId}/messages`);
  return res.data;
}

export async function getCombinedHistory(phone: string) {
  // Agregar timestamp para desabilitar caché del navegador
  const timestamp = Date.now();
  const res = await api.get(`/conversations/history/${phone}?t=${timestamp}`);
  return res.data;
}

export async function getSingleConversationHistory(
  conversationId: string | number
) {
  // Agregar timestamp para desabilitar caché del navegador
  const timestamp = Date.now();
  const res = await api.get(
    `/conversations/${conversationId}/history?t=${timestamp}`
  );
  return res.data;
}

/**
 * Inicia el flujo de una conversación ejecutando el nodo START
 */
export async function startConversationFlow(conversationId: string | number) {
  const res = await api.post(`/conversations/${conversationId}/start-flow`);
  return res.data;
}

export interface HotHourStat {
  hour: number;
  total: number;
}

export interface MessagesPerDayStat {
  day: string;
  total: number;
}

export interface AdminAnalyticsResponse {
  range: {
    days: number;
    since: string;
    until: string;
  };
  contacts: {
    total: number;
    newInRange: number;
    newNumbers: number;
  };
  messaging: {
    hotHours: HotHourStat[];
    nightlyMessages: number;
    messagesPerDay: MessagesPerDayStat[];
    avgResponseSeconds: number | null;
  };
  orders: {
    hotHours: HotHourStat[];
    avgClosureMinutes: number | null;
  };
}

export async function getAdminAnalyticsSummary(days?: number) {
  const params =
    typeof days === 'number' && !Number.isNaN(days) ? `?days=${days}` : '';
  const res = await api.get<AdminAnalyticsResponse>(
    `/analytics/summary${params}`
  );
  return res.data;
}
