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

const formatHourRange = (hour: number) => {
  const normalized = ((hour % 24) + 24) % 24;
  const next = (normalized + 1) % 24;
  return `${normalized.toString().padStart(2, '0')}:00 - ${next
    .toString()
    .padStart(2, '0')}:00`;
};

const formatSeconds = (seconds: number | null) => {
  if (seconds === null) return 'Sin datos';
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} s`;
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
        if (isMounted) setLoading(false);
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

  const dailyChart = useMemo(() => {
    if (messagesPerDay.length === 0) return null;
    const width = Math.max(messagesPerDay.length * 36, 320);
    const height = 220;
    const padX = 28;
    const padY = 24;
    const denominator = Math.max(maxDailyMessages, 1);
    const points = messagesPerDay.map((item, index) => {
      const x =
        padX +
        (index / Math.max(messagesPerDay.length - 1, 1)) * (width - padX * 2);
      const normalized = item.total / denominator;
      const y = height - padY - normalized * Math.max(height - padY * 2, 1);
      return {
        x,
        y,
        label: shortDateFormatter.format(new Date(item.day)),
        total: item.total,
        day: item.day,
      };
    });
    const linePath = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
    const first = points[0];
    const last = points[points.length - 1];
    const areaPath =
      linePath +
      ` L ${last.x} ${height - padY} L ${first.x} ${height - padY} Z`;
    return { width, height, points, linePath, areaPath };
  }, [messagesPerDay, maxDailyMessages]);

  return (
    <div className="stats-page">
      <header className="stats-header">
        <div>
          <p className="stats-subtitle">Estado general del sistema</p>
          <h1>Estadísticas</h1>
          <p className="stats-range-label">
            Última actualización: {new Date().toLocaleString('es-AR')}
          </p>
        </div>
        <label className="stats-range-selector">
          Rango:
          <select
            value={range}
            onChange={(event) => setRange(Number(event.target.value))}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error && <div className="stats-error">⚠️ {error}</div>}
      {loading && <div className="stats-loading">Cargando métricas…</div>}

      {data && !loading && (
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
              <span>Actividad diaria</span>
            </div>
            {messagesPerDay.length === 0 || !dailyChart ? (
              <p className="stats-empty">Aún no hay mensajes en este rango.</p>
            ) : (
              <div className="stats-chart stats-chart--line">
                <div className="stats-chart__canvas">
                  <svg
                    width={dailyChart.width}
                    height={dailyChart.height}
                    viewBox={`0 0 ${dailyChart.width} ${dailyChart.height}`}
                    className="stats-chart-svg"
                  >
                    <defs>
                      <linearGradient
                        id="messagesLine"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#1d4ed8" />
                      </linearGradient>
                      <linearGradient
                        id="messagesFill"
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="rgba(59,130,246,0.35)" />
                        <stop offset="100%" stopColor="rgba(59,130,246,0)" />
                      </linearGradient>
                    </defs>
                    <path
                      d={dailyChart.areaPath}
                      className="chart-area"
                      fill="url(#messagesFill)"
                    />
                    <path
                      d={dailyChart.linePath}
                      className="chart-line"
                      stroke="url(#messagesLine)"
                    />
                    {dailyChart.points.map((point) => (
                      <g key={`point-${point.day}`} className="chart-point">
                        <circle cx={point.x} cy={point.y} r={5} />
                        <text x={point.x} y={point.y - 12}>
                          {numberFormatter.format(point.total)}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
                <div className="chart-labels">
                  {dailyChart.points.map((point) => (
                    <div key={`label-${point.day}`} className="chart-label">
                      <span className="chart-label-date">{point.label}</span>
                      <span className="chart-label-total">
                        {numberFormatter.format(point.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default StatsPage;
