import { useEffect, useMemo, useState } from 'react';
import {
  getAdminAnalyticsSummary,
  type AdminAnalyticsResponse,
  type HotHourStat,
  type MessagesPerDayStat,
} from '../services/api';
import './StatsPage.css';

const RANGE_OPTIONS = [
  { label: '7 días', value: 7 },
  { label: '14 días', value: 14 },
  { label: '30 días', value: 30 },
];

const numberFormatter = new Intl.NumberFormat('es-AR');
const shortDateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
});
const longDateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'long',
});

const formatHourRange = (hour: number) => {
  const normalized = ((hour % 24) + 24) % 24;
  const next = (normalized + 1) % 24;
  return `${normalized.toString().padStart(2, '0')}:00 - ${next
    .toString()
    .padStart(2, '0')}:00`;
};

const formatSeconds = (seconds: number | null) => {
  if (seconds === null) return 'Sin datos';
  if (seconds < 60) {
    return `${Math.max(1, Math.round(seconds))} s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const rem = Math.round(seconds % 60);
    return rem ? `${minutes} min ${rem}s` : `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes ? `${hours} h ${remMinutes} min` : `${hours} h`;
};

const formatMinutes = (minutes: number | null) => {
  if (minutes === null) return 'Sin datos';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rem = Math.round(minutes % 60);
  return rem ? `${hours} h ${rem} min` : `${hours} h`;
};

const getBarWidth = (value: number, max: number) => {
  if (max <= 0) return '0%';
  return `${Math.max(6, Math.round((value / max) * 100))}%`;
};

const StatsPage = () => {
  const [range, setRange] = useState(7);
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getAdminAnalyticsSummary(range);
        if (!isMounted) return;
        setData(response);
      } catch (err) {
        if (!isMounted) return;
        const message =
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar los datos';
        setError(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [range]);

  const topMessageHours = useMemo<HotHourStat[]>(() => {
    if (!data) return [];
    return data.messaging.hotHours.slice(0, 6);
  }, [data]);

  const topOrderHours = useMemo<HotHourStat[]>(() => {
    if (!data) return [];
    return data.orders.hotHours.slice(0, 6);
  }, [data]);

  const messagesPerDay = useMemo<MessagesPerDayStat[]>(() => {
    if (!data) return [];
    return data.messaging.messagesPerDay;
  }, [data]);

  const maxHotMessages = Math.max(
    ...topMessageHours.map((item) => item.total),
    0
  );
  const maxHotOrders = Math.max(...topOrderHours.map((item) => item.total), 0);
  const maxDailyMessages = Math.max(
    ...messagesPerDay.map((item) => item.total),
    0
  );

  return (
    <div className="stats-page">
      <header className="stats-header">
        <div>
          <p className="stats-subtitle">Estado general del sistema</p>
          <h1>Estadísticas</h1>
          {data && (
            <span className="stats-range-label">
              Del {longDateFormatter.format(new Date(data.range.since))} al{' '}
              {longDateFormatter.format(new Date(data.range.until))}
            </span>
          )}
        </div>
        <div className="stats-range-selector">
          <label htmlFor="stats-range">Rango:</label>
          <select
            id="stats-range"
            value={range}
            onChange={(event) => setRange(Number(event.target.value))}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {error && <div className="stats-error">{error}</div>}
      {loading && <div className="stats-loading">Cargando métricas...</div>}

      {!loading && data && (
        <>
          <section className="stats-grid">
            <article className="stat-card stat-card-contacts">
              <div className="stat-card-icon">👥</div>
              <p>Total de contactos</p>
              <h3>{numberFormatter.format(data.contacts.total)}</h3>
              <span className="stat-foot">
                {numberFormatter.format(data.contacts.newInRange)} nuevos en el
                rango
              </span>
            </article>
            <article className="stat-card stat-card-new">
              <div className="stat-card-icon">✨</div>
              <p>Números nuevos</p>
              <h3>{numberFormatter.format(data.contacts.newNumbers)}</h3>
              <span className="stat-foot">
                Personas que escribieron por primera vez
              </span>
            </article>
            <article className="stat-card stat-card-night">
              <div className="stat-card-icon">🌙</div>
              <p>Mensajes nocturnos</p>
              <h3>{numberFormatter.format(data.messaging.nightlyMessages)}</h3>
              <span className="stat-foot">Entre 22:00 y 06:00</span>
            </article>
            <article className="stat-card stat-card-response">
              <div className="stat-card-icon">⚡</div>
              <p>Respuesta promedio</p>
              <h3>{formatSeconds(data.messaging.avgResponseSeconds)}</h3>
              <span className="stat-foot">
                Desde el último mensaje del contacto hasta un operador
              </span>
            </article>
            <article className="stat-card stat-card-closure">
              <div className="stat-card-icon">✅</div>
              <p>Cierre de pedidos</p>
              <h3>{formatMinutes(data.orders.avgClosureMinutes)}</h3>
              <span className="stat-foot">Promedio desde creación</span>
            </article>
          </section>

          <section className="stats-panels">
            <article className="stats-card">
              <div className="stats-card-header">
                <h3>Horarios calientes · Mensajes</h3>
                <span>Top {topMessageHours.length}</span>
              </div>
              {topMessageHours.length === 0 ? (
                <p className="stats-empty">No hay mensajes en el rango.</p>
              ) : (
                <ul className="stats-bars">
                  {topMessageHours.map((item) => (
                    <li key={`msg-${item.hour}`}>
                      <div className="stats-bar-info">
                        <span>{formatHourRange(item.hour)}</span>
                        <strong>{numberFormatter.format(item.total)}</strong>
                      </div>
                      <div className="stats-bar-track">
                        <div
                          className="stats-bar-fill"
                          style={{
                            width: getBarWidth(item.total, maxHotMessages),
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
            <article className="stats-card">
              <div className="stats-card-header">
                <h3>Horarios calientes · Pedidos</h3>
                <span>Top {topOrderHours.length}</span>
              </div>
              {topOrderHours.length === 0 ? (
                <p className="stats-empty">No hay pedidos registrados.</p>
              ) : (
                <ul className="stats-bars">
                  {topOrderHours.map((item) => (
                    <li key={`order-${item.hour}`}>
                      <div className="stats-bar-info">
                        <span>{formatHourRange(item.hour)}</span>
                        <strong>{numberFormatter.format(item.total)}</strong>
                      </div>
                      <div className="stats-bar-track">
                        <div
                          className="stats-bar-fill accent"
                          style={{
                            width: getBarWidth(item.total, maxHotOrders),
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>

          <section className="stats-card stats-chart-card">
            <div className="stats-card-header">
              <h3>Mensajes por día</h3>
              <span>actividad diaria</span>
            </div>
            {messagesPerDay.length === 0 ? (
              <p className="stats-empty">Aún no hay mensajes en este rango.</p>
            ) : (
              <div className="stats-chart">
                {messagesPerDay.map((item) => {
                  const label = shortDateFormatter.format(new Date(item.day));
                  const height =
                    maxDailyMessages > 0
                      ? Math.max(
                          4,
                          Math.round((item.total / maxDailyMessages) * 100)
                        )
                      : 0;
                  return (
                    <div key={item.day} className="chart-bar">
                      <div
                        className="chart-bar-fill"
                        style={{ height: `${height}%` }}
                      >
                        <span>{numberFormatter.format(item.total)}</span>
                      </div>
                      <small>{label}</small>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default StatsPage;
