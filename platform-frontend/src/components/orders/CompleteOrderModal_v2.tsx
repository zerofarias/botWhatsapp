/**
 * CompleteOrderModal_v2 - Modal para completar/cancelar pedidos
 */

import React, { useState } from 'react';
import { Order, useOrders } from '../../hooks/v2/useOrders';
import './CompleteOrderModal_v2.css';

interface Props {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (order: Order) => void;
}

const reasons = [
  {
    value: 'COMPLETADO',
    label: '✅ Completado',
    icon: '✅',
    description: 'Pedido entregado/listo',
  },
  {
    value: 'CANCELADO_CLIENTE',
    label: '❌ Cancelado por Cliente',
    icon: '❌',
    description: 'Cliente decidió cancelar',
  },
  {
    value: 'ARREPENTIDO',
    label: '😞 Arrepentido',
    icon: '😞',
    description: 'Cliente se arrepintió',
  },
  {
    value: 'INACTIVIDAD',
    label: '⏱️ Inactividad',
    icon: '⏱️',
    description: 'Sin respuesta del cliente',
  },
];

export const CompleteOrderModal_v2: React.FC<Props> = ({
  order,
  isOpen,
  onClose,
  onComplete,
}) => {
  const { completeOrder } = useOrders();
  const [selectedReason, setSelectedReason] = useState<string>('COMPLETADO');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!order) return;

    setLoading(true);
    setError(null);

    try {
      await completeOrder(order.id, selectedReason, customMessage);
      onComplete(order);
      handleClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al completar pedido';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('COMPLETADO');
    setCustomMessage('');
    setError(null);
    onClose();
  };

  if (!isOpen || !order) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cerrar Pedido #{order.id}</h2>
          <button className="close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
            <div className="order-info">
              <div className="info-row">
                <span className="label">Cliente:</span>
                <span className="value">
                  {order.clientName || 'Desconocido'}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Teléfono:</span>
                <span className="value">{order.clientPhone}</span>
              </div>
            </div>

            <div className="reason-section">
              <label className="section-label">Razón de cierre:</label>
              <div className="reason-options">
                {reasons.map((reason) => (
                  <label key={reason.value} className="reason-option">
                    <input
                      type="radio"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={(e) => setSelectedReason(e.target.value)}
                    />
                    <span className="reason-content">
                      <span className="reason-icon">{reason.icon}</span>
                      <span className="reason-text">
                        <span className="reason-label">{reason.label}</span>
                        <span className="reason-description">
                          {reason.description}
                        </span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {selectedReason === 'COMPLETADO' && (
              <div className="message-section">
                <label className="section-label">
                  Mensaje personalizado (opcional):
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="ej: Tu pedido está listo para retirar"
                  rows={3}
                  className="custom-message"
                />
              </div>
            )}

            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompleteOrderModal_v2;
