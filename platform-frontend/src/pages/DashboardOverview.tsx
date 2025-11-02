import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useSocket } from '../hooks/useSocket';

interface BotStatus {
  record: {
    status: string;
    connectedAt: string | null;
    paused: boolean;
    lastQr: string | null;
    lastQrAscii?: string | null;
  };
  cache?: {
    status: string;
    lastQr: string | null;
    lastQrAscii?: string | null;
    connectedAt?: string;
    paused: boolean;
  } | null;
}

interface MessagePreview {
  direction: 'in' | 'out';
  conversationId: string;
  content: string;
  timestamp: string;
}

import type { ConversationSummary } from '../types/chat';

interface ConversationStats {
  active: number;
  closed: number;
  areaBreakdown: Array<{ areaName: string; active: number }>;
}

export default function DashboardOverview() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MessagePreview[]>([]);
  const [startLoading, setStartLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);
  const [conversationStats, setConversationStats] = useState<ConversationStats>(
    {
      active: 0,
      closed: 0,
      areaBreakdown: [],
    }
  );
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const socket = useSocket();

  const lastQrImage = useMemo(
    () => status?.cache?.lastQr ?? status?.record?.lastQr ?? null,
    [status]
  );

  const lastQrAscii = useMemo(
    () => status?.cache?.lastQrAscii ?? status?.record?.lastQrAscii ?? null,
    [status]
  );

  const currentStatus = useMemo(
    () => status?.cache?.status ?? status?.record?.status ?? 'DESCONOCIDO',
    [status]
  );

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<BotStatus>('/bot/status');
      setStatus(response.data);
    } catch (error) {
      console.error('[Dashboard] Failed to load bot status', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConversationStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const [activeResponse, closedResponse] = await Promise.all([
        api.get<ConversationSummary[]>('/conversations', {
          params: { status: 'PENDING,ACTIVE,PAUSED' },
        }),
        api.get<ConversationSummary[]>('/conversations', {
          params: { status: 'CLOSED' },
        }),
      ]);

      const areaCounter = new Map<string, number>();
      activeResponse.data.forEach((conversation) => {
        const key = conversation.area?.name ?? 'Sin area';
        areaCounter.set(key, (areaCounter.get(key) ?? 0) + 1);
      });

      const areaBreakdown = Array.from(areaCounter.entries())
        .map(([areaName, active]) => ({ areaName, active }))
        .sort((a, b) => b.active - a.active);

      setConversationStats({
        active: activeResponse.data.length,
        closed: closedResponse.data.length,
        areaBreakdown,
      });
    } catch (error) {
      console.error('[Dashboard] Failed to load conversation stats', error);
      setStatsError(
        'No se pudieron obtener las estadisticas de conversaciones.'
      );
      setConversationStats({ active: 0, closed: 0, areaBreakdown: [] });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    void fetchConversationStats();
  }, [fetchStatus, fetchConversationStats]);

  useEffect(() => {
    if (!socket) return;

    const onStatus = (payload: string) => {
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              cache: {
                status: payload,
                lastQr: prev.cache?.lastQr ?? prev.record?.lastQr ?? null,
                lastQrAscii:
                  prev.cache?.lastQrAscii ?? prev.record?.lastQrAscii ?? null,
                connectedAt:
                  prev.cache?.connectedAt ??
                  prev.record?.connectedAt ??
                  undefined,
                paused: prev.cache?.paused ?? prev.record?.paused ?? false,
              },
            }
          : prev
      );
    };

    const onQr = ({ ascii, qr }: { ascii: string; qr: string }) => {
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              cache: {
                status:
                  prev.cache?.status ?? prev.record.status ?? 'CONNECTING',
                lastQr: qr,
                lastQrAscii: ascii,
                connectedAt:
                  prev.cache?.connectedAt ??
                  prev.record.connectedAt ??
                  undefined,
                paused: prev.cache?.paused ?? prev.record.paused,
              },
            }
          : prev
      );
    };

    const onMessage = (payload: {
      conversationId: string;
      senderType: 'CONTACT' | 'BOT' | 'OPERATOR';
      content: string;
      createdAt: string;
    }) => {
      const preview: MessagePreview = {
        conversationId: payload.conversationId,
        content: payload.content,
        direction: payload.senderType === 'CONTACT' ? 'in' : 'out',
        timestamp: payload.createdAt,
      };
      setMessages((prev) => [preview, ...prev].slice(0, 6));
    };

    const refreshStats = () => {
      void fetchConversationStats();
    };

    socket.on('session:status', onStatus);
    socket.on('session:qr', onQr);
    socket.on('message:new', onMessage);
    socket.on('conversation:update', refreshStats);
    socket.on('conversation:incoming', refreshStats);
    socket.on('conversation:closed', refreshStats);

    return () => {
      socket.off('session:status', onStatus);
      socket.off('session:qr', onQr);
      socket.off('message:new', onMessage);
      socket.off('conversation:update', refreshStats);
      socket.off('conversation:incoming', refreshStats);
      socket.off('conversation:closed', refreshStats);
    };
  }, [socket, fetchConversationStats]);

  const handleStart = async () => {
    setStartLoading(true);
    try {
      await api.post('/bot/start');
      void fetchStatus();
    } finally {
      setStartLoading(false);
    }
  };

  const handleStop = async () => {
    setStopLoading(true);
    try {
      await api.post('/bot/stop');
      void fetchStatus();
    } finally {
      setStopLoading(false);
    }
  };

  const handlePauseToggle = async (paused: boolean) => {
    await api.post('/bot/pause', { paused });
    void fetchStatus();
  };

  if (loading && !status) {
    return <div>Cargando...</div>;
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section
        style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
          display: 'grid',
          gap: '1.25rem',
        }}
      >
        <h2 style={{ margin: 0 }}>Resumen de conversaciones</h2>
        {statsLoading ? (
          <p>Cargando estadisticas...</p>
        ) : statsError ? (
          <p style={{ color: '#ef4444' }}>{statsError}</p>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              }}
            >
              <StatCard
                label="Chats activos"
                value={conversationStats.active}
              />
              <StatCard
                label="Chats cerrados"
                value={conversationStats.closed}
              />
            </div>
            <div>
              <h3 style={{ margin: '0 0 0.75rem 0' }}>Distribucion por area</h3>
              {conversationStats.areaBreakdown.length ? (
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'grid',
                    gap: '0.5rem',
                  }}
                >
                  {conversationStats.areaBreakdown.map((item) => (
                    <li key={item.areaName}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: '#f8fafc',
                          borderRadius: '10px',
                          padding: '0.65rem 1rem',
                        }}
                      >
                        <span>{item.areaName}</span>
                        <strong>{item.active}</strong>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No hay conversaciones activas en este momento.</p>
              )}
            </div>
          </>
        )}
      </section>

      <section
        style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
          display: 'grid',
          gap: '1rem',
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Estado del bot</h2>
            <p style={{ margin: 0, color: '#64748b' }}>
              Controla la conexion con WhatsApp
            </p>
          </div>
          <div>
            <strong>{currentStatus}</strong>
          </div>
        </header>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleStart}
            disabled={startLoading}
            style={{
              padding: '0.65rem 1.2rem',
              borderRadius: '10px',
              border: 'none',
              background: startLoading ? '#a7f3d0' : '#22c55e',
              color: '#fff',
              cursor: startLoading ? 'not-allowed' : 'pointer',
              opacity: startLoading ? 0.7 : 1,
            }}
          >
            {startLoading ? 'Iniciando...' : 'Iniciar'}
          </button>
          <button
            onClick={handleStop}
            disabled={stopLoading}
            style={{
              padding: '0.65rem 1.2rem',
              borderRadius: '10px',
              border: 'none',
              background: stopLoading ? '#fecaca' : '#ef4444',
              color: '#fff',
              cursor: stopLoading ? 'not-allowed' : 'pointer',
              opacity: stopLoading ? 0.7 : 1,
            }}
          >
            {stopLoading ? 'Deteniendo...' : 'Detener'}
          </button>
          <button
            onClick={() =>
              handlePauseToggle(
                !(status?.cache?.paused ?? status?.record?.paused)
              )
            }
            style={{
              padding: '0.65rem 1.2rem',
              borderRadius: '10px',
              border: '1px solid #0f172a',
              background: '#fff',
              color: '#0f172a',
              cursor: 'pointer',
            }}
          >
            {status?.cache?.paused ?? status?.record?.paused
              ? 'Reanudar bot'
              : 'Pausar bot'}
          </button>
        </div>
      </section>

      <section
        style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Codigo QR</h2>
        {lastQrImage ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <img
              src={
                lastQrImage.startsWith('data:')
                  ? lastQrImage
                  : `data:image/png;base64,${lastQrImage}`
              }
              alt="Codigo QR de WhatsApp"
              style={{
                width: '220px',
                height: '220px',
                objectFit: 'contain',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '0.5rem',
                background: '#f8fafc',
              }}
            />
            {lastQrAscii && (
              <pre
                style={{
                  background: '#0f172a',
                  color: '#fff',
                  padding: '1rem',
                  borderRadius: '10px',
                  overflow: 'auto',
                }}
              >
                {lastQrAscii}
              </pre>
            )}
          </div>
        ) : (
          <p>Aun no se ha generado un QR. Inicia sesion para obtenerlo.</p>
        )}
      </section>

      <section
        style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Actividad reciente</h2>
        {!messages.length ? (
          <p>No hay mensajes recientes.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {messages.map((msg, index) => (
              <li
                key={`${msg.timestamp}-${index}`}
                style={{
                  padding: '0.75rem',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {msg.direction === 'in' ? 'Entrante' : 'Saliente'}{' '}
                  {msg.conversationId}
                </div>
                <div style={{ color: '#475569' }}>{msg.content}</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {new Date(msg.timestamp).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        background: '#0f172a',
        color: '#fff',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3rem',
      }}
    >
      <span style={{ fontSize: '0.85rem', opacity: 0.75 }}>{label}</span>
      <strong style={{ fontSize: '1.75rem' }}>{value}</strong>
    </div>
  );
}
