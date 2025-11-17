import React, { useMemo } from 'react';
import { Order } from '../../hooks/v2/useOrders';
import './OrderDetailsModal.css';

interface Props {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

type ParsedItems =
  | Array<{ label: string; value: string }>
  | string
  | null
  | undefined;

function parseItems(itemsJson?: string): ParsedItems {
  if (!itemsJson) return null;
  try {
    const parsed = JSON.parse(itemsJson);
    if (Array.isArray(parsed)) {
      return parsed.map((item, index) => ({
        label:
          typeof item?.nombre === 'string' ? item.nombre : `Ítem ${index + 1}`,
        value: [
          item?.cantidad ? `Cant: ${item.cantidad}` : null,
          item?.descripcion ?? item?.detalle ?? null,
        ]
          .filter(Boolean)
          .join(' · '),
      }));
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.entries(parsed).map(([key, value]) => ({
        label: key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      }));
    }
    if (typeof parsed === 'string') {
      return parsed;
    }
    return JSON.stringify(parsed);
  } catch {
    return itemsJson;
  }
}

const OrderDetailsModal: React.FC<Props> = ({ order, isOpen, onClose }) => {
  const parsedItems = useMemo(() => parseItems(order?.itemsJson), [order]);

  if (!isOpen || !order) return null;

  return (
    <div className="order-details-overlay" onClick={onClose}>
      <div
        className="order-details-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="order-details-header">
          <div>
            <p>Pedido #{order.id}</p>
            <h2>{order.clientName || 'Cliente desconocido'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        <section className="order-details-section">
          <h3>Datos del cliente</h3>
          <div className="order-details-grid">
            <span>Teléfono</span>
            <strong>{order.clientPhone}</strong>
            <span>Tipo</span>
            <strong>{order.tipoConversacion}</strong>
            <span>Estado</span>
            <strong>{order.status}</strong>
          </div>
        </section>
        <section className="order-details-section">
          <h3>Pedido</h3>
          {Array.isArray(parsedItems) ? (
            <ul className="order-details-list">
              {parsedItems.map((item, index) => (
                <li key={`${item.label}-${index}`}>
                  <strong>{item.label}</strong>
                  <p>{item.value}</p>
                </li>
              ))}
            </ul>
          ) : parsedItems ? (
            <pre className="order-details-raw">{parsedItems}</pre>
          ) : (
            <p className="order-details-empty">
              No hay información estructurada del pedido.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
