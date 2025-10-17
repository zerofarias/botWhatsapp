import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from '../services/api';
import { useSocket } from '../hooks/useSocket';

type ConversationStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'CLOSED';

type ConversationSummary = {
  id: string;
  userPhone: string;
  contactName: string | null;
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

function matchesActive(status: ConversationStatus) {
  return status === 'PENDING' || status === 'ACTIVE' || status === 'PAUSED';
}

export default function ChatPage() {
  const socket = useSocket();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [filter, setFilter] = useState<FilterOption>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [closing, setClosing] = useState(false);
  const [unreadConversations, setUnreadConversations] = useState<Set<string>>(
    () => new Set()
  );

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTop =
      messagesContainerRef.current.scrollHeight;
  }, [messages]);

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
      const name = conversation.contactName ?? '';
      return (
        name.toLowerCase().includes(normalized) ||
        conversation.userPhone.toLowerCase().includes(normalized)
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
    } catch (error) {
      console.error('[Chat] Failed to send message', error);
    } finally {
      setSendingMessage(false);
    }
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
                <h3>{getDisplayName(activeConversation)}</h3>
                <div className="chat-main__meta">
                  <span>{formatPhone(activeConversation.userPhone)}</span>
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
                  />
                ))
              ) : (
                <div className="chat-main__placeholder">
                  Aún no hay mensajes en este chat.
                </div>
              )}
            </div>
            <form className="chat-composer" onSubmit={handleSubmitMessage}>
              <input
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                placeholder={
                  composerDisabled
                    ? 'El chat está cerrado'
                    : 'Escribe un mensaje…'
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
            </form>
          </>
        ) : (
          <div className="chat-main__empty">
            Selecciona una conversación para comenzar.
          </div>
        )}
      </section>
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
  isOwn,
}: {
  message: ConversationMessage;
  isOwn: boolean;
}) {
  const variant =
    message.senderType === 'CONTACT'
      ? 'contact'
      : message.senderType === 'BOT'
      ? 'bot'
      : 'operator';

  return (
    <div className={`chat-message chat-message--${variant}`}>
      <div className="chat-message__bubble">
        <p>{message.content}</p>
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
  return conversation.contactName?.trim()?.length
    ? conversation.contactName
    : formatPhone(conversation.userPhone);
}

function formatPhone(phone: string) {
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
