import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { useQuickReplies } from '../hooks/useQuickReplies';
import ImageModal from '../components/ImageModal';
import ShortcutSuggestions from '../components/ShortcutSuggestions';
import type { QuickReply } from '../services/quickReply.service';
import { useAuth } from '../context/AuthContext';

type ConversationStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'CLOSED';

type ContactSummary = {
  id: number | null;
  name: string | null;
  phone: string;
  dni: string | null;
};

type ConversationSummary = {
  id: string;
  userPhone: string;
  contactName: string | null;
  contact: ContactSummary | null;
  area: { id: number; name: string | null } | null;
  assignedTo: { id: number; name: string | null } | null;
  status: ConversationStatus;
  botActive: boolean;
  lastActivity: string;
  updatedAt: string;
  lastMessage: {
    id: string;
    senderType: 'CONTACT' | 'BOT' | 'OPERATOR';
    senderId: number | null;
    content: string;
    externalId: string | null;
    isDelivered: boolean;
    createdAt: string;
  } | null;
};

type ConversationMessage = {
  id: string;
  conversationId: string;
  senderType: 'CONTACT' | 'BOT' | 'OPERATOR';
  senderId: number | null;
  content: string;
  mediaType: string | null;
  mediaUrl: string | null;
  externalId: string | null;
  isDelivered: boolean;
  createdAt: string;
};

type FilterOption = 'active' | 'all' | 'closed';

const FILTER_OPTIONS: Array<{ label: string; value: FilterOption }> = [
  { label: 'Activos', value: 'active' },
  { label: 'Todos', value: 'all' },
  { label: 'Cerrados', value: 'closed' },
];

const ACTIVE_STATUS_SET: ConversationStatus[] = ['PENDING', 'ACTIVE', 'PAUSED'];

const STATUS_COPY: Record<ConversationStatus, string> = {
  PENDING: 'Pendiente',
  ACTIVE: 'Activo',
  PAUSED: 'En pausa',
  CLOSED: 'Cerrado',
};

