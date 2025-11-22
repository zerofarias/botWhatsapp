/**
 * OrdersTable_v2.tsx - Tabla de pedidos con controles modernos y DataTable
 */

import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import DataTable, { type TableColumn } from 'react-data-table-component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  useOrders,
  type Order,
  type OrderFilters,
} from '../../hooks/v2/useOrders';
import {
  extractOrderField,
  getOrderAttachments,
  resolveAttachmentKind,
  type OrderAttachmentMeta,
} from '../../utils/orderMeta';
import './OrdersTable_v2.css';

interface Props {
  onSelectOrder?: (order: Order) => void;
  onCompleteClick?: (order: Order) => void;
  onChatClick?: (order: Order) => void;
  onInspectOrder?: (order: Order) => void;
  onNewOrder?: (order: Order) => void;
  statusFilter?: string;
  searchQuery?: string;
  pollIntervalMs?: number;
  filters?: OrderFilters;
  refreshToken?: number;
}

const exportStructure = [
  { key: 'pedido', label: 'Pedido' },
  { key: 'concepto', label: 'Concepto' },
  { key: 'detalle', label: 'Detalle' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'dni', label: 'DNI' },
  { key: 'telefono', label: 'Telefono' },
  { key: 'metodoPago', label: 'Metodo de pago' },
  { key: 'estado', label: 'Estado' },
  { key: 'creado', label: 'Creado' },
  { key: 'completado', label: 'Completado' },
] as const;

type ExportKey = (typeof exportStructure)[number]['key'];
type ExportRow = Record<ExportKey, string>;

const dataTableCustomStyles = {
  headCells: {
    style: {
      paddingTop: '16px',
      paddingBottom: '16px',
      fontSize: '0.85rem',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      color: '#0f172a',
      backgroundColor: '#f8fafc',
      borderBottom: '2px solid #e2e8f0',
      letterSpacing: '0.3px',
    },
  },
  rows: {
    style: {
      minHeight: '130px',
      borderBottom: '1px solid #e2e8f0',
      backgroundColor: '#ffffff',
      transition: 'all 0.2s ease',
    },
    stripedStyle: {
      backgroundColor: '#f9fafb',
    },
    highlightOnHoverStyle: {
      backgroundColor: '#f0f9ff',
      cursor: 'pointer',
    },
  },
  cells: {
    style: {
      paddingTop: '16px',
      paddingBottom: '16px',
      color: '#0f172a',
    },
  },
};

const escapeHtmlValue = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const normalizeDateInput = (
  value: string | number | Date | null | undefined
) => {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.length) return null;
    if (/^\d+$/.test(trimmed)) {
      const timestamp = Number(trimmed);
      if (!Number.isNaN(timestamp)) {
        return new Date(timestamp);
      }
    }
    return new Date(trimmed.replace(' ', 'T'));
  }
  return null;
};

