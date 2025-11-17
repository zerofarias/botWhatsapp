/**
 * ChatView v2 - header + message list for the redesigned chat
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FiUserPlus, FiCheckCircle, FiPhone } from 'react-icons/fi';
import {
  useChatStore,
  selectMessages,
  type ChatStoreState,
} from '../../store/chatStore';
import { ContactGroup } from '../../hooks/v2/useContactGroups';
import type { ConversationProgressStatus } from '../../types/chat';
import MessageBubble_v2 from './MessageBubble_v2';
import AddContactModal from './AddContactModal';
import './ChatView_v2.css';
import { api } from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';
import Swal from 'sweetalert2';

interface ChatViewProps {
  conversationId?: number;
  contactGroup?: ContactGroup | null;
}

const STATUS_OPTIONS: Array<{
  value: ConversationProgressStatus;
  label: string;
  defaultMessage: string;
}> = [
  {
    value: 'PENDING',
    label: 'Pendiente',
    defaultMessage: 'Su pedido está pendiente. En breve le daremos novedades.',
  },
  {
    value: 'IN_PREPARATION',
    label: 'En preparación',
    defaultMessage: 'Su pedido está en preparación.',
  },
  {
    value: 'COMPLETED',
    label: 'Completado',
    defaultMessage: 'Su pedido está completado. ¡Gracias por su compra!',
  },
  {
    value: 'CANCELLED',
    label: 'Cancelado',
    defaultMessage:
      'Su pedido ha sido cancelado. Si necesita ayuda contáctenos nuevamente.',
  },
  {
    value: 'INACTIVE',
    label: 'Cerrado por inactividad',
    defaultMessage:
      'Cerramos esta conversación por inactividad. Escríbanos si necesita continuar.',
  },
];

const FINISH_PRESETS = {
  completed: {
    label: 'Finalizar chat completado',
    status: 'COMPLETED' as ConversationProgressStatus,
    message: 'Su pedido está completado. ¡Gracias por su compra!',
    finishReason: 'completed',
  },
  cancelled: {
    label: 'Finalizar chat cancelado',
    status: 'CANCELLED' as ConversationProgressStatus,
    message:
      'Su pedido ha sido cancelado. Si necesita ayuda contáctenos nuevamente.',
    finishReason: 'cancelled',
  },
  inactive: {
    label: 'Finalizar chat por inactividad',
    status: 'INACTIVE' as ConversationProgressStatus,
    message:
      'Cerramos esta conversación por inactividad. Escríbanos si necesita continuar.',
    finishReason: 'inactive',
  },
} as const;

const FINISH_REASON_LABELS: Record<string, string> = {
  manual_close: 'Cierre manual',
  completed: 'Pedido completado',
  cancelled: 'Pedido cancelado',
  inactive: 'Cierre por inactividad',
  auto_inactivity: 'Cierre automático por inactividad',
  auto_close: 'Cierre automático',
};

type FinishPresetKey = keyof typeof FINISH_PRESETS;

const showSuccessAlert = (title: string, text?: string) =>
  Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonText: 'Aceptar',
  });

const showErrorAlert = (title: string, text?: string) =>
  Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Entendido',
  });

const confirmAction = async (
  title: string,
  text?: string,
  confirmButtonText = 'Sí',
  cancelButtonText = 'Cancelar'
) => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
  });
  return result.isConfirmed;
};

const normalizeConversationFromApi = (conv: any) => {
  if (!conv) return null;
  const normalized = { ...conv };
  if (typeof normalized.id === 'string') {
    normalized.id = parseInt(normalized.id, 10);
  }
  if (typeof normalized.botId === 'string') {
    normalized.botId = parseInt(normalized.botId, 10);
  }
  if (typeof normalized.contactId === 'string') {
    normalized.contactId = parseInt(normalized.contactId, 10);
  }
  if (
    normalized.contact &&
    typeof normalized.contact.id === 'string' &&
    normalized.contact.id.length
  ) {
    normalized.contact = {
      ...normalized.contact,
      id: parseInt(normalized.contact.id, 10),
    };
  }
  if (typeof normalized.progressStatus === 'string') {
    normalized.progressStatus = normalized.progressStatus.toUpperCase();
  }
  if (normalized.closedAt instanceof Date) {
    normalized.closedAt = normalized.closedAt.toISOString();
  }
  return normalized;
};

const ChatView_v2: React.FC<ChatViewProps> = ({
  conversationId,
  contactGroup,
}) => {
  const storeSelectedContactGroup = useChatStore(
    (state: ChatStoreState) => state.selectedContactGroup
  );
  const messageHistory = useChatStore(
    (state: ChatStoreState) => state.messageHistory
  );
  const individualMessages = useChatStore(selectMessages);
  const loading = useChatStore((state: ChatStoreState) => state.loading);
  const conversations = useChatStore((state) => state.conversations);

  const effectiveContactGroup = contactGroup ?? storeSelectedContactGroup;

  const contactGroupMessages = useMemo(() => {
    if (!effectiveContactGroup) return [];
    const ids = effectiveContactGroup.conversations.map((c) => c.id);
    const all: any[] = [];
    ids.forEach((id) => {
      const history = messageHistory.get(id) || [];
      all.push(...history);
    });
    return all.sort((a, b) => a.timestamp - b.timestamp);
  }, [effectiveContactGroup, messageHistory]);

  const messages = effectiveContactGroup
    ? contactGroupMessages
    : individualMessages;

  const activeConversation = useMemo(() => {
    if (effectiveContactGroup) {
      return effectiveContactGroup.conversations[0] || null;
    }
    return conversations.find((c) => c.id === conversationId) || null;
  }, [effectiveContactGroup, conversationId, conversations]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [contactModalMode, setContactModalMode] = useState<
    'create' | 'edit' | null
  >(null);
  const [selectedStatus, setSelectedStatus] =
    useState<ConversationProgressStatus>('PENDING');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [finishingReason, setFinishingReason] =
    useState<FinishPresetKey | null>(null);
  const [isQuickFinishing, setIsQuickFinishing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [finishMenuOpen, setFinishMenuOpen] = useState(false);
  const finishMenuRef = useRef<HTMLDivElement | null>(null);

  const handleLoadMoreMessages = useCallback(() => {
    if (effectiveContactGroup) {
      console.log(
        'Load more messages for contact group:',
        effectiveContactGroup.contactKey
      );
    } else if (conversationId) {
      console.log('Load more messages for conversation:', conversationId);
    }
  }, [effectiveContactGroup, conversationId]);

  const isContactSaved = Boolean(
    effectiveContactGroup
      ? effectiveContactGroup.isContactSaved
      : activeConversation?.contact?.name
  );

  const displayName = useMemo(() => {
    if (effectiveContactGroup) {
      return effectiveContactGroup.displayName;
    }
    if (activeConversation?.contact?.name) {
      return activeConversation.contact.name;
    }
    if ((activeConversation as any)?.userPhone) {
      return (activeConversation as any).userPhone;
    }
    return conversationId ? `Contacto ${conversationId}` : 'Contacto';
  }, [effectiveContactGroup, activeConversation, conversationId]);

  const derivedPhone =
    effectiveContactGroup?.phoneNumber ||
    activeConversation?.contact?.phone ||
    (activeConversation as any)?.userPhone ||
    '';

  const phoneNumber =
    derivedPhone && derivedPhone.trim().length ? derivedPhone : 'Sin número';

  const canAddContact = !isContactSaved && phoneNumber !== 'Sin número';
  const showContactModal = contactModalMode !== null;
  const conversationIsClosed = activeConversation?.status === 'CLOSED';
  const closureTimestamp = useMemo(() => {
    if (!activeConversation?.closedAt) {
      return null;
    }
    const parsed = new Date(activeConversation.closedAt);
    if (Number.isNaN(parsed.getTime())) {
      return activeConversation.closedAt;
    }
    return parsed.toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }, [activeConversation?.closedAt]);
  const closureReasonLabel = useMemo(() => {
    if (!activeConversation?.closedReason) {
      return null;
    }
    const normalized = activeConversation.closedReason.toLowerCase();
    return FINISH_REASON_LABELS[normalized] ?? activeConversation.closedReason;
  }, [activeConversation?.closedReason]);
  const closureSummary = useMemo(() => {
    if (!conversationIsClosed) {
      return null;
    }
    const timestampText = closureTimestamp ? ` el ${closureTimestamp}` : '';
    const reasonText = closureReasonLabel
      ? ` (Motivo: ${closureReasonLabel})`
      : '';
    const closedByAgent =
      activeConversation?.closedReason === 'manual_close' ||
      activeConversation?.closedReason === 'completed' ||
      activeConversation?.closedReason === 'cancelled';
    const prefix = closedByAgent
      ? 'Cerraste esta conversación'
      : 'Esta conversación fue finalizada';
    return `${prefix}${timestampText}${reasonText}`;
  }, [
    conversationIsClosed,
    closureTimestamp,
    closureReasonLabel,
    activeConversation?.closedReason,
  ]);
  const currentProgressStatus =
    (activeConversation?.progressStatus as ConversationProgressStatus) ??
    'PENDING';
  const currentStatusOption =
    STATUS_OPTIONS.find((opt) => opt.value === currentProgressStatus) ||
    STATUS_OPTIONS[0];

  useEffect(() => {
    setSelectedStatus(currentProgressStatus);
    setStatusError(null);
  }, [currentProgressStatus, activeConversation?.id]);
  useEffect(() => {
    if (conversationIsClosed) {
      setFinishMenuOpen(false);
    }
  }, [conversationIsClosed]);
  useEffect(() => {
    if (!finishMenuOpen) {
      return;
    }
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        finishMenuRef.current &&
        !finishMenuRef.current.contains(event.target as Node)
      ) {
        setFinishMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [finishMenuOpen]);

  const updateConversationFromApi = useCallback((payload: any) => {
    const normalized = normalizeConversationFromApi(payload);
    if (normalized) {
      useChatStore
        .getState()
        .updateConversation(normalized.id, normalized as any);
    }
  }, []);

  const sendProgressStatus = useCallback(
    async (status: ConversationProgressStatus, customMessage?: string) => {
      if (!activeConversation) return;
      setStatusUpdating(true);
      setStatusError(null);
      try {
        const { data } = await api.post(
          `/conversations/${activeConversation.id}/progress-status`,
          {
            status,
            message: customMessage,
          }
        );
        setSelectedStatus(status);
        if (data?.conversation) {
          updateConversationFromApi(data.conversation);
        }
      } catch (error) {
        const message = getApiErrorMessage(
          error,
          'No se pudo actualizar el estado del pedido.'
        );
        setStatusError(message);
        throw new Error(message);
      } finally {
        setStatusUpdating(false);
      }
    },
    [activeConversation, updateConversationFromApi]
  );

  const finishConversationRequest = useCallback(
    async (reason: string) => {
      if (!activeConversation) return;
      try {
        const { data } = await api.post(
          `/conversations/${activeConversation.id}/finish`,
          {
            reason,
          }
        );
        const closedAtValue =
          typeof data?.closedAt === 'string'
            ? data.closedAt
            : new Date().toISOString();
        const resolvedReason =
          typeof data?.reason === 'string' && data.reason.length
            ? data.reason
            : reason;
        useChatStore.getState().updateConversation(activeConversation.id, {
          status: 'CLOSED',
          closedAt: closedAtValue,
          closedReason: resolvedReason,
        });
      } catch (error) {
        throw new Error(
          getApiErrorMessage(
            error,
            'No se pudo finalizar la conversaci´┐¢´┐¢n.'
          )
        );
      }
    },
    [activeConversation]
  );
  const handleQuickFinish = useCallback(async () => {
    if (!activeConversation || conversationIsClosed) {
      return;
    }
    const confirmed =
      typeof window === 'undefined'
        ? true
        : await confirmAction(
            '¿Finalizar chat?',
            'Se enviará un mensaje de cierre.',
            'Sí, finalizar',
            'Cancelar'
          );
    if (!confirmed) {
      return;
    }
    try {
      setIsQuickFinishing(true);
      await finishConversationRequest('manual_close');
      await showSuccessAlert('La conversación fue finalizada.');
    } catch (error) {
      await showErrorAlert(
        'No se pudo finalizar la conversación.',
        getApiErrorMessage(error, 'No se pudo finalizar la conversación.')
      );
    } finally {
      setIsQuickFinishing(false);
    }
  }, [activeConversation, conversationIsClosed, finishConversationRequest]);
  const handleManualFinish = useCallback(async () => {
    setFinishMenuOpen(false);
    await handleQuickFinish();
  }, [handleQuickFinish]);

  const handleReopenConversation = useCallback(async () => {
    if (!activeConversation) {
      return;
    }
    try {
      setIsReopening(true);
      const { data } = await api.post(
        `/conversations/${activeConversation.id}/reopen`
      );
      useChatStore.getState().updateConversation(activeConversation.id, {
        status: data?.status ?? 'ACTIVE',
        botActive: data?.botActive ?? activeConversation.botActive,
        closedAt: null,
        closedReason: null,
      });
      await showSuccessAlert('La conversación fue reactivada.');
    } catch (error) {
      await showErrorAlert(
        'No se pudo reactivar la conversación.',
        getApiErrorMessage(error, 'No se pudo reactivar la conversación.')
      );
    } finally {
      setIsReopening(false);
    }
  }, [activeConversation]);

  const handleStatusSubmit = useCallback(async () => {
    if (!activeConversation) return;
    try {
      await sendProgressStatus(selectedStatus);
      await showSuccessAlert('Estado guardado y enviado al cliente.');
    } catch {
      // errors handled via statusError
    }
  }, [activeConversation, selectedStatus, sendProgressStatus]);

  const handleFinishPreset = useCallback(
    async (presetKey: FinishPresetKey) => {
      if (!activeConversation) return;
      const preset = FINISH_PRESETS[presetKey];
      try {
        setFinishingReason(presetKey);
        await sendProgressStatus(preset.status, preset.message);
        await finishConversationRequest(preset.finishReason);
        await showSuccessAlert('La conversación fue finalizada.');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo finalizar la conversación.';
        await showErrorAlert('No se pudo finalizar la conversación.', message);
      } finally {
        setFinishingReason(null);
      }
    },
    [activeConversation, finishConversationRequest, sendProgressStatus]
  );
  const handleFinishOptionSelect = useCallback(
    async (presetKey: FinishPresetKey) => {
      setFinishMenuOpen(false);
      await handleFinishPreset(presetKey);
    },
    [handleFinishPreset]
  );

  const handleContactSubmit = useCallback(
    async (payload: {
      name: string;
      dni?: string;
      address1?: string;
      address2?: string;
    }) => {
      if (!canAddContact) {
        throw new Error('No hay un numero valido para guardar.');
      }
      try {
        await api.post('/contacts', {
          name: payload.name,
          phone: phoneNumber,
          dni: payload.dni || null,
          address1: payload.address1 || null,
          address2: payload.address2 || null,
        });
      } catch (error) {
        throw new Error(
          getApiErrorMessage(error, 'No se pudo agregar el contacto.')
        );
      }

      window.location.reload();
    },
    [canAddContact, phoneNumber]
  );

  const handleContactUpdate = useCallback(
    async (payload: {
      name: string;
      dni?: string;
      address1?: string;
      address2?: string;
    }) => {
      if (!activeConversation?.contact?.id) {
        throw new Error('No hay contacto para editar.');
      }
      try {
        await api.put(`/contacts/${activeConversation.contact.id}`, {
          name: payload.name,
          dni: payload.dni || null,
          address1: payload.address1 || null,
          address2: payload.address2 || null,
          phone: activeConversation.contact.phone,
        });
      } catch (error) {
        throw new Error(
          getApiErrorMessage(error, 'No se pudo actualizar el contacto.')
        );
      }

      window.location.reload();
    },
    [activeConversation]
  );

  const contactAvatar = activeConversation?.contact?.avatar ?? null;
  const avatarLetter = (displayName || 'C').charAt(0).toUpperCase();

  return (
    <div className="chat-view-v2-wrapper">
      <div className="chat-area-v2-header">
        <div className="chat-area-v2-header-avatar">
          {contactAvatar ? (
            <img src={contactAvatar} alt={displayName} />
          ) : (
            <div className="avatar-placeholder">
              {avatarLetter}
              {isContactSaved && (
                <span className="contact-indicator" title="Contacto guardado">
                  <FiCheckCircle aria-hidden="true" />
                </span>
              )}
            </div>
          )}
        </div>
        <div className="chat-area-v2-header-info">
          <div
            className={`chat-area-v2-header-name ${
              isContactSaved ? 'contact-saved' : 'contact-unsaved'
            }`}
          >
            {displayName}
            {isContactSaved && <span className="saved-badge">Agendado</span>}
            {effectiveContactGroup &&
              effectiveContactGroup.conversations.length > 1 && (
                <span className="conversation-count-badge">
                  {effectiveContactGroup.conversations.length} conversaciones
                </span>
              )}
          </div>
          <div className="chat-area-v2-header-phone">
            <span
              className={`contact-phone ${
                isContactSaved ? '' : 'unsaved-number'
              }`}
            >
              <FiPhone aria-hidden="true" />
              <span>{phoneNumber}</span>
              {!isContactSaved && <em> (No agendado)</em>}
            </span>
          </div>
          <div className="chat-area-v2-header-meta">
            {activeConversation?.contact?.dni && (
              <div>
                <span>DNI:</span> {activeConversation.contact.dni}
              </div>
            )}
            {activeConversation?.contact?.address1 && (
              <div>
                <span>Dirección 1:</span> {activeConversation.contact.address1}
              </div>
            )}
            {activeConversation?.contact?.address2 && (
              <div>
                <span>Dirección 2:</span> {activeConversation.contact.address2}
              </div>
            )}
          </div>
        </div>
        <div className="chat-area-v2-header-actions">
          {!isContactSaved && (
            <button
              className="chat-area-v2-icon-btn"
              title="Agregar a contactos"
              aria-label="Agregar a contactos"
              disabled={!canAddContact}
              onClick={() => setContactModalMode('create')}
            >
              <FiUserPlus size={18} />
            </button>
          )}
          {isContactSaved && (
            <button
              type="button"
              className="chat-area-v2-edit-contact-btn"
              onClick={() => setContactModalMode('edit')}
            >
              Editar contacto
            </button>
          )}
          {activeConversation && (
            <div className="chat-area-v2-finish-actions" ref={finishMenuRef}>
              <button
                type="button"
                className="chat-area-v2-finish-chat-btn"
                onClick={() =>
                  setFinishMenuOpen((open) =>
                    conversationIsClosed ? false : !open
                  )
                }
                disabled={conversationIsClosed}
              >
                {conversationIsClosed ? 'Chat cerrado' : 'Finalizar chat'}
              </button>
              {finishMenuOpen && !conversationIsClosed && (
                <div className="chat-area-v2-finish-menu">
                  <span className="finish-menu-title">
                    Selecciona cómo finalizar
                  </span>
                  {(Object.keys(FINISH_PRESETS) as FinishPresetKey[]).map(
                    (key) => {
                      const preset = FINISH_PRESETS[key];
                      const isBusy = finishingReason === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          className="finish-menu-option"
                          onClick={() => handleFinishOptionSelect(key)}
                          disabled={isBusy}
                        >
                          {isBusy ? 'Finalizando...' : preset.label}
                        </button>
                      );
                    }
                  )}
                  <button
                    type="button"
                    className="finish-menu-option manual"
                    onClick={handleManualFinish}
                    disabled={isQuickFinishing}
                  >
                    {isQuickFinishing ? 'Finalizando...' : 'Cierre manual'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {activeConversation && (
        <div className="chat-area-v2-status-panel">
          {conversationIsClosed && (
            <div className="chat-area-v2-closure-notice">
              {closureSummary ?? 'Chat finalizado'}
              <div className="chat-area-v2-closure-actions">
                <button
                  type="button"
                  className="chat-area-v2-reactivate-btn"
                  onClick={handleReopenConversation}
                  disabled={isReopening}
                >
                  {isReopening ? 'Reactivando...' : 'Reactivar chat'}
                </button>
              </div>
            </div>
          )}
          <div className="chat-area-v2-progress-row">
            <span className="chat-area-v2-progress-pill">
              Estado actual: {currentStatusOption.label}
            </span>
          </div>
          <div className="chat-area-v2-status-controls">
            <select
              value={selectedStatus}
              disabled={statusUpdating || conversationIsClosed}
              onChange={(event) =>
                setSelectedStatus(
                  event.target.value as ConversationProgressStatus
                )
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleStatusSubmit}
              disabled={
                statusUpdating ||
                conversationIsClosed ||
                !activeConversation ||
                selectedStatus.length === 0
              }
            >
              {statusUpdating ? 'Guardando...' : 'Guardar estado'}
            </button>
          </div>
          {statusError && (
            <div className="chat-area-v2-status-error">{statusError}</div>
          )}
        </div>
      )}

      <div className="chat-view-v2-messages">
        {false && (
          <button
            onClick={handleLoadMoreMessages}
            disabled={loading}
            className="chat-view-v2-load-more"
          >
            {loading ? 'Loading...' : 'Load Earlier Messages'}
          </button>
        )}

        {messages.length === 0 ? (
          <div className="chat-view-v2-empty">
            <div>No hay mensajes todavía</div>
          </div>
        ) : (
          messages.map((message: any, index: number) => (
            <MessageBubble_v2
              key={`${message.id || 'msg'}-${index}`}
              message={message}
            />
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      <AddContactModal
        isOpen={showContactModal}
        mode={contactModalMode === 'edit' ? 'edit' : 'create'}
        onClose={() => setContactModalMode(null)}
        phoneNumber={phoneNumber}
        initialData={
          contactModalMode === 'edit' && activeConversation?.contact
            ? {
                name: activeConversation.contact.name ?? '',
                dni: activeConversation.contact.dni ?? '',
                address1: activeConversation.contact.address1 ?? '',
                address2: activeConversation.contact.address2 ?? '',
              }
            : undefined
        }
        onSubmit={
          contactModalMode === 'edit'
            ? handleContactUpdate
            : handleContactSubmit
        }
      />
    </div>
  );
};

export default ChatView_v2;