export default function ChatPage() {
  const socket = useSocket();
  const { user } = useAuth();

  const quickReplyVariables = useMemo(
    () => ({
      OPERADOR: user?.name ?? 'Operador',
      OPERADORA: user?.name ?? 'Operador',
      OPERATOR: user?.name ?? 'Operador',
      operatorName: user?.name ?? 'Operador',
    }),
    [user?.name]
  );

  const { getSuggestions, formatQuickReplyContent } = useQuickReplies({
    templateVariables: quickReplyVariables,
  });
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [filter, setFilter] = useState<FilterOption>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [suggestions, setSuggestions] = useState<QuickReply[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [closing, setClosing] = useState(false);
  const [unreadConversations, setUnreadConversations] = useState<Set<string>>(
    () => new Set()
  );

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');

  const matchesFilter = useCallback(
    (conversation: ConversationSummary) => {
      if (filter === 'active') {
        return conversation.status !== 'CLOSED';
      }
      if (filter === 'closed') {
        return conversation.status === 'CLOSED';
      }
      return true;
    },
    [filter]
  );

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const params =
        filter === 'active'
          ? { status: ACTIVE_STATUS_SET.join(',') }
          : filter === 'closed'
          ? { status: 'CLOSED' }
          : undefined;

      const { data } = await api.get<ConversationSummary[]>('/conversations', {
        params,
      });
      const sorted = sortConversations(data);
      setConversations(sorted);

      setSelectedId((current) => {
        if (current && sorted.some((item) => item.id === current)) {
          return current;
        }
        return sorted[0]?.id ?? null;
      });

      setUnreadConversations((prev) => {
        if (!prev.size) {
          return prev;
        }
        const validIds = new Set(sorted.map((item) => item.id));
        const next = new Set<string>();
        prev.forEach((id) => {
          if (validIds.has(id)) {
            next.add(id);
          }
        });
        return next;
      });
    } catch (error) {
      console.error('[Chat] Failed to load conversations', error);
    } finally {
      setLoadingConversations(false);
    }
  }, [filter]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { data } = await api.get<ConversationMessage[]>(
        `/conversations/${conversationId}/messages`,
        {
          params: { limit: 500 },
        }
      );
      setMessages(data);
      setUnreadConversations((prev) => {
        if (!prev.has(conversationId)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(conversationId);
        return next;
      });
    } catch (error) {
      console.error('[Chat] Failed to load messages', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void fetchMessages(selectedId);
    setUnreadConversations((prev) => {
      if (!prev.has(selectedId)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(selectedId);
      return next;
    });
    setMessageInput('');
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    if (!socket) return;

    const handleConversationUpdate = (payload: ConversationSummary) => {
      let removed = false;
      setConversations((prev) => {
        const filtered = prev.filter((item) => item.id !== payload.id);
        if (!matchesFilter(payload)) {
          removed = true;
          return filtered;
        }
        filtered.push(payload);
        return sortConversations(filtered);
      });

      if (removed || !matchesFilter(payload)) {
        setUnreadConversations((prev) => {
          if (!prev.has(payload.id)) {
            return prev;
          }
          const next = new Set(prev);
          next.delete(payload.id);
          return next;
        });
      }
    };

    const handleMessage = (payload: ConversationMessage) => {
      setConversations((prev) => {
        const exists = prev.some(
          (conversation) => conversation.id === payload.conversationId
        );
        if (!exists) {
          return prev;
        }
        const updated = prev.map((conversation) =>
          conversation.id === payload.conversationId
            ? {
                ...conversation,
                lastMessage: {
                  id: payload.id,
                  senderType: payload.senderType,
                  senderId: payload.senderId,
                  content: payload.content,
                  externalId: payload.externalId,
                  isDelivered: payload.isDelivered,
                  createdAt: payload.createdAt,
                },
                lastActivity: payload.createdAt,
                updatedAt: payload.createdAt,
              }
            : conversation
        );
        return sortConversations(updated);
      });

      if (payload.conversationId === selectedId) {
        setMessages((prev) => {
          if (
            prev.some(
              (message) =>
                message.id === payload.id ||
                (payload.externalId &&
                  message.externalId &&
                  message.externalId === payload.externalId)
            )
          ) {
            return prev;
          }
          const next = [...prev, payload];
          next.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          return next;
        });
        setUnreadConversations((prev) => {
          if (!prev.has(payload.conversationId)) {
            return prev;
          }
          const next = new Set(prev);
          next.delete(payload.conversationId);
          return next;
        });
      } else {
        setUnreadConversations((prev) => {
          const next = new Set(prev);
          next.add(payload.conversationId);
          return next;
        });
      }
    };

    socket.on('conversation:update', handleConversationUpdate);
    socket.on('conversation:incoming', handleConversationUpdate);
    socket.on('conversation:closed', handleConversationUpdate);
    socket.on('message:new', handleMessage);

    return () => {
      socket.off('conversation:update', handleConversationUpdate);
      socket.off('conversation:incoming', handleConversationUpdate);
      socket.off('conversation:closed', handleConversationUpdate);
      socket.off('message:new', handleMessage);
    };
  }, [socket, selectedId, matchesFilter]);

  // Función para verificar si el usuario está cerca del final
  const checkIfNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const threshold = 100; // píxeles desde el final
    const isNear =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold;
    setShouldAutoScroll(isNear);
  }, []);

  // Manejar el scroll del contenedor de mensajes
  const handleScroll = useCallback(() => {
    checkIfNearBottom();
  }, [checkIfNearBottom]);

  // Auto-scroll inteligente
  useEffect(() => {
    if (!messagesContainerRef.current || !shouldAutoScroll) return;

    const container = messagesContainerRef.current;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, shouldAutoScroll]);

  // Configurar el listener de scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    checkIfNearBottom(); // Verificar estado inicial

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll, checkIfNearBottom]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  useEffect(() => {
    if (selectedId && !conversations.some((item) => item.id === selectedId)) {
      setSelectedId(conversations[0]?.id ?? null);
    }
  }, [conversations, selectedId]);

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) {
      return conversations;
    }
    const normalized = searchTerm.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const name = conversation.contact?.name ?? conversation.contactName ?? '';
      const dni = conversation.contact?.dni ?? '';
      const phone = conversation.contact?.phone ?? conversation.userPhone;
      return (
        name.toLowerCase().includes(normalized) ||
        phone.toLowerCase().includes(normalized) ||
        dni.toLowerCase().includes(normalized)
      );
    });
  }, [conversations, searchTerm]);

  const handleSubmitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId || !activeConversation) return;
    const trimmed = messageInput.trim();
    if (!trimmed.length) return;

    setSendingMessage(true);
    try {
      await api.post(`/conversations/${selectedId}/messages`, {
        content: trimmed,
      });
      setMessageInput('');
      setSuggestions([]);
    } catch (error) {
      console.error('[Chat] Failed to send message', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleInputChange = (value: string) => {
    setMessageInput(value);

    // Detectar si empieza con "/"
    if (value.startsWith('/')) {
      const matchingSuggestions = getSuggestions(value);
      setSuggestions(matchingSuggestions);
      setSelectedSuggestionIndex(0);
    } else {
      setSuggestions([]);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Si hay sugerencias abiertas
    if (suggestions.length > 0) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
        case 'Tab':
          event.preventDefault();
          expandShortcut(suggestions[selectedSuggestionIndex]);
          break;
        case 'Escape':
          event.preventDefault();
          setSuggestions([]);
          break;
      }
    }
  };

  const expandShortcut = (suggestion: QuickReply) => {
    const formattedContent = formatQuickReplyContent(suggestion.content);
    setMessageInput(formattedContent);
    setSuggestions([]);
    setSelectedSuggestionIndex(0);
  };

  const handleSuggestionSelect = (suggestion: QuickReply) => {
    expandShortcut(suggestion);
  };

  const handleCloseConversation = async () => {
    if (!selectedId || !activeConversation) return;
    if (activeConversation.status === 'CLOSED') return;

    setClosing(true);
    try {
      await api.post(`/conversations/${selectedId}/close`, {});
    } catch (error) {
      console.error('[Chat] Failed to close conversation', error);
    } finally {
      setClosing(false);
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setSelectedImageUrl('');
  };

  const composerDisabled =
    !activeConversation || activeConversation.status === 'CLOSED';

  return (
    <div className="chat-screen">
      <aside className="chat-sidebar">
        <div className="chat-sidebar__header">
          <div className="chat-sidebar__title">
            <h2>Conversaciones</h2>
            <span className="chat-sidebar__count">
              {loadingConversations
                ? 'Cargando…'
                : `${filteredConversations.length} chats`}
            </span>
          </div>
          <div className="chat-sidebar__search">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nombre o teléfono"
            />
          </div>
          <div className="chat-sidebar__filters">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`chat-filter${
                  filter === option.value ? ' chat-filter--active' : ''
                }`}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="chat-sidebar__list">
          {loadingConversations ? (
            <div className="chat-sidebar__empty">Cargando conversaciones…</div>
          ) : filteredConversations.length ? (
            filteredConversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === selectedId}
                isUnread={unreadConversations.has(conversation.id)}
                onSelect={() => setSelectedId(conversation.id)}
              />
            ))
          ) : (
            <div className="chat-sidebar__empty">
              No hay conversaciones que coincidan con la búsqueda.
            </div>
          )}
        </div>
      </aside>
      <section className="chat-main">
        {activeConversation ? (
          <>
            <header className="chat-main__header">
              <div className="chat-main__info">
                <h3>
                  <span>{getDisplayName(activeConversation)}</span>
                  {activeConversation.contact?.dni && (
                    <span
                      style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.85rem',
                        color: '#94a3b8',
                      }}
                    >
                      (DNI: {activeConversation.contact.dni})
                    </span>
                  )}
                </h3>
                <div className="chat-main__meta">
                  <span>
                    {formatPhone(
                      activeConversation.contact?.phone ??
                        activeConversation.userPhone
                    )}
                  </span>
                  {activeConversation.area?.name && (
                    <span className="chat-tag">
                      {activeConversation.area.name}
                    </span>
                  )}
                  <StatusBadge status={activeConversation.status} />
                  {!activeConversation.botActive && (
                    <span className="chat-tag chat-tag--warning">
                      Bot pausado
                    </span>
                  )}
                </div>
              </div>
              <div className="chat-main__actions">
                <button
                  type="button"
                  className="chat-button chat-button--secondary"
                  onClick={handleCloseConversation}
                  disabled={closing || activeConversation.status === 'CLOSED'}
                >
                  {closing ? 'Cerrando…' : 'Finalizar chat'}
                </button>
              </div>
            </header>
            <div className="chat-main__messages" ref={messagesContainerRef}>
              {loadingMessages ? (
                <div className="chat-main__placeholder">
                  Cargando historial…
                </div>
              ) : messages.length ? (
                messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.senderType === 'OPERATOR'}
                    onImageClick={handleImageClick}
                  />
                ))
              ) : (
                <div className="chat-main__placeholder">
                  Aún no hay mensajes en este chat.
                </div>
              )}
            </div>
            <form className="chat-composer" onSubmit={handleSubmitMessage}>
              {suggestions.length > 0 && (
                <ShortcutSuggestions
                  suggestions={suggestions}
                  selectedIndex={selectedSuggestionIndex}
                  onSelect={handleSuggestionSelect}
                />
              )}
              <div className="chat-composer__input-row">
                <input
                  value={messageInput}
                  onChange={(event) => handleInputChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    composerDisabled
                      ? 'El chat está cerrado'
                      : 'Escribe un mensaje… (usa / para atajos)'
                  }
                  disabled={composerDisabled || sendingMessage}
                />
                <button
                  type="submit"
                  className="chat-button chat-button--primary"
                  disabled={
                    composerDisabled || sendingMessage || !messageInput.trim()
                  }
                >
                  {sendingMessage ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="chat-main__empty">
            Selecciona una conversación para comenzar.
          </div>
        )}
      </section>
      <ImageModal
        imageUrl={selectedImageUrl}
        isOpen={imageModalOpen}
        onClose={closeImageModal}
        alt="Imagen del chat"
      />
    </div>
  );
}

