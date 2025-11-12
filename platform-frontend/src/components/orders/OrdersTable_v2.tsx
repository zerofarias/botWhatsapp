/**
 * OrdersTable_v2.tsx - Tabla de pedidos estilo WhatsApp
 * Muestra todos los pedidos con opciones para ver, editar y completar
 */

import React, { useState, useCallback } from 'react';
import { useOrders, Order } from '../../hooks/v2/useOrders';
import './OrdersTable_v2.css';

interface Props {
  onSelectOrder?: (order: Order) => void;
  onCompleteClick?: (order: Order) => void;
  onChatClick?: (order: Order) => void;
}

// Calcular duración entre dos fechas
const calculateDuration = (startDate: string, endDate?: string): string => {
  try {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();

    // Verificar si las fechas son válidas
    if (isNaN(start.getTime())) {
      return 'Error fecha';
    }

    if (endDate && isNaN(end.getTime())) {
      return 'Error fecha';
    }

    const diffInMilliseconds = end.getTime() - start.getTime();

    if (diffInMilliseconds < 0) {
      return '0min';
    }

    const diffInMinutes = Math.floor(diffInMilliseconds / 1000 / 60);

    if (diffInMinutes < 60) {
      return `${diffInMinutes}min`;
    }

    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;

    if (hours < 24) {
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  } catch (error) {
    console.error('Error calculating duration:', error, { startDate, endDate });
    return 'Error';
  }
};

// Función para formatear fecha de manera segura
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Fecha inválida';
    }

    const dateFormatted = date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });

    const timeFormatted = date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${dateFormatted} ${timeFormatted}`;
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return 'Error fecha';
  }
};

// Componente select para estado
const StatusSelect: React.FC<{
  status: string;
  orderId: number;
  onStatusChange: (orderId: number, status: string) => void;
  disabled?: boolean;
}> = ({ status, orderId, onStatusChange, disabled = false }) => {
  const statusOptions = [
    { value: 'PENDING', label: '🟡 Pendiente' },
    { value: 'CONFIRMADO', label: '🔵 En Proceso' },
    { value: 'COMPLETADO', label: '🟢 Completado' },
    { value: 'CANCELADO', label: '🔴 Cancelado' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    if (newStatus !== status) {
      onStatusChange(orderId, newStatus);
    }
  };

  const statusClass = status.toLowerCase();

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={disabled}
      className={`status-select ${statusClass}`}
    >
      {statusOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
import './OrdersTable_v2.css';

interface Props {
  onSelectOrder?: (order: Order) => void;
  onCompleteClick?: (order: Order) => void;
  onChatClick?: (order: Order) => void;
}

export const OrdersTable_v2: React.FC<Props> = ({
  onSelectOrder,
  onCompleteClick,
  onChatClick,
}) => {
  const { orders, loading, error, updateOrderStatus } = useOrders();
  const [updatingOrders, setUpdatingOrders] = useState<Set<number>>(new Set());

  // Debug: Ver el formato de datos que llega
  React.useEffect(() => {
    if (orders.length > 0) {
      console.log('Orders data sample:', {
        firstOrder: orders[0],
        createdAt: orders[0]?.createdAt,
        closedAt: orders[0]?.closedAt,
        createdAtType: typeof orders[0]?.createdAt,
        parsedCreatedAt: orders[0]?.createdAt
          ? new Date(orders[0].createdAt)
          : null,
      });
    }
  }, [orders]);

  // Manejar cambio de estado
  const handleStatusChange = useCallback(
    async (orderId: number, newStatus: string) => {
      try {
        setUpdatingOrders((prev: Set<number>) => new Set(prev).add(orderId));
        await updateOrderStatus(
          orderId,
          newStatus as 'PENDING' | 'CONFIRMADO' | 'COMPLETADO' | 'CANCELADO'
        );
      } catch (error) {
        console.error('Error updating order status:', error);
        // TODO: Mostrar toast de error
      } finally {
        setUpdatingOrders((prev: Set<number>) => {
          const newSet = new Set(prev);
          newSet.delete(orderId);
          return newSet;
        });
      }
    },
    [updateOrderStatus]
  );

  if (error) {
    return <div className="orders-table error">Error: {error}</div>;
  }

  if (loading) {
    return <div className="orders-table loading">Cargando pedidos...</div>;
  }

  if (orders.length === 0) {
    return <div className="orders-table empty">No hay pedidos</div>;
  }

  return (
    <div className="orders-table-container">
      <table className="orders-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Teléfono</th>
            <th>Llegó</th>
            <th>Cerrado</th>
            <th>Duración</th>
            <th>Estado</th>
            <th>Motivo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="order-row">
              <td className="order-id">#{order.id}</td>
              <td className="order-client">
                <div className="client-info">
                  <span className="client-name">
                    {order.clientName || 'Desconocido'}
                  </span>
                  <span className="client-type">{order.tipoConversacion}</span>
                </div>
              </td>
              <td className="order-phone">{order.clientPhone}</td>
              <td className="order-time">
                <div className="datetime-display">
                  {formatDate(order.createdAt)}
                </div>
              </td>
              <td className="order-time">
                {order.closedAt ? (
                  <div className="datetime-display">
                    {formatDate(order.closedAt)}
                  </div>
                ) : (
                  <span style={{ color: '#ccc', fontStyle: 'italic' }}>
                    Pendiente
                  </span>
                )}
              </td>
              <td className="order-duration">
                {calculateDuration(order.createdAt, order.closedAt)}
              </td>
              <td className="order-status">
                <StatusSelect
                  status={order.status}
                  orderId={order.id}
                  onStatusChange={handleStatusChange}
                  disabled={updatingOrders.has(order.id)}
                />
              </td>
              <td className="order-reason">
                {order.closeReason ? (
                  <span className="reason-badge">{order.closeReason}</span>
                ) : (
                  '—'
                )}
              </td>
              <td className="order-actions">
                <button
                  className="action-btn view-btn"
                  onClick={() => onSelectOrder?.(order)}
                  title="Ver detalles"
                >
                  👁️
                </button>
                <button
                  className="action-btn chat-btn"
                  onClick={() => onChatClick?.(order)}
                  title="Abrir chat"
                >
                  💬
                </button>
                {order.status === 'PENDING' && (
                  <button
                    className="action-btn complete-btn"
                    onClick={() => onCompleteClick?.(order)}
                    title="Completar"
                  >
                    ✓
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersTable_v2;