const formatRelativeTime = (
  value: string | number | Date | null | undefined
): string => {
  const date = normalizeDateInput(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'recién';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'hace instantes';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `hace ${hours} h ${rest} min` : `hace ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
};

const formatDate = (
  value: string | number | Date | null | undefined
): string => {
  const date = normalizeDateInput(value);
  if (!date || Number.isNaN(date.getTime())) {
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
};

const calculateDuration = (
  startDate: string | number | Date,
  endDate?: string | number | Date | null
): string => {
  const start = normalizeDateInput(startDate);
  const end = normalizeDateInput(endDate) ?? new Date();
  if (
    !start ||
    !end ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return 'Sin datos';
  }

  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return '0 min';

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) return `${diffMinutes} min`;

  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) {
    const minutes = diffMinutes % 60;
    return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days} d ${remainingHours} h` : `${days} d`;
};

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CONFIRMADO', label: 'En preparación' },
  { value: 'COMPLETADO', label: 'Completado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

const getDisplayName = (order: Order) =>
  order.conversation?.contactName ||
  order.conversation?.contact?.name ||
  order.clientName ||
  'Sin nombre';

const getDni = (order: Order) => order.conversation?.contact?.dni || '—';

const getOrderConcept = (order: Order): string => {
  const concept = extractOrderField(order, 'concept');
  if (concept.length) {
    return concept;
  }
  return order.tipoConversacion || 'General';
};

const getOrderRequestDetail = (order: Order): string =>
  extractOrderField(order, 'requestDetails');

const getOrderCustomerData = (order: Order): string =>
  extractOrderField(order, 'customerData');

const getOrderPaymentMethod = (order: Order): string =>
  extractOrderField(order, 'paymentMethod');

const attachmentChipLabel = (attachment: OrderAttachmentMeta): string => {
  const kind = resolveAttachmentKind(attachment);
  switch (kind) {
    case 'image':
      return '🖼️ Imagen';
    case 'audio':
      return '🎧 Audio';
    case 'video':
      return '🎬 Video';
    case 'location':
      return '📍 Ubicación';
    case 'document':
      return '📄 Documento';
    default:
      return '📎 Archivo';
  }
};

const attachmentChipClass = (attachment: OrderAttachmentMeta): string =>
  `attachment-chip attachment-chip--${resolveAttachmentKind(attachment)}`;


const OrdersTable_v2: React.FC<Props> = ({
  onSelectOrder,
  onCompleteClick,
  onChatClick,
  onInspectOrder,
  onNewOrder,
  statusFilter,
  searchQuery,
  pollIntervalMs = 20000,
  filters,
  refreshToken = 0,
}) => {
  const { orders, loading, error } = useOrders(
    statusFilter,
    searchQuery,
    pollIntervalMs,
    filters,
    refreshToken
  );
  const knownIdsRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);
  const triedAudioRef = useRef(false);
  const [recentOrderIds, setRecentOrderIds] = useState<Set<number>>(
    () => new Set()
  );
  const [unreadOrderIds, setUnreadOrderIds] = useState<Set<number>>(
    () => new Set()
  );

  useEffect(() => {
    knownIdsRef.current = new Set();
    initializedRef.current = false;
  }, [statusFilter, searchQuery]);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const aDate = new Date(a.createdAt).getTime();
        const bDate = new Date(b.createdAt).getTime();
        return bDate - aDate;
      }),
    [orders]
  );

  const exportRows = useMemo<ExportRow[]>(() => {
    return sortedOrders.map((order) => ({
      pedido: `#${order.id}`,
      concepto: getOrderConcept(order),
      detalle: getOrderRequestDetail(order) || 'Sin detalle',
      cliente: getDisplayName(order),
      dni: getDni(order),
      telefono: order.clientPhone,
      metodoPago: getOrderPaymentMethod(order) || 'Sin dato',
      estado: order.status,
      creado: formatDate(order.createdAt),
      completado: order.closedAt ? formatDate(order.closedAt) : 'Pendiente',
    }));
  }, [sortedOrders]);

  useEffect(() => {
    const currentIds = new Set(sortedOrders.map((order) => order.id));
    const newOnes = sortedOrders.filter(
      (order) => !knownIdsRef.current.has(order.id)
    );
    if (initializedRef.current && newOnes.length > 0) {
      newOnes.forEach((order) => onNewOrder?.(order));
      const audio = new Audio('/notification.mp3');
      audio.play().then(
        () => {
          triedAudioRef.current = true;
        },
        (error) => {
          if (triedAudioRef.current) {
            console.warn('[OrdersTable] Notification sound failed', error);
          }
        }
      );
      setRecentOrderIds((prev) => {
        const next = new Set(prev);
        newOnes.forEach((order) => next.add(order.id));
        return next;
      });
      setUnreadOrderIds((prev) => {
        const next = new Set(prev);
        newOnes.forEach((order) => next.add(order.id));
        return next;
      });
    }
    if (!initializedRef.current && sortedOrders.length > 0) {
      initializedRef.current = true;
    }
    knownIdsRef.current = currentIds;
  }, [sortedOrders, onNewOrder]);

  useEffect(() => {
    setUnreadOrderIds((prev) => {
      const next = new Set<number>();
      prev.forEach((id) => {
        if (knownIdsRef.current.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [sortedOrders]);

  const markOrderAsRead = useCallback((orderId: number) => {
    setUnreadOrderIds((prev) => {
      if (!prev.has(orderId)) return prev;
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
    setRecentOrderIds((prev) => {
      if (!prev.has(orderId)) return prev;
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    if (!exportRows.length) return;
    const header = exportStructure.map((field) => field.label);
    const rows = exportRows.map((row) =>
      exportStructure.map((field) => row[field.key])
    );
    const csvContent = [header, ...rows]
      .map((line) =>
        line.map((value) => `"${(value ?? '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pedidos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportRows]);

  const handleExportPDF = useCallback(() => {
    if (!exportRows.length) return;
    const doc = new jsPDF('landscape');
    autoTable(doc, {
      head: [exportStructure.map((field) => field.label)],
      body: exportRows.map((row) =>
        exportStructure.map((field) => row[field.key])
      ),
      styles: {
        fontSize: 10,
      },
      headStyles: {
        fillColor: [14, 165, 233],
      },
    });
    doc.save(`pedidos_${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [exportRows]);

  const handlePrint = useCallback(() => {
    if (!exportRows.length) return;
    const tableRows = exportRows
      .map(
        (row) =>
          `<tr>${exportStructure
            .map((field) => `<td>${escapeHtmlValue(row[field.key] ?? '')}</td>`)
            .join('')}</tr>`
      )
      .join('');
    const tableHead = exportStructure
      .map((field) => `<th>${field.label}</th>`)
      .join('');
    const printWindow = window.open('', '', 'width=1000,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Pedidos</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5f5; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #e2e8f0; }
            caption { font-size: 18px; margin-bottom: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <caption>Listado de pedidos</caption>
          <table>
            <thead><tr>${tableHead}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [exportRows]);

  const columns = useMemo<TableColumn<Order>[]>(() => {
  return [
    {
      name: 'Pedido',
      grow: 1.2,
      cell: (order) => (
        <div className="order-overview">
          <div className="order-id-row">
            <span className="order-tag">{getOrderConcept(order)}</span>
          </div>
          <div className="order-meta">
            <span>Chat: {order.conversationId ? order.conversationId.toString() : '?'}</span>
            <span>Operario: {order.conversation?.assignedTo?.name || 'Sin asignar'}</span>
          </div>
        </div>
      ),
    },
    {
      name: 'Cliente',
      grow: 1.5,
      cell: (order) => (
        <div className="client-card">
          <div className="client-name-line">
            <span className="client-name">{getDisplayName(order)}</span>
            {getDni(order) !== '?' && (
              <span className="client-dni">DNI: {getDni(order)}</span>
            )}
          </div>
          <div className="client-phone-line">{order.clientPhone}</div>
        </div>
      ),
    },
    {
      name: 'Detalle',
      grow: 2,
      cell: (order) => {
        const concept = getOrderConcept(order);
        const requestText = getOrderRequestDetail(order);
        const customerInfo = getOrderCustomerData(order);
        const paymentText = getOrderPaymentMethod(order);
        const attachments = getOrderAttachments(order);
        const hasDetail =
          requestText.trim().length ||
          customerInfo.trim().length ||
          paymentText.trim().length ||
          attachments.length > 0;
        return (
          <div className="order-detail">
            <div className="detail-block concept-block">
              <span className="detail-label">Concepto del pedido</span>
              <p className="concept-text">
                {concept || 'Sin concepto definido'}
              </p>
            </div>
            {requestText.trim().length > 0 && (
              <div className="detail-block">
                <span className="detail-label">Solicitud</span>
                <p>{requestText}</p>
              </div>
            )}
            {customerInfo.trim().length > 0 && (
              <div className="detail-block">
                <span className="detail-label">Datos cliente</span>
                <p>{customerInfo}</p>
              </div>
            )}
            {paymentText.trim().length > 0 && (
              <div className="detail-block">
                <span className="detail-label">Metodo de pago</span>
                <p>{paymentText}</p>
              </div>
            )}
            {attachments.length > 0 && (
              <div className="detail-block attachments-block">
                <span className="detail-label">
                  Adjuntos ({attachments.length})
                </span>
                <div className="attachment-chip-row">
                  {attachments.slice(0, 3).map((attachment, index) => (
                    <span
                      key={`${attachment.url}-${index}`}
                      className={attachmentChipClass(attachment)}
                    >
                      {attachmentChipLabel(attachment)}
                    </span>
                  ))}
                  {attachments.length > 3 && (
                    <span className="attachment-chip attachment-chip--more">
                      +{attachments.length - 3} más
                    </span>
                  )}
                </div>
                <small className="detail-hint">
                  Abrí "Ver pedido" para ver los adjuntos completos.
                </small>
              </div>
            )}
            {!hasDetail && (
              <p className="detail-empty">Sin detalle estructurado</p>
            )}
          </div>
        );
      },
    },
    {
      name: 'Tiempos',
      grow: 2,
      cell: (order) => (
        <div className="order-timeline">
          <div className="timeline-item">
            <span className="timeline-label">Llegó</span>
            <span className="timeline-value">{formatDate(order.createdAt)}</span>
            <span className="timeline-relative">
              {formatRelativeTime(order.createdAt)}
            </span>
          </div>
          <div className="timeline-item">
            <span className="timeline-label">Completado</span>
            {order.closedAt ? (
              <>
                <span className="timeline-value">{formatDate(order.closedAt)}</span>
                <span className="timeline-relative">
                  {formatRelativeTime(order.closedAt)}
                </span>
              </>
            ) : (
              <>
                <span className="timeline-value">Pendiente</span>
                <span className="timeline-relative">
                  {formatRelativeTime(order.createdAt)}
                </span>
              </>
            )}
          </div>
          <div className="timeline-item duration">
            <span className="timeline-label">Tiempo de atención</span>
            <span className="timeline-value">
              {calculateDuration(order.createdAt, order.closedAt)}
            </span>
          </div>
        </div>
      ),
    },
    {
      name: 'Estado',
      grow: 1,
      cell: (order) => (
        <div className="order-status">
          <span className={`status-pill ${order.status.toLowerCase()}`}>
            {STATUS_OPTIONS.find((opt) => opt.value === order.status)?.label ??
              order.status}
          </span>
          {order.closeReason && (
            <span className="reason-badge">{order.closeReason}</span>
          )}
        </div>
      ),
      ignoreRowClick: true,
    },
    {
      name: 'Acciones',
      grow: 1,
      cell: (order) => (
        <div className="order-actions">
          <button
            className="action-btn details-btn"
            onClick={() => {
              markOrderAsRead(order.id);
              onInspectOrder?.(order);
            }}
            type="button"
            title="Ver pedido"
            aria-label="Ver pedido"
          >
            👁
          </button>
          <button
            className="action-btn notes-btn"
            onClick={() => {
              markOrderAsRead(order.id);
              onSelectOrder?.(order);
            }}
            type="button"
            title="Notas"
            aria-label="Notas"
          >
            📝
          </button>
          <button
            className="action-btn chat-btn"
            onClick={() => {
              markOrderAsRead(order.id);
              onChatClick?.(order);
            }}
            type="button"
            title="Ir al chat"
            aria-label="Ir al chat"
          >
            💬
          </button>
          <button
            className="action-btn complete-btn"
            onClick={() => {
              markOrderAsRead(order.id);
              onCompleteClick?.(order);
            }}
            type="button"
            title="Cambiar estado"
            aria-label="Cambiar estado"
          >
            ✅
          </button>
        </div>
      ),
      ignoreRowClick: true,
    },
  ];
  }, [onInspectOrder, onSelectOrder, onChatClick, onCompleteClick, markOrderAsRead]);

  if (error) {
    return <div className="orders-table error">Error: {error}</div>;
  }

  return (
    <div className="orders-table-wrapper">
      <DataTable
        conditionalRowStyles={[
          {
            when: (row) => recentOrderIds.has(row.id),
            style: {
              backgroundColor: '#fff8e1',
              boxShadow: 'inset 0 0 0 2px rgba(255, 152, 0, 0.35)',
              animation: 'pulseHighlight 1.2s ease-in-out 3',
            },
          },
          {
            when: (row) => unreadOrderIds.has(row.id),
            style: {
              backgroundColor: '#fff8e1',
              boxShadow: 'inset 0 0 0 2px rgba(255, 152, 0, 0.35)',
              animation: 'pulseHighlight 1.2s ease-in-out infinite',
            },
          },
        ]}
        columns={columns}
        data={sortedOrders}
        keyField="id"
        pagination
        paginationPerPage={25}
        paginationRowsPerPageOptions={[25, 50, 100]}
        highlightOnHover
        responsive
        persistTableHead
        progressPending={loading}
        progressComponent={
          <div className="orders-table-loading">Cargando pedidos...</div>
        }
        noDataComponent={
          <div className="orders-table-empty">No hay pedidos</div>
        }
        customStyles={dataTableCustomStyles}
        actions={
          <div className="orders-table-actions">
            <button
              type="button"
              className="orders-table-action-btn"
              onClick={handleExportCSV}
              disabled={!sortedOrders.length}
            >
              Exportar CSV
            </button>
            <button
              type="button"
              className="orders-table-action-btn"
              onClick={handleExportPDF}
              disabled={!sortedOrders.length}
            >
              Exportar PDF
            </button>
            <button
              type="button"
              className="orders-table-action-btn"
              onClick={handlePrint}
              disabled={!sortedOrders.length}
            >
              Imprimir
            </button>
          </div>
        }
      />
    </div>
  );
};

export default OrdersTable_v2;
