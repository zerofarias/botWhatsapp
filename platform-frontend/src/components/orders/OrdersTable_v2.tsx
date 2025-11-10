/**
 * OrdersTable_v2 - Tabla de pedidos estilo WhatsApp
 * Muestra todos los pedidos con opciones para ver, editar y completar
 */

import React from 'react';
import { Order, useOrders } from '../../hooks/v2/useOrders';
import './OrdersTable_v2.css';

interface Props {
  onSelectOrder?: (order: Order) => void;
  onCompleteClick?: (order: Order) => void;
  onChatClick?: (order: Order) => void;
}

const calculateDuration = (createdAt: string, closedAt?: string): string => {
  if (!closedAt) {
    // Mostrar tiempo elapsed desde que llegó
    const now = new Date();
    const created = new Date(createdAt);
    const diff = now.getTime() - created.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  } else {
    // Mostrar duración final
    const created = new Date(createdAt);
    const closed = new Date(closedAt);
    const diff = closed.getTime() - created.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig = {
    PENDING: { label: 'Pendiente', icon: '🟡', color: 'yellow' },
    CONFIRMADO: { label: 'Confirmado', icon: '🟢', color: 'green' },
    COMPLETADO: { label: 'Completado', icon: '✅', color: 'blue' },
    CANCELADO: { label: 'Cancelado', icon: '❌', color: 'red' },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;

  return (
    <span className={`status-badge status-${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
};

export const OrdersTable_v2: React.FC<Props> = ({
  onSelectOrder,
  onCompleteClick,
  onChatClick,
}) => {
  const { orders, loading, error } = useOrders();

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
                {new Date(order.createdAt).toLocaleTimeString('es-AR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="order-time">
                {order.closedAt
                  ? new Date(order.closedAt).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </td>
              <td className="order-duration">
                {calculateDuration(order.createdAt, order.closedAt)}
              </td>
              <td className="order-status">
                <StatusBadge status={order.status} />
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
