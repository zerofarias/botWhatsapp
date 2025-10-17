import { FormEvent, useEffect, useMemo, useState } from 'react';
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
  createdAt: string;
};

type FilterOption = 'active' | 'all' | 'closed';

function isActiveStatus(status: ConversationStatus) {
  return status === 'PENDING' || status === 'ACTIVE' || status === 'PAUSED';
}

export default function ChatPage() {
  const socket = useSocket();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [closing, setClosing] = useState(false);
  const [filter, setFilter] = useState<FilterOption>('active');

  const fetchConversations = async () => {
    setLoadingConversations(true);
    try {
      const { data } = await api.get<ConversationSummary[]>('/conversations', {
        params: { status: 'PENDING,ACTIVE,PAUSED' },
      });
      setConversations(sortConversations(data));
      if (!selectedId && data.length) {
        setSelectedId(data[0]!.id);
      }
    } finally {
      setLoadingConversations(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { data } = await api.get<ConversationMessage[]>(
        `/conversations/${conversationId}/messages`,
        {
          params: { limit: 200 },
        }
      );
      setMessages(data);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    void fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedId) {
      void fetchMessages(selectedId);
    } else {
      setMessages([]);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!socket) return;

    const handleConversationUpdate = (payload: ConversationSummary) => {
      setConversations((prev) => {
        const updated = prev.filter((item) => item.id !== payload.id);
        updated.push(payload);
        return sortConversations(updated);
      });
    };

    const handleMessage = (payload: ConversationMessage) => {
      setConversations((prev) => {
        const updated = prev.map((conversation) =>
          conversation.id === payload.conversationId
            ? {
                ...conversation,
                lastMessage: {
                  id: payload.id,
                  senderType: payload.senderType,
                  senderId: payload.senderId,
                  content: payload.content,
                  createdAt: payload.createdAt,
                },
                updatedAt: payload.createdAt,
                lastActivity: payload.createdAt,
              }
            : conversation
        );
        return sortConversations(updated);
      });

      setMessages((prev) => {
        if (payload.conversationId !== selectedId) {
          return prev;
        }
        const exists = prev.find((msg) => msg.id === payload.id);
        if (exists) {
          return prev;
        }
        return [...prev, payload];
      });
    };

    socket.on('conversation:update', handleConversationUpdate);
    socket.on('message:new', handleMessage);

    return () => {
      socket.off('conversation:update', handleConversationUpdate);
      socket.off('message:new', handleMessage);
    };
  }, [socket, selectedId]);

  const filteredConversations = useMemo(() => {
    switch (filter) {
      case 'active':
        return conversations.filter((conversation) =>
          isActiveStatus(conversation.status)
        );
      case 'closed':
        return conversations.filter(
          (conversation) => conversation.status === 'CLOSED'
        );
      default:
        return conversations;
    }
  }, [conversations, filter]);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
  };

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId || !messageInput.trim()) {
      return;
    }

    setSendingMessage(true);
    try {
      await api.post(`/conversations/${selectedId}/messages`, {
        content: messageInput.trim(),
      });
      setMessageInput('');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCloseConversation = async () => {
    if (!selectedId) return;
    setClosing(true);
    try {
      await api.post(`/conversations/${selectedId}/close`);
    } finally {
      setClosing(false);
    }
  };

  const activeConversation = conversations.find(
    (conversation) => conversation.id === selectedId
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(260px, 340px) 1fr',
        gap: '1.5rem',
      }}
    >
      <aside
        style={{
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Conversaciones</h2>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as FilterOption)}
            style={{
              borderRadius: '8px',
              border: '1px solid #cbd5f5',
              padding: '0.3rem 0.6rem',
            }}
          >
            <option value="active">Activas</option>
            <option value="all">Todas</option>
            <option value="closed">Cerradas</option>
          </select>
        </header>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingConversations ? (
            <p style={{ padding: '1rem' }}>Cargando conversaciones...</p>
          ) : filteredConversations.length === 0 ? (
            <p style={{ padding: '1rem' }}>
              No hay conversaciones para mostrar.
            </p>
          ) : (
            filteredConversations.map((conversation) => {
              const isSelected = conversation.id === selectedId;
              return (
                <button
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    background: isSelected ? '#e0f2fe' : 'transparent',
                    padding: '0.9rem 1.25rem',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <strong>
                      {conversation.contactName ?? conversation.userPhone}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(conversation.updatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    {conversation.lastMessage?.content ?? 'Sin mensajes'}
                  </div>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
                    <StatusBadge status={conversation.status} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section
        style={{
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '520px',
        }}
      >
        {selectedId && activeConversation ? (
          <>
            <header
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  {activeConversation.contactName ??
                    activeConversation.userPhone}
                </h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  Área: {activeConversation.area?.name ?? 'Sin asignar'} ·
                  Operador: {activeConversation.assignedTo?.name ?? '—'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <StatusBadge status={activeConversation.status} />
                <button
                  onClick={handleCloseConversation}
                  disabled={closing || activeConversation.status === 'CLOSED'}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #ef4444',
                    background: '#fff5f5',
                    color: '#b91c1c',
                    cursor:
                      closing || activeConversation.status === 'CLOSED'
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {closing ? 'Cerrando...' : 'Cerrar chat'}
                </button>
              </div>
            </header>

            <div
              style={{
                flex: 1,
                padding: '1.5rem',
                overflowY: 'auto',
                display: 'grid',
                gap: '1rem',
              }}
            >
              {loadingMessages ? (
                <p>Cargando mensajes...</p>
              ) : messages.length === 0 ? (
                <p>No hay mensajes todavía.</p>
              ) : (
                messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.senderType === 'OPERATOR'}
                  />
                ))
              )}
            </div>

            <form
              onSubmit={handleSendMessage}
              style={{
                borderTop: '1px solid #e2e8f0',
                padding: '1rem 1.5rem',
                display: 'flex',
                gap: '1rem',
              }}
            >
              <input
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                placeholder="Escribe una respuesta..."
                style={{
                  flex: 1,
                  borderRadius: '999px',
                  border: '1px solid #cbd5f5',
                  padding: '0.75rem 1.25rem',
                }}
              />
              <button
                type="submit"
                disabled={sendingMessage || !messageInput.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '999px',
                  border: 'none',
                  background: '#0f172a',
                  color: '#fff',
                  cursor: sendingMessage ? 'wait' : 'pointer',
                }}
              >
                {sendingMessage ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'grid',
              placeItems: 'center',
              color: '#64748b',
            }}
          >
            Seleccioná una conversación para comenzar.
          </div>
        )}
      </section>
    </div>
  );
}