function ConversationListItem({
  conversation,
  isActive,
  isUnread,
  onSelect,
}: {
  conversation: ConversationSummary;
  isActive: boolean;
  isUnread: boolean;
  onSelect: () => void;
}) {
  const lastMessageText = conversation.lastMessage
    ? buildLastMessagePreview(conversation.lastMessage)
    : 'Sin mensajes';

  return (
    <button
      type="button"
      className={`chat-conversation${
        isActive ? ' chat-conversation--active' : ''
      }`}
      onClick={onSelect}
    >
      <div className="chat-conversation__row">
        <span className="chat-conversation__name">
          {getDisplayName(conversation)}
        </span>
        <span className="chat-conversation__time">
          {formatRelativeTimestamp(conversation.lastActivity)}
        </span>
      </div>
      <div className="chat-conversation__row">
        <span className="chat-conversation__preview">{lastMessageText}</span>
        <div className="chat-conversation__markers">
          {conversation.contact?.dni && (
            <span className="chat-tag chat-tag--muted">
              DNI: {conversation.contact.dni}
            </span>
          )}
          {conversation.area?.name && (
            <span className="chat-tag chat-tag--muted">
              {conversation.area.name}
            </span>
          )}
          {isUnread && (
            <span className="chat-conversation__unread" aria-hidden="true">
              ●
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function MessageBubble({
  message,
  onImageClick,
}: {
  message: ConversationMessage;
  isOwn: boolean;
  onImageClick: (imageUrl: string) => void;
}) {
  const variant =
    message.senderType === 'CONTACT'
      ? 'contact'
      : message.senderType === 'BOT'
      ? 'bot'
      : 'operator';

  const renderMediaContent = () => {
    // Función para detectar si el contenido es base64
    const isBase64Image = (content: string): boolean => {
      return (
        content.length > 1000 &&
        /^[A-Za-z0-9+/]+={0,2}$/.test(content.substring(0, 100))
      );
    };

    const isBase64Audio = (content: string): boolean => {
      return (
        content.length > 500 &&
        /^[A-Za-z0-9+/]+={0,2}$/.test(content.substring(0, 100))
      );
    };

    // Si no hay mediaType pero el contenido parece ser base64, detectar el tipo
    if (!message.mediaType && message.content.length > 500) {
      // Intentar detectar si es imagen (contenido más largo)
      if (isBase64Image(message.content)) {
        const imageUrl = `data:image/jpeg;base64,${message.content}`;
        return (
          <div className="chat-media">
            <img
              src={imageUrl}
              alt="Imagen compartida"
              className="chat-image"
              onClick={() => onImageClick(imageUrl)}
            />
            <p className="chat-media__caption">Imagen recibida</p>
          </div>
        );
      }

      // Intentar detectar si es audio (contenido medio)
      if (isBase64Audio(message.content)) {
        const audioUrl = `data:audio/ogg;base64,${message.content}`;
        return (
          <div className="chat-media">
            <audio controls className="chat-audio">
              <source src={audioUrl} type="audio/ogg" />
              <source
                src={`data:audio/mpeg;base64,${message.content}`}
                type="audio/mpeg"
              />
              Tu navegador no soporta audio.
            </audio>
            <p className="chat-media__caption">Audio recibido</p>
          </div>
        );
      }
    }

    if (!message.mediaType || !message.mediaUrl) {
      return <p>{message.content}</p>;
    }

    switch (message.mediaType) {
      case 'image':
        return (
          <div className="chat-media">
            <img
              src={message.mediaUrl}
              alt="Imagen compartida"
              className="chat-image"
              onClick={() => message.mediaUrl && onImageClick(message.mediaUrl)}
            />
            {message.content && (
              <p className="chat-media__caption">{message.content}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="chat-media">
            <video controls className="chat-video" preload="metadata">
              <source src={message.mediaUrl} />
              Tu navegador no soporta videos.
            </video>
            {message.content && (
              <p className="chat-media__caption">{message.content}</p>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="chat-media">
            <audio controls className="chat-audio">
              <source src={message.mediaUrl} />
              Tu navegador no soporta audio.
            </audio>
            {message.content && (
              <p className="chat-media__caption">{message.content}</p>
            )}
          </div>
        );

      case 'document':
        return (
          <div className="chat-media">
            <a
              href={message.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="chat-document"
            >
              📄 Ver documento
            </a>
            {message.content && (
              <p className="chat-media__caption">{message.content}</p>
            )}
          </div>
        );

      case 'location': {
        const locationMatch = message.content.match(
          /📍 Ubicación: ([-\d.]+), ([-\d.]+)/
        );
        if (locationMatch) {
          const [, lat, lng] = locationMatch;
          return (
            <div className="chat-media">
              <a
                href={`https://www.google.com/maps?q=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="chat-location"
              >
                📍 Ver ubicación en Maps
              </a>
              <p className="chat-media__caption">
                Ubicación: {lat}, {lng}
              </p>
            </div>
          );
        }
        return <p>{message.content}</p>;
      }

      default:
        return <p>{message.content}</p>;
    }
  };

  return (
    <div className={`chat-message chat-message--${variant}`}>
      <div className="chat-message__bubble">
        {renderMediaContent()}
        <span className="chat-message__meta">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {message.senderType === 'OPERATOR' && (
            <span className="chat-message__delivery">
              {message.isDelivered ? '✓' : '…'}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ConversationStatus }) {
  return (
    <span className={`chat-status chat-status--${status.toLowerCase()}`}>
      {STATUS_COPY[status]}
    </span>
  );
}

function sortConversations(items: ConversationSummary[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );
}

function getDisplayName(conversation: ConversationSummary) {
  const name = conversation.contact?.name ?? conversation.contactName ?? '';
  if (name.trim().length) {
    return name.trim();
  }
  return formatPhone(conversation.contact?.phone ?? conversation.userPhone);
}

function formatPhone(phone: string) {
  if (!phone) return '';
  if (!phone.includes('@')) {
    return phone;
  }
  return phone.replace(/@.+$/, '');
}

function buildLastMessagePreview(message: ConversationSummary['lastMessage']) {
  if (!message) return '';
  const prefix =
    message.senderType === 'OPERATOR'
      ? 'Tú: '
      : message.senderType === 'BOT'
      ? 'Bot: '
      : '';
  return `${prefix}${message.content}`.slice(0, 80);
}

function formatRelativeTimestamp(isoDate: string) {
  const date = new Date(isoDate);
  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString();
}
