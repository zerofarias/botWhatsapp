/**
 * OrdersPage_v2 - Panel de Pedidos
 * Página principal para gestionar todos los pedidos
 */

import React, { useState, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { useNavigate } from 'react-router-dom';
import { Order } from '../hooks/v2/useOrders';
import OrdersTable_v2 from '../components/orders/OrdersTable_v2';
import CompleteOrderModal_v2 from '../components/orders/CompleteOrderModal_v2';
import './OrdersPage_v2.css';

const OrdersPage_v2: React.FC = () => {
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(
    undefined
  );
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectOrder = useCallback((order: Order) => {
    setSelectedOrder(order);
  }, []);

  const handleCompleteClick = useCallback((order: Order) => {
    setSelectedOrder(order);
    setIsCompleteModalOpen(true);
  }, []);

  const handleChatClick = useCallback(
    (order: Order) => {
      // Redirigir al chat con esa conversación
      useChatStore.setState({ activeConversationId: order.conversationId });
      navigate('/dashboard/chat2');
    },
    [navigate]
  );

  const handleCompleteOrder = useCallback((order: Order) => {
    setIsCompleteModalOpen(false);
    setSelectedOrder(null);
  }, []);

  return (
    <div className="orders-page-v2">
      <div className="orders-header">
        <h1>📦 Panel de Pedidos</h1>
      </div>

      <div className="orders-controls">
        <div className="control-group">
          <label>Estado:</label>
          <select
            value={filterStatus || ''}
            onChange={(e) => setFilterStatus(e.target.value || undefined)}
            className="filter-select"
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="CONFIRMADO">Confirmados</option>
            <option value="COMPLETADO">Completados</option>
            <option value="CANCELADO">Cancelados</option>
          </select>
        </div>

        <div className="control-group search">
          <input
            type="text"
            placeholder="Buscar por cliente o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="orders-content">
        <OrdersTable_v2
          onSelectOrder={handleSelectOrder}
          onCompleteClick={handleCompleteClick}
          onChatClick={handleChatClick}
        />
      </div>

      <CompleteOrderModal_v2
        order={selectedOrder}
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        onComplete={handleCompleteOrder}
      />
    </div>
  );
};

export default OrdersPage_v2;
