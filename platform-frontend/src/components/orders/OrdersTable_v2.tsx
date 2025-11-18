/**
 * OrdersTable_v2.tsx - Tabla de pedidos con controles modernos y DataTable
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import DataTable, { type TableColumn } from 'react-data-table-component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  useOrders,
  type Order,
  type OrderFilters,
} from '../../hooks/v2/useOrders';
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
}

const exportStructure = [
  { key: 'pedido', label: 'Pedido' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'dni', label: 'DNI' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'operario', label: 'Operario' },
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
}) => {
  const { orders, loading, error } = useOrders(
    statusFilter,
    searchQuery,
    pollIntervalMs,
    filters
  );
  const knownIdsRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);

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
      cliente: getDisplayName(order),
      dni: getDni(order),
      telefono: order.clientPhone,
      operario: order.conversation?.assignedTo?.name || 'Sin asignar',
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
    }
    if (!initializedRef.current && sortedOrders.length > 0) {
      initializedRef.current = true;
    }
    knownIdsRef.current = currentIds;
  }, [sortedOrders, onNewOrder]);

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
        grow: 2,
        cell: (order) => (
          <div className="order-overview">
            <div className="order-id">#{order.id}</div>
            <div className="client-info">
              <span className="client-name">{getDisplayName(order)}</span>
              <span className="client-type">
                {order.tipoConversacion || 'General'}
              </span>
            </div>
            <div className="order-phone">{order.clientPhone}</div>
            <div className="order-meta">
              <span>
                Chat:{' '}
                {order.conversationId ? order.conversationId.toString() : '—'}
              </span>
              <span>
                Operario:{' '}
                {order.conversation?.assignedTo?.name || 'Sin asignar'}
              </span>
              {order.conversation?.contact?.dni && (
                <span>DNI: {order.conversation.contact.dni}</span>
              )}
            </div>
          </div>
        ),
      },
      {
        name: 'Tiempos',
        grow: 2,
        cell: (order) => (
          <div className="order-timeline">
            <div className="timeline-item">
              <span className="timeline-label">Llegó</span>
              <span className="timeline-value">
                {formatDate(order.createdAt)}
              </span>
              <span className="timeline-relative">
                {formatRelativeTime(order.createdAt)}
              </span>
            </div>
            <div className="timeline-item">
              <span className="timeline-label">Completado</span>
              {order.closedAt ? (
                <>
                  <span className="timeline-value">
                    {formatDate(order.closedAt)}
                  </span>
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
              {STATUS_OPTIONS.find((opt) => opt.value === order.status)
                ?.label ?? order.status}
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
              onClick={() => onInspectOrder?.(order)}
              type="button"
            >
              Ver pedido
            </button>
            <button
              className="action-btn notes-btn"
              onClick={() => onSelectOrder?.(order)}
              type="button"
            >
              Notas
            </button>
            <button
              className="action-btn chat-btn"
              onClick={() => onChatClick?.(order)}
              type="button"
            >
              Ir al chat
            </button>
            <button
              className="action-btn complete-btn"
              onClick={() => onCompleteClick?.(order)}
              type="button"
            >
              Cambiar estado
            </button>
          </div>
        ),
        ignoreRowClick: true,
      },
    ];
  }, [onInspectOrder, onSelectOrder, onChatClick, onCompleteClick]);

  if (error) {
    return <div className="orders-table error">Error: {error}</div>;
  }

  return (
    <div className="orders-table-wrapper">
      <DataTable
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