function sortConversations(conversations: ConversationSummary[]) {
  return [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

function StatusBadge({ status }: { status: ConversationStatus }) {
  const map: Record<ConversationStatus, { label: string; color: string }> = {
    PENDING: { label: 'Pendiente', color: '#ea580c' },
    ACTIVE: { label: 'Activo', color: '#16a34a' },
    PAUSED: { label: 'En pausa', color: '#eab308' },
    CLOSED: { label: 'Cerrado', color: '#64748b' },
  };
  const { label, color } = map[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        color,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: '0.6rem',
          height: '0.6rem',
          borderRadius: '999px',
          background: color,
        }}
      />
      {label}
    </span>
  );
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: ConversationMessage;
  isOwn: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: '70%',
          background: isOwn ? '#0f172a' : '#e2e8f0',
          color: isOwn ? '#fff' : '#0f172a',
          padding: '0.8rem 1rem',
          borderRadius: '16px',
          borderBottomRightRadius: isOwn ? '4px' : '16px',
          borderBottomLeftRadius: isOwn ? '16px' : '4px',
          boxShadow: '0 10px 20px -18px rgba(15, 23, 42, 0.45)',
        }}
      >
        <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
        <div
          style={{
            fontSize: '0.7rem',
            marginTop: '0.35rem',
            textAlign: 'right',
            opacity: 0.75,
          }}
        >
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
