import React, { useEffect, useMemo, useState } from 'react';
import { Order, useOrders } from '../../hooks/v2/useOrders';
import './CompleteOrderModal_v2.css';

interface Props {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (order: Order) => void;
}

const STATUS_CHOICES: Array<{
  value: Order['status'];
  label: string;
  description: string;
  finalizes: boolean;
}> = [
  {
    value: 'PENDING',
    label: 'Pendiente',
    description: 'Pedido en espera.',
    finalizes: false,
  },
  {
    value: 'CONFIRMADO',
    label: 'En preparación',
    description: 'Operario trabajando en el pedido.',
    finalizes: false,
  },
  {
    value: 'COMPLETADO',
    label: 'Completado',
    description: 'Cierra el chat y envía mensaje de cierre.',
    finalizes: true,
  },
  {
    value: 'CANCELADO',
    label: 'Cancelado',
    description: 'Cierra el chat e informa el motivo.',
    finalizes: true,
  },
];

const CLOSING_REASONS = [
  {
    value: 'COMPLETADO',
    label: '🏁 Pedido entregado',
    icon: '🏁',
    description: 'Pedido finalizado correctamente.',
  },
  {
    value: 'CANCELADO_CLIENTE',
    label: '🙋 Cancelado por cliente',
    icon: '🙋',
    description: 'El cliente decidió cancelar.',
  },
  {
    value: 'ARREPENTIDO',
    label: '🤷 Arrepentido',
    icon: '🤷',
    description: 'El cliente cambió de opinión.',
  },
  {
    value: 'INACTIVIDAD',
    label: '⏱️ Inactividad',
    icon: '⏱️',
    description: 'Sin respuesta del cliente.',
  },
];

const CompleteOrderModal_v2: React.FC<Props> = ({
  order,
  isOpen,
  onClose,
  onComplete,
}) => {
  const { completeOrder, updateOrderStatus } = useOrders();
  const [selectedStatus, setSelectedStatus] =
    useState<Order['status']>('PENDING');
  const [selectedReason, setSelectedReason] = useState<string>('COMPLETADO');
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setSelectedStatus(order.status);
      setSelectedReason(
        order.status === 'CANCELADO' ? 'CANCELADO_CLIENTE' : 'COMPLETADO'
      );
      setCustomMessage('');
      setError(null);
    }
  }, [order]);

  const isClosingStatus = useMemo(
    () => selectedStatus === 'COMPLETADO' || selectedStatus === 'CANCELADO',
    [selectedStatus]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!order) return;
    setLoading(true);
    setError(null);

    try {
      if (isClosingStatus) {
        await completeOrder(order.id, selectedReason, customMessage);
      } else {
        await updateOrderStatus(order.id, selectedStatus);
      }
      onComplete(order);
      handleClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al actualizar el pedido';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedStatus(order?.status ?? 'PENDING');
    setSelectedReason(
      order?.status === 'CANCELADO' ? 'CANCELADO_CLIENTE' : 'COMPLETADO'
    );
    setCustomMessage('');
    setError(null);
    onClose();
  };

  if (!isOpen || !order) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cambiar estado del Pedido #{order.id}</h2>
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
                  {order.clientName || order.conversation?.contactName || 'N/D'}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Teléfono:</span>
                <span className="value">{order.clientPhone}</span>
              </div>
            </div>

            <div className="status-section">
              <label className="section-label">Selecciona el estado:</label>
              <div className="status-options">
                {STATUS_CHOICES.map((choice) => (
                  <label key={choice.value} className="status-option">
                    <input
                      type="radio"
                      value={choice.value}
                      checked={selectedStatus === choice.value}
                      onChange={(event) =>
                        setSelectedStatus(event.target.value as Order['status'])
                      }
                    />
                    <span className="status-content">
                      <span className="status-label">{choice.label}</span>
                      <span className="status-description">
                        {choice.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {isClosingStatus ? (
              <div className="reason-section">
                <label className="section-label">Motivo:</label>
                <div className="reason-options">
                  {CLOSING_REASONS.map((reason) => (
                    <label key={reason.value} className="reason-option">
                      <input
                        type="radio"
                        value={reason.value}
                        checked={selectedReason === reason.value}
                        onChange={(event) =>
                          setSelectedReason(event.target.value)
                        }
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
            ) : (
              <div className="info-hint">
                Este cambio no cierra el pedido; permanecerá abierto para
                seguimiento.
              </div>
            )}

            {isClosingStatus && (
              <div className="message-section">
                <label className="section-label">
                  Mensaje personalizado (opcional):
                </label>
                <textarea
                  value={customMessage}
                  onChange={(event) => setCustomMessage(event.target.value)}
                  placeholder="Ej: Tu pedido está listo para retirar"
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
              {loading ? 'Procesando...' : 'Actualizar estado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompleteOrderModal_v2;
