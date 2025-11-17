/**
 * OrdersPage_v2 - Panel principal para gestionar pedidos
 */

import React, { useState, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../store/chatStore';
import { Order, type OrderFilters } from '../hooks/v2/useOrders';
import { listConversationNotes } from '../services/api';
import OrdersTable_v2 from '../components/orders/OrdersTable_v2';
import CompleteOrderModal_v2 from '../components/orders/CompleteOrderModal_v2';
import OrderDetailsModal from '../components/orders/OrderDetailsModal';
import './OrdersPage_v2.css';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatForHtml = (value: string) =>
  escapeHtml(value).replace(/\n/g, '<br/>');

const OrdersPage_v2: React.FC = () => {
  const navigate = useNavigate();
  const [orderForCompletion, setOrderForCompletion] = useState<Order | null>(
    null
  );
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [orderForDetails, setOrderForDetails] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<OrderFilters>({
    startDate: '',
    endDate: '',
    clientPhone: '',
    conversationId: '',
    operatorName: '',
    operatorId: '',
  });
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleChatClick = useCallback(
    (order: Order) => {
      useChatStore.setState({ activeConversationId: order.conversationId });
      navigate('/dashboard/chat');
    },
    [navigate]
  );

  const handleCompleteClick = useCallback((order: Order) => {
    setOrderForCompletion(order);
    setIsCompleteModalOpen(true);
  }, []);

  const handleCompleteOrder = useCallback(() => {
    setIsCompleteModalOpen(false);
    setOrderForCompletion(null);
  }, []);

  const handleInspectOrder = useCallback((order: Order) => {
    setOrderForDetails(order);
    setIsDetailsModalOpen(true);
  }, []);

  const handleShowNotes = useCallback(async (order: Order) => {
    const legacyNotes = order.notas?.trim() || 'Sin notas registradas.';
    const specs =
      order.especificaciones?.trim() || 'Sin instrucciones adicionales.';
    let conversationNotesHtml = '<p>Sin notas internas para este chat.</p>';
    if (order.conversationId) {
      try {
        const noteList = await listConversationNotes(order.conversationId);
        if (noteList.length) {
          conversationNotesHtml = noteList
            .map((note) => {
              const author =
                note.createdByName ??
                (note.createdById ? `Usuario #${note.createdById}` : 'Sistema');
              const timestamp = new Date(note.createdAt).toLocaleString(
                'es-AR',
                {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              );
              return `
                <div class="orders-note-entry">
                  <div class="orders-note-entry-header">
                    <span class="orders-note-entry-author">${escapeHtml(
                      author
                    )}</span>
                    <span class="orders-note-entry-time">${timestamp}</span>
                  </div>
                  <p>${formatForHtml(note.content)}</p>
                </div>
              `;
            })
            .join('');
        }
      } catch (error) {
        console.error('[OrdersPage_v2] Error al obtener notas', error);
        conversationNotesHtml =
          '<p class="orders-note-entry-error">No se pudieron cargar las notas del chat.</p>';
      }
    }

    await Swal.fire({
      title: `Notas del pedido #${order.id}`,
      html: `
        <div class="orders-notes-content">
          <p><strong>Notas internas del pedido</strong></p>
          <p>${formatForHtml(legacyNotes)}</p>
          <hr />
          <p><strong>Notas asociadas al chat</strong></p>
          <div class="orders-notes-timeline">
            ${conversationNotesHtml}
          </div>
          <hr />
          <p><strong>Especificaciones</strong></p>
          <p>${formatForHtml(specs)}</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      focusConfirm: false,
      width: 600,
    });
  }, []);

  const playNewOrderTone = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Nada: el navegador bloqueó el audio hasta nueva interacción
      }
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.4);
  }, []);

  const handleNewOrder = useCallback(
    (order: Order) => {
      console.info(`Nuevo pedido #${order.id} recibido`);
      void playNewOrderTone();
    },
    [playNewOrderTone]
  );

  const handleFilterChange = useCallback(
    (field: keyof OrderFilters, value: string) => {
      setAdvancedFilters((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const handleResetFilters = useCallback(() => {
    setAdvancedFilters({
      startDate: '',
      endDate: '',
      clientPhone: '',
      conversationId: '',
      operatorName: '',
      operatorId: '',
    });
  }, []);

  return (
    <div className="orders-page-v2">
      <div className="orders-header">
        <div className="orders-header-text">
          <span>Resumen diario de chats y pedidos</span>
          <h1>Panel de pedidos</h1>
        </div>
      </div>

      <div className="orders-controls">
        <div className="control-group">
          <label htmlFor="orders-status-filter">Estado:</label>
          <select
            id="orders-status-filter"
            value={filterStatus || ''}
            onChange={(event) =>
              setFilterStatus(event.target.value || undefined)
            }
            className="filter-select"
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="CONFIRMADO">En proceso</option>
            <option value="COMPLETADO">Completados</option>
            <option value="CANCELADO">Cancelados</option>
          </select>
        </div>

        <div className="control-group search">
          <label className="visually-hidden" htmlFor="orders-search-input">
            Buscar pedidos
          </label>
          <input
            id="orders-search-input"
            type="text"
            placeholder="Buscar por cliente o teléfono..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="orders-advanced-filters">
        <div className="filter-field">
          <label htmlFor="orders-from-date">Desde</label>
          <input
            id="orders-from-date"
            type="datetime-local"
            value={advancedFilters.startDate || ''}
            onChange={(event) =>
              handleFilterChange('startDate', event.target.value)
            }
          />
        </div>
        <div className="filter-field">
          <label htmlFor="orders-to-date">Hasta</label>
          <input
            id="orders-to-date"
            type="datetime-local"
            value={advancedFilters.endDate || ''}
            onChange={(event) =>
              handleFilterChange('endDate', event.target.value)
            }
          />
        </div>
        <div className="filter-field">
          <label htmlFor="orders-client-phone">Teléfono</label>
          <input
            id="orders-client-phone"
            type="text"
            placeholder="Ej: 549351..."
            value={advancedFilters.clientPhone || ''}
            onChange={(event) =>
              handleFilterChange('clientPhone', event.target.value)
            }
          />
        </div>
        <div className="filter-field">
          <label htmlFor="orders-conversation-id">ID Conversación</label>
          <input
            id="orders-conversation-id"
            type="text"
            placeholder="Ej: 123456"
            value={advancedFilters.conversationId || ''}
            onChange={(event) =>
              handleFilterChange('conversationId', event.target.value)
            }
          />
        </div>
        <div className="filter-field">
          <label htmlFor="orders-operator-name">Operario</label>
          <input
            id="orders-operator-name"
            type="text"
            placeholder="Nombre del operador"
            value={advancedFilters.operatorName || ''}
            onChange={(event) =>
              handleFilterChange('operatorName', event.target.value)
            }
          />
        </div>
        <div className="filter-field">
          <label htmlFor="orders-operator-id">ID Operario</label>
          <input
            id="orders-operator-id"
            type="text"
            placeholder="ID exacto"
            value={advancedFilters.operatorId || ''}
            onChange={(event) =>
              handleFilterChange('operatorId', event.target.value)
            }
          />
        </div>
        <div className="filter-actions">
          <button
            type="button"
            className="btn-reset"
            onClick={handleResetFilters}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="orders-content">
        <OrdersTable_v2
          onSelectOrder={handleShowNotes}
          onCompleteClick={handleCompleteClick}
          onChatClick={handleChatClick}
          onInspectOrder={handleInspectOrder}
          onNewOrder={handleNewOrder}
          statusFilter={filterStatus}
          searchQuery={searchQuery}
          pollIntervalMs={60000}
          filters={advancedFilters}
        />
      </div>

      <CompleteOrderModal_v2
        order={orderForCompletion}
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        onComplete={handleCompleteOrder}
      />

      <OrderDetailsModal
        order={orderForDetails}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
    </div>
  );
};

export default OrdersPage_v2;
