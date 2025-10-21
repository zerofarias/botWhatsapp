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

// Notas internas de conversación
export async function createConversationNote(
  conversationId: string | number,
  content: string
) {
  const res = await api.post(`/conversations/${conversationId}/notes`, {
    content,
  });
  return res.data;
}

export async function listConversationNotes(conversationId: string | number) {
  const res = await api.get(`/conversations/${conversationId}/notes`);
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
  const res = await api.get(`/conversations/history/${phone}`);
  return res.data;
}
