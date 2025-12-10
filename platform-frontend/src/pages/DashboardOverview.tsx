import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import RemindersWidget from '../components/dashboard/RemindersWidget';
import RemindersNotification from '../components/dashboard/RemindersNotification';

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
  autoStart?: boolean;
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
  todayMessages: number;
  vipActive: number;
  closedToday: number;
  conversionRate: number;
  mostActiveArea: string | null;
}

interface DailyReminder {
  id: number;
  title: string;
  description?: string;
  contactId: number;
  remindAt: string;
  contact?: {
    id: number;
    name: string;
    phone: string;
    obraSocial?: string;
    obraSocial2?: string;
    isVip?: boolean;
    isProblematic?: boolean;
    isChronic?: boolean;
  };
}

export default function DashboardOverview() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MessagePreview[]>([]);
  const [startLoading, setStartLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [autoStartLoading, setAutoStartLoading] = useState(false);
  const [conversationStats, setConversationStats] = useState<ConversationStats>(
    {
      active: 0,
      closed: 0,
      areaBreakdown: [],
      todayMessages: 0,
      vipActive: 0,
      closedToday: 0,
      conversionRate: 0,
      mostActiveArea: null,
    }
  );
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [todayReminders, setTodayReminders] = useState<DailyReminder[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<DailyReminder[]>([]);
  const socket = useSocket();

  const buildStatusState = useCallback(
    (statusValue: string): BotStatus => ({
      record: {
        status: statusValue,
        connectedAt: null,
        paused: false,
        lastQr: null,
        lastQrAscii: null,
      },
      cache: {
        status: statusValue,
        lastQr: null,
        lastQrAscii: null,
        connectedAt: undefined,
        paused: false,
      },
    }),
    []
  );

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
      setAutoStartEnabled(Boolean(response.data.autoStart));
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
      const [activeResponse, closedResponse, messagesResponse] = await Promise.all([
        api.get<ConversationSummary[]>('/conversations', {
          params: { status: 'PENDING,ACTIVE,PAUSED' },
        }),
        api.get<ConversationSummary[]>('/conversations', {
          params: { status: 'CLOSED' },
        }),
        api.get<MessagePreview[]>('/messages/today', {
          params: { limit: 1000 },
        }).catch(() => ({ data: [] })),
      ]);

      const active = activeResponse.data;
      const closed = closedResponse.data;
      const messages = messagesResponse.data || [];

      // Calcular estadísticas
      const areaCounter = new Map<string, number>();
      active.forEach((conversation) => {
        const key = conversation.area?.name ?? 'Sin area';
        areaCounter.set(key, (areaCounter.get(key) ?? 0) + 1);
      });

      const areaBreakdown = Array.from(areaCounter.entries())
        .map(([areaName, activeCount]) => ({ areaName, active: activeCount }))
        .sort((a, b) => b.active - a.active);

      // VIP activos
      const vipActive = active.filter(c => c.contact?.isVip).length;

      // Cerrados hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const closedToday = closed.filter(c => {
        const closedDate = c.updatedAt ? new Date(c.updatedAt) : null;
        return closedDate && closedDate >= today;
      }).length;

      // Tasa de conversión
      const total = active.length + closed.length;
      const conversionRate = total > 0 ? Math.round((closed.length / total) * 100) : 0;

      // Área más activa
      const mostActiveArea = areaBreakdown.length > 0 ? areaBreakdown[0].areaName : null;

      setConversationStats({
        active: active.length,
        closed: closed.length,
        areaBreakdown,
        todayMessages: messages.length,
        vipActive,
        closedToday,
        conversionRate,
        mostActiveArea,
      });
    } catch (error) {
      console.error('[Dashboard] Failed to load conversation stats', error);
      setStatsError(
        'No se pudieron obtener las estadisticas de conversaciones.'
      );
      setConversationStats({
        active: 0,
        closed: 0,
        areaBreakdown: [],
        todayMessages: 0,
        vipActive: 0,
        closedToday: 0,
        conversionRate: 0,
        mostActiveArea: null,
      });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchReminders = useCallback(async () => {
    try {
      const response = await api.get<DailyReminder[]>('/contact-reminders/due', {
        params: {
          date: new Date().toISOString().split('T')[0],
        },
      });
      // Ordenar por remindAt de forma ascendente (más próximo primero)
      const remindersData: DailyReminder[] = Array.isArray(response.data)
        ? response.data
        : Array.isArray((response as any)?.data?.reminders)
        ? (response as any).data.reminders
        : [];
      const sorted = remindersData.sort(
        (a: DailyReminder, b: DailyReminder) =>
          new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
      );
      setTodayReminders(sorted);
    } catch (error) {
      console.error('[Dashboard] Failed to load today reminders', error);
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const response = await api.get<DailyReminder[]>('/contact-reminders', {
        params: {
          start: today.toISOString(),
          end: nextWeek.toISOString(),
        },
      });
      // Ordenar por remindAt de forma ascendente (más próximo primero)
      // y filtrar para solo incluir recordatorios con remindAt >= today
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const sorted = (response.data ?? [])
        .filter((reminder: DailyReminder) => new Date(reminder.remindAt) >= now)
        .sort(
          (a: DailyReminder, b: DailyReminder) =>
            new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
        );
      setUpcomingReminders(sorted);
    } catch (error) {
      console.error('[Dashboard] Failed to load upcoming reminders', error);
    }
  }, []);

  // Efecto para cargar datos iniciales - solo una vez al montar
  useEffect(() => {
    void fetchStatus();
    void fetchConversationStats();
    void fetchReminders();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!socket) return;

    const onStatus = (payload: string) => {
      setStatus((prev) => {
        const next = prev ?? buildStatusState(payload);
        return {
          ...next,
          cache: {
            status: payload,
            lastQr: next.cache?.lastQr ?? next.record?.lastQr ?? null,
            lastQrAscii:
              next.cache?.lastQrAscii ?? next.record?.lastQrAscii ?? null,
            connectedAt:
              next.cache?.connectedAt ?? next.record?.connectedAt ?? undefined,
            paused: next.cache?.paused ?? next.record?.paused ?? false,
          },
        };
      });
    };

    const onQr = ({ ascii, qr }: { ascii: string; qr: string }) => {
      setStatus((prev) => {
        const next =
          prev ??
          (() => {
            const base = buildStatusState('CONNECTING');
            return {
              ...base,
              record: { ...base.record, lastQr: qr, lastQrAscii: ascii },
            };
          })();

        return {
          ...next,
          cache: {
            status: next.cache?.status ?? next.record?.status ?? 'CONNECTING',
            lastQr: qr,
            lastQrAscii: ascii,
            connectedAt:
              next.cache?.connectedAt ?? next.record?.connectedAt ?? undefined,
            paused: next.cache?.paused ?? next.record?.paused ?? false,
          },
          record: {
            ...next.record,
            lastQr: next.record?.lastQr ?? qr,
            lastQrAscii: next.record?.lastQrAscii ?? ascii,
          },
        };
      });
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

    // Función local para refrescar stats (sin dependencia externa)
    const refreshStats = async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const [activeResponse, closedResponse, messagesResponse] = await Promise.all([
          api.get<ConversationSummary[]>('/conversations', {
            params: { status: 'PENDING,ACTIVE,PAUSED' },
          }),
          api.get<ConversationSummary[]>('/conversations', {
            params: { status: 'CLOSED' },
          }),
          api.get<MessagePreview[]>('/messages/today', {
            params: { limit: 1000 },
          }).catch(() => ({ data: [] })),
        ]);

        const active = activeResponse.data;
        const closed = closedResponse.data;
        const messages = messagesResponse.data || [];

        const areaCounter = new Map<string, number>();
        active.forEach((conversation) => {
          const key = conversation.area?.name ?? 'Sin area';
          areaCounter.set(key, (areaCounter.get(key) ?? 0) + 1);
        });

        const areaBreakdown = Array.from(areaCounter.entries())
          .map(([areaName, activeCount]) => ({ areaName, active: activeCount }))
          .sort((a, b) => b.active - a.active);

        // VIP activos
        const vipActive = active.filter(c => c.contact?.isVip).length;

        // Cerrados hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const closedToday = closed.filter(c => {
          const closedDate = c.updatedAt ? new Date(c.updatedAt) : null;
          return closedDate && closedDate >= today;
        }).length;

        // Tasa de conversión
        const total = active.length + closed.length;
        const conversionRate = total > 0 ? Math.round((closed.length / total) * 100) : 0;

        // Área más activa
        const mostActiveArea = areaBreakdown.length > 0 ? areaBreakdown[0].areaName : null;

        setConversationStats({
          active: active.length,
          closed: closed.length,
          areaBreakdown,
          todayMessages: messages.length,
          vipActive,
          closedToday,
          conversionRate,
          mostActiveArea,
        });
      } catch (error) {
        console.error(
          '[Dashboard] Failed to refresh conversation stats',
          error
        );
        setStatsError(
          'No se pudieron obtener las estadisticas de conversaciones.'
        );
      } finally {
        setStatsLoading(false);
      }
    };

    socket.on('session:status', onStatus);
    socket.on('session:qr', onQr);
    socket.on('message:new', onMessage);
    socket.on('conversation:update', refreshStats);
    socket.on('conversation:incoming', refreshStats);
    socket.on('conversation:closed', refreshStats);
    socket.on('conversation:new', refreshStats);
    
    // Listen for daily reminders broadcast
    const onDailyReminders = (data: { reminders: DailyReminder[] }) => {
      setTodayReminders(data.reminders);
    };
    socket.on('daily-reminders', onDailyReminders);

    return () => {
      socket.off('session:status', onStatus);
      socket.off('session:qr', onQr);
      socket.off('message:new', onMessage);
      socket.off('conversation:update', refreshStats);
      socket.off('conversation:incoming', refreshStats);
      socket.off('conversation:closed', refreshStats);
      socket.off('conversation:new', refreshStats);
      socket.off('daily-reminders', onDailyReminders);
    };
  }, [socket, buildStatusState]);

  const handleStart = async () => {
    setStartLoading(true);
    try {
      await api.post('/bot/start');
      await fetchStatus();
    } catch (error) {
      console.error('[Dashboard] Failed to start bot', error);
      alert('No se pudo iniciar el bot. Revisa la consola para más detalles.');
    } finally {
      setStartLoading(false);
    }
  };

  const handleStop = async () => {
    setStopLoading(true);
    try {
      await api.post('/bot/stop');
      await fetchStatus();
    } catch (error) {
      console.error('[Dashboard] Failed to stop bot', error);
      alert('No se pudo detener el bot.');
    } finally {
      setStopLoading(false);
    }
  };

  const handlePauseToggle = async (paused: boolean) => {
    setPauseLoading(true);
    try {
      await api.post('/bot/pause', { paused });
      await fetchStatus();
    } catch (error) {
      console.error('[Dashboard] Failed to toggle pause', error);
      alert('No se pudo actualizar el estado de pausa.');
    } finally {
      setPauseLoading(false);
    }
  };

  const handleResetSession = async () => {
    const confirmed = window.confirm(
      'Se eliminará la sesión actual y deberás escanear el código QR nuevamente. ¿Deseas continuar?'
    );
    if (!confirmed) return;
    setResetLoading(true);
    try {
      // Paso 1: eliminar tokens/sesión actual (carpeta tokens/user-<id>)
      await api.post('/bot/reset');
      // Paso 2: levantar sesión para forzar nuevo QR listo para otro número
      await api.post('/bot/start');
      alert(
        'Sesión eliminada. Se solicitó un nuevo QR; espera unos segundos y escanéalo para vincular otro número.'
      );
      await fetchStatus();
    } catch (error) {
      console.error('[Dashboard] Failed to reset bot session', error);
      alert('No se pudo borrar la sesión. Intenta nuevamente.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleAutoStartToggle = async () => {
    const nextValue = !autoStartEnabled;
    setAutoStartLoading(true);
    try {
      await api.post('/bot/auto-start', { autoStart: nextValue });
      setAutoStartEnabled(nextValue);
      await fetchStatus();
    } catch (error) {
      console.error('[Dashboard] Failed to toggle auto start', error);
      alert('No se pudo actualizar el inicio automático.');
    } finally {
      setAutoStartLoading(false);
    }
  };

  if (loading && !status) {
    return <div>Cargando...</div>;
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <RemindersNotification reminders={todayReminders} />

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
        <RemindersWidget
          todayReminders={todayReminders}
          upcomingReminders={upcomingReminders}
          loading={false}
        />
      </section>

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
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
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
              <StatCard
                label="VIP activos"
                value={conversationStats.vipActive}
              />
              <StatCard
                label="Tasa de conversión"
                value={`${conversationStats.conversionRate}%`}
              />
              <StatCard
                label="Cerrados hoy"
                value={conversationStats.closedToday}
              />
              <StatCard
                label="Mensajes hoy"
                value={conversationStats.todayMessages}
              />
            </div>

            {conversationStats.mostActiveArea && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '12px', opacity: 0.9 }}>
                  Área más activa
                </p>
                <h4 style={{ margin: 0, fontSize: '18px' }}>
                  {conversationStats.mostActiveArea}
                </h4>
              </div>
            )}

            <div>
              <h3 style={{ margin: '0 0 0.75rem 0' }}>Distribución por área</h3>
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
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
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
            disabled={pauseLoading}
            style={{
              padding: '0.65rem 1.2rem',
              borderRadius: '10px',
              border: '1px solid #0f172a',
              background: pauseLoading ? '#f1f5f9' : '#fff',
              color: '#0f172a',
              cursor: pauseLoading ? 'not-allowed' : 'pointer',
              opacity: pauseLoading ? 0.75 : 1,
            }}
          >
            {pauseLoading
              ? 'Actualizando...'
              : status?.cache?.paused ?? status?.record?.paused
              ? 'Reanudar bot'
              : 'Pausar bot'}
          </button>
          <button
            onClick={handleResetSession}
            disabled={resetLoading}
            style={{
              padding: '0.65rem 1.2rem',
              borderRadius: '10px',
              border: 'none',
              background: resetLoading ? '#cbd5f5' : '#6366f1',
              color: '#fff',
              cursor: resetLoading ? 'not-allowed' : 'pointer',
              opacity: resetLoading ? 0.75 : 1,
            }}
          >
            {resetLoading ? 'Borrando...' : 'Desvincular Numero'}
          </button>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              minWidth: '220px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>Inicio automático</strong>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                  Mantiene el bot activo después de reiniciar.
                </p>
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: autoStartEnabled ? '#16a34a' : '#ef4444',
                  fontWeight: 600,
                }}
              >
                {autoStartEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleAutoStartToggle}
              disabled={autoStartLoading}
              style={{
                width: '64px',
                height: '32px',
                borderRadius: '999px',
                border: 'none',
                background: autoStartEnabled ? '#22c55e' : '#cbd5f5',
                position: 'relative',
                cursor: autoStartLoading ? 'not-allowed' : 'pointer',
                opacity: autoStartLoading ? 0.6 : 1,
                transition: 'background 0.2s ease',
                alignSelf: 'flex-start',
              }}
              aria-pressed={autoStartEnabled}
            >
              <span
                style={{
                  position: 'absolute',
                  width: '28px',
                  height: '28px',
                  top: '2px',
                  left: autoStartEnabled ? '34px' : '2px',
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.25)',
                  transition: 'left 0.2s ease',
                }}
              />
            </button>
          </div>
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
        {lastQrImage && lastQrImage.length > 100 ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <img
              src={
                lastQrImage.startsWith('data:')
                  ? lastQrImage
                  : `data:image/png;base64,${lastQrImage}`
              }
              alt="Codigo QR de WhatsApp"
              onError={(e) => {
                // Si la imagen no carga, mostrar solo el ASCII
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
                console.warn('⚠️ QR image failed to load, showing ASCII instead');
              }}
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
                  fontFamily: 'monospace',
                  fontSize: '8px',
                  lineHeight: '1',
                  margin: 0,
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
