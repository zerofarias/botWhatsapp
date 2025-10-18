import { api } from './api';

export interface QuickReply {
  id: number;
  title: string;
  content: string;
  shortcut: string | null;
  areaId: number | null;
  userId: number | null;
  isGlobal: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  area?: {
    id: number;
    name: string;
  } | null;
  user?: {
    id: number;
    name: string;
    username: string;
  } | null;
}

export interface CreateQuickReplyInput {
  title: string;
  content: string;
  shortcut?: string | null;
  areaId?: number | null;
  userId?: number | null;
  isGlobal?: boolean;
  order?: number;
}

export interface UpdateQuickReplyInput {
  title?: string;
  content?: string;
  shortcut?: string | null;
  areaId?: number | null;
  userId?: number | null;
  isGlobal?: boolean;
  order?: number;
}

export const quickReplyService = {
  /**
   * Obtener todas las respuestas rápidas disponibles para el usuario
   */
  async list(): Promise<QuickReply[]> {
    const response = await api.get<QuickReply[]>('/quick-replies');
    return response.data;
  },

  /**
   * Obtener una respuesta rápida por ID
   */
  async getById(id: number): Promise<QuickReply> {
    const response = await api.get<QuickReply>(`/quick-replies/${id}`);
    return response.data;
  },

  /**
   * Buscar respuesta rápida por shortcut
   */
  async getByShortcut(shortcut: string): Promise<QuickReply> {
    const response = await api.get<QuickReply>(
      `/quick-replies/shortcut/${shortcut}`
    );
    return response.data;
  },

  /**
   * Crear una nueva respuesta rápida
   */
  async create(data: CreateQuickReplyInput): Promise<QuickReply> {
    const response = await api.post<QuickReply>('/quick-replies', data);
    return response.data;
  },

  /**
   * Actualizar una respuesta rápida existente
   */
  async update(id: number, data: UpdateQuickReplyInput): Promise<QuickReply> {
    const response = await api.put<QuickReply>(`/quick-replies/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar una respuesta rápida
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/quick-replies/${id}`);
  },

  /**
   * Reordenar respuestas rápidas
   */
  async reorder(updates: Array<{ id: number; order: number }>): Promise<void> {
    await api.post('/quick-replies/reorder', { updates });
  },
};
