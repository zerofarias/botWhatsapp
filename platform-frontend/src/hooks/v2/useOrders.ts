/**
 * useOrders v2 - Hook para gestionar pedidos
 * Carga, filtra y actualiza pedidos en tiempo real
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { getSocketManager } from '../../services/socket/SocketManager';

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
  notas?: string;
  especificaciones?: string;
  status: 'PENDING' | 'CONFIRMADO' | 'COMPLETADO' | 'CANCELADO';
  closeReason?: string;
  createdAt: string;
  closedAt?: string;
  updatedAt: string;
  conversation?: {
    userPhone: string;
    contactName?: string;
  };
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

export function useOrders(status?: string, search?: string): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar pedidos del servidor
  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (search) params.append('search', search);

      const response = await api.get(`/orders?${params.toString()}`);
      setOrders(response.data.orders || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load orders';
      setError(message);
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  // Cargar pedidos al montar el componente
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Suscribirse a eventos de socket
  useEffect(() => {
    try {
      const socket = getSocketManager();

      // Si el socket no está inicializado, no hacer nada
      if (!socket) {
        console.log(
          '[useOrders] Socket manager not initialized yet, skipping socket setup'
        );
        return;
      }

      // Crear unsubscribe functions
      const unsubCreateOrder = socket.on('order:created', (newOrder: Order) => {
        setOrders((prev) => [newOrder, ...prev]);
      });

      const unsubUpdateOrder = socket.on(
        'order:updated',
        (updatedOrder: Order) => {
          setOrders((prev) =>
            prev.map((order) =>
              order.id === updatedOrder.id ? updatedOrder : order
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
        // Solo hacer cleanup si las funciones existen
        if (unsubCreateOrder) unsubCreateOrder();
        if (unsubUpdateOrder) unsubUpdateOrder();
        if (unsubDeleteOrder) unsubDeleteOrder();
      };
    } catch (error) {
      console.error('Error setting up socket listeners:', error);
      return;
    }
  }, []);

  // Completar pedido
  const completeOrder = useCallback(
    async (orderId: number, reason: string, mensaje?: string) => {
      try {
        const response = await api.patch(`/orders/${orderId}/complete`, {
          reason,
          mensaje,
        });

        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? response.data.order : order
          )
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

        setOrders((prev) =>
          prev.map((order) => (order.id === orderId ? response.data : order))
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

        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? { ...order, status: response.data.status || status }
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
