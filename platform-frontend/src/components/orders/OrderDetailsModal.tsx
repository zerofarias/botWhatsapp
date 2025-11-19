import React, { useMemo } from 'react';
import { Order } from '../../hooks/v2/useOrders';
import {
  extractOrderField,
  getOrderAttachments,
  resolveAttachmentKind,
  type OrderAttachmentMeta,
  type OrderAttachmentKind,
} from '../../utils/orderMeta';
import { getFullMediaUrl } from '../../utils/urls';
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
          typeof item?.nombre === 'string'
            ? item.nombre
            : `Item ${index + 1}`,
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

const ATTACHMENT_LABELS: Record<OrderAttachmentKind, string> = {
  image: 'Imagen',
  audio: 'Audio',
  video: 'Video',
  document: 'Documento',
  location: 'Ubicación',
  file: 'Archivo',
};

const getAttachmentLabel = (attachment: OrderAttachmentMeta) =>
  ATTACHMENT_LABELS[resolveAttachmentKind(attachment)];

const formatAttachmentDate = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getAttachmentDescription = (attachment: OrderAttachmentMeta): string => {
  if (attachment.caption?.trim()) {
    return attachment.caption.trim();
  }
  if (attachment.text?.trim()) {
    return attachment.text.trim();
  }
  if (attachment.fileName?.trim()) {
    return attachment.fileName.trim();
  }
  return 'Sin descripción adicional';
};

const renderAttachmentPreview = (attachment: OrderAttachmentMeta) => {
  const url = getFullMediaUrl(attachment.url);
  const kind = resolveAttachmentKind(attachment);
  if (kind === 'image') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="attachment-preview attachment-preview--image"
      >
        <img src={url} alt={attachment.caption ?? 'Imagen adjunta'} />
      </a>
    );
  }
  if (kind === 'audio') {
    return (
      <div className="attachment-preview attachment-preview--audio">
        <audio controls src={url} preload="none" />
      </div>
    );
  }
  if (kind === 'video') {
    return (
      <div className="attachment-preview attachment-preview--video">
        <video controls src={url} preload="metadata" />
      </div>
    );
  }
  return (
    <div className="attachment-preview attachment-preview--file">
      <span className="attachment-preview-icon">📎</span>
      <a href={url} target="_blank" rel="noopener noreferrer">
        Abrir archivo
      </a>
    </div>
  );
};

const OrderDetailsModal: React.FC<Props> = ({ order, isOpen, onClose }) => {
  const parsedItems = useMemo(() => parseItems(order?.itemsJson), [order]);
  const attachments = useMemo(
    () => (order ? getOrderAttachments(order) : []),
    [order]
  );

  if (!isOpen || !order) return null;

  const concept =
    extractOrderField(order, 'concept') ||
    order.tipoConversacion ||
    'General';
  const requestDetail = extractOrderField(order, 'requestDetails');
  const customerNotes = extractOrderField(order, 'customerData');
  const paymentMethod = extractOrderField(order, 'paymentMethod');

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
          <h3>Resumen del pedido</h3>
          <div className="order-summary-grid">
            <div className="summary-card summary-card--highlight">
              <span>Concepto del pedido</span>
              <strong>{concept || 'Sin concepto registrado'}</strong>
            </div>
            <div className="summary-card">
              <span>Detalle de lo solicitado</span>
              <p>{requestDetail || 'Sin detalle registrado'}</p>
            </div>
            <div className="summary-card">
              <span>Datos adicionales del cliente</span>
              <p>{customerNotes || 'Sin información extra'}</p>
            </div>
            <div className="summary-card">
              <span>Método de pago</span>
              <p>{paymentMethod || 'No especificado'}</p>
            </div>
          </div>
        </section>
        <section className="order-details-section">
          <h3>Datos del contacto</h3>
          <div className="order-details-grid">
            <span>Telefono</span>
            <strong>{order.clientPhone}</strong>
            <span>Tipo</span>
            <strong>{order.tipoConversacion}</strong>
            <span>Estado</span>
            <strong>{order.status}</strong>
          </div>
        </section>
        {attachments.length > 0 && (
          <section className="order-details-section">
            <h3>Adjuntos recibidos</h3>
            <div className="order-attachments-grid">
              {attachments.map((attachment, index) => {
                const timestamp = formatAttachmentDate(attachment.capturedAt);
                const fileUrl = getFullMediaUrl(attachment.url);
                return (
                  <article
                    key={`${attachment.url}-${index}`}
                    className="attachment-card"
                  >
                    {renderAttachmentPreview(attachment)}
                    <div className="attachment-info">
                      <p className="attachment-title">
                        {getAttachmentLabel(attachment)}
                      </p>
                      <p className="attachment-description">
                        {getAttachmentDescription(attachment)}
                      </p>
                      <div className="attachment-meta">
                        {attachment.variable && (
                          <span>Variable: {attachment.variable}</span>
                        )}
                        {timestamp && <span>{timestamp}</span>}
                      </div>
                      <div className="attachment-actions">
                        <a
                          className="attachment-open-btn"
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Abrir
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        <section className="order-details-section">
          <h3>Detalle completo</h3>
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
              No hay informacion estructurada del pedido.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
