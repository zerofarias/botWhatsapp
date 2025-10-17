import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useSocket } from '../hooks/useSocket';

interface BotStatus {
  record: {
    status: string;
    connectedAt: string | null;
    paused: boolean;
    lastQr: string | null;
  };
  cache?: {
    status: string;
    lastQr: string | null;
    connectedAt?: string;
    paused: boolean;
  } | null;
}

interface MessagePreview {
  direction: 'in' | 'out';
  contact: string;
  body: string;
  timestamp: string;
}

export default function DashboardOverview() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MessagePreview[]>([]);
  const socket = useSocket();

  const lastQr = useMemo(() => {
    return status?.cache?.lastQr ?? status?.record?.lastQr ?? null;
  }, [status]);

  const currentStatus = useMemo(() => {
    return status?.cache?.status ?? status?.record?.status ?? 'DESCONOCIDO';
  }, [status]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get<BotStatus>('/bot/status');
      setStatus(response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onStatus = (payload: string) => {
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              cache: {
                ...(prev.cache ?? {
                  paused: prev.record?.paused ?? false,
                }),
                status: payload,
              },
            }
          : prev
      );
    };

    const onQr = ({ ascii }: { ascii: string }) => {
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              cache: {
                ...(prev.cache ?? {
                  status: prev.record?.status ?? 'CONNECTING',
                  paused: prev.record?.paused ?? false,
                }),
                lastQr: ascii,
              },
            }
          : prev
      );
    };

    const onMessage = (payload: MessagePreview) => {
      setMessages((prev) => [payload, ...prev].slice(0, 6));
    };

    socket.on('session_status', onStatus);
    socket.on('qr_code', onQr);
    socket.on('message', onMessage);

    return () => {
      socket.off('session_status', onStatus);
      socket.off('qr_code', onQr);
      socket.off('message', onMessage);
    };
  }, [socket]);

  const handleStart = async () => {
    await api.post('/bot/start');
    fetchStatus();
  };

  const handleStop = async () => {
    await api.post('/bot/stop');
    fetchStatus();
  };

  const handlePauseToggle = async (paused: boolean) => {
    await api.post('/bot/pause', { paused });
    fetchStatus();
  };

  if (loading) {
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
          gap: '1rem',
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Estado del bot</h2>
            <p style={{ margin: 0, color: '#64748b' }}>
              Controla la conexión con WhatsApp
            </p>
          </div>
          <div>
            <strong>{currentStatus}</strong>
          </div>
        </header>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleStart}
            style={{
              padding: '0.65rem 1.2rem',
              borderRadius: '10px',
              border: 'none',
              background: '#22c55e',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Iniciar
          </button>
          <button
            onClick={handleStop}
            style={{
              padding: '0.65rem 1.2rem',
              borderRadius: '10px',
              border: 'none',
              background: '#ef4444',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Detener
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
        <h2 style={{ marginTop: 0 }}>Código QR</h2>
        {lastQr ? (
          <pre
            style={{
              background: '#0f172a',
              color: '#fff',
              padding: '1rem',
              borderRadius: '10px',
              overflow: 'auto',
            }}
          >
            {lastQr}
          </pre>
        ) : (
          <p>Aún no se ha generado un QR. Inicia sesión para obtenerlo.</p>
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
                  {msg.direction === 'in' ? '⬅️' : '➡️'} {msg.contact}
                </div>
                <div style={{ color: '#475569' }}>{msg.body}</div>
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
