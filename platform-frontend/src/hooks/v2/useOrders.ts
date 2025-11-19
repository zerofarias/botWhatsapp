/**
 * useOrders v2 - Hook para gestionar pedidos
 * Carga, filtra y actualiza pedidos en tiempo real
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { getSocketManager } from '../../services/socket/SocketManager';
import { useChatStore } from '../../store/chatStore';

export interface OrderItem {
  nombre: string;
  cantidad: number;
  descripcion?: string;
}

export interface Order {
  id: number;
  conversationId: number;
  clientPhone: string;
  clientName?: string;
  tipoConversacion: string;
  itemsJson: string; // JSON stringificado
  concept?: string | null;
  requestDetails?: string | null;
  customerData?: string | null;
  paymentMethod?: string | null;
  notas?: string;
  especificaciones?: string;
  status: 'PENDING' | 'CONFIRMADO' | 'COMPLETADO' | 'CANCELADO';
  closeReason?: string;
  createdAt: string;
  closedAt?: string;
  updatedAt: string;
  confirmationMessage?: string | null;
  confirmationSentAt?: string;
  conversation?: {
    userPhone: string;
    contactName?: string;
    assignedToId?: number;
    assignedTo?: {
      id: number;
      name: string;
    } | null;
    contact?: {
      id: number;
      name: string;
      dni?: string | null;
    } | null;
  };
}

export interface OrderFilters {
  clientPhone?: string;
  conversationId?: string;
  startDate?: string;
  endDate?: string;
  operatorName?: string;
  operatorId?: string;
}

export interface UseOrdersResult {
  orders: Order[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  completeOrder: (
    orderId: number,
    reason: string,
    mensaje?: string
  ) => Promise<void>;
  updateOrder: (
    orderId: number,
    data: { notas?: string; especificaciones?: string }
  ) => Promise<void>;
  updateOrderStatus: (
    orderId: number,
    status: 'PENDING' | 'CONFIRMADO' | 'COMPLETADO' | 'CANCELADO'
  ) => Promise<void>;
  deleteOrder: (orderId: number) => Promise<void>;
}

const normalizeOrderRecord = (order: Order): Order => ({
  ...order,
  createdAt: new Date(
    order.createdAt ?? order.updatedAt ?? Date.now()
  ).toISOString(),
  closedAt: order.closedAt ? new Date(order.closedAt).toISOString() : undefined,
  updatedAt: new Date(order.updatedAt ?? Date.now()).toISOString(),
  confirmationSentAt: order.confirmationSentAt
    ? new Date(order.confirmationSentAt).toISOString()
    : undefined,
});

export function useOrders(
  status?: string,
  search?: string,
  pollIntervalMs = 30000,
  filters?: OrderFilters,
  refreshToken = 0
): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketConnected = useChatStore((state) => state.socketConnected);

  // Cargar pedidos del servidor
  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (status) params.append('status', status);
      const trimmedSearch =
        typeof search === 'string' ? search.trim() : search ?? '';
      if (trimmedSearch) {
        params.append('search', trimmedSearch);
        params.append('limit', 'all');
      } else {
        params.append('limit', '100');
      }
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value.toString().trim().length > 0) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await api.get(`/orders?${params.toString()}`);
      const normalizedOrders: Order[] = (response.data.orders || []).map(
        (order: Order) => normalizeOrderRecord(order)
      );
      setOrders(normalizedOrders);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load orders';
      setError(message);
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }, [status, search, filters, refreshToken]);

  // Cargar pedidos al montar el componente
  useEffect(() => {
    refetch();
    if (pollIntervalMs > 0) {
      const interval = setInterval(() => {
        void refetch();
      }, pollIntervalMs);
      return () => clearInterval(interval);
    }
    return;
  }, [refetch, pollIntervalMs]);

  // Suscribirse a eventos de socket
  useEffect(() => {
    if (!socketConnected) {
      return;
    }

    try {
      const socket = getSocketManager();
      if (!socket) {
        return;
      }

      const unsubCreateOrder = socket.on('order:created', (newOrder: Order) => {
        setOrders((prev) => [normalizeOrderRecord(newOrder), ...prev]);
      });

      const unsubUpdateOrder = socket.on(
        'order:updated',
        (updatedOrder: Order) => {
          setOrders((prev) =>
            prev.map((order) =>
              order.id === updatedOrder.id
                ? normalizeOrderRecord(updatedOrder)
                : order
            )
          );
        }
      );

      const unsubDeleteOrder = socket.on(
        'order:deleted',
        (data: { orderId: number }) => {
          setOrders((prev) =>
            prev.filter((order) => order.id !== data.orderId)
          );
        }
      );

      return () => {
        if (unsubCreateOrder) unsubCreateOrder();
        if (unsubUpdateOrder) unsubUpdateOrder();
        if (unsubDeleteOrder) unsubDeleteOrder();
      };
    } catch (error) {
      console.error('Error setting up socket listeners:', error);
      return;
    }
  }, [socketConnected]);

  // Completar pedido
  const completeOrder = useCallback(
    async (orderId: number, reason: string, mensaje?: string) => {
      try {
        const response = await api.patch(`/orders/${orderId}/complete`, {
          reason,
          mensaje,
        });

        const normalized = normalizeOrderRecord(response.data.order);
        setOrders((prev) =>
          prev.map((order) => (order.id === orderId ? normalized : order))
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to complete order';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Actualizar pedido
  const updateOrder = useCallback(
    async (
      orderId: number,
      data: { notas?: string; especificaciones?: string }
    ) => {
      try {
        const response = await api.patch(`/orders/${orderId}`, data);

        const normalized = normalizeOrderRecord(response.data);
        setOrders((prev) =>
          prev.map((order) => (order.id === orderId ? normalized : order))
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update order';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Actualizar solo el estado del pedido
  const updateOrderStatus = useCallback(
    async (
      orderId: number,
      status: 'PENDING' | 'CONFIRMADO' | 'COMPLETADO' | 'CANCELADO'
    ) => {
      try {
        const response = await api.patch(`/orders/${orderId}/status`, {
          status,
        });

        const normalizedStatus = response.data.status || status;
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? { ...order, status: normalizedStatus }
              : order
          )
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update order status';
        setError(message);
        throw err;
      }
    },
    []
  );

  // Eliminar/cancelar pedido
  const deleteOrder = useCallback(async (orderId: number) => {
    try {
      await api.delete(`/orders/${orderId}`);

      setOrders((prev) => prev.filter((order) => order.id !== orderId));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete order';
      setError(message);
      throw err;
    }
  }, []);

  return {
    orders,
    loading,
    error,
    refetch,
    completeOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
  };
}
