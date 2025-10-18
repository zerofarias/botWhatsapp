import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type AreaItem = {
  id: number;
  name: string;
  isActive: boolean;
};

type WorkingHourItem = {
  id: number;
  areaId: number;
  startTime: string;
  endTime: string;
  days: string;
  message: string | null;
  area: AreaItem;
  createdAt: string;
  updatedAt: string;
};

type WorkingHourFormState = {
  areaId: string;
  startTime: string;
  endTime: string;
  days: number[];
  message: string;
};

const INITIAL_FORM: WorkingHourFormState = {
  areaId: '',
  startTime: '08:00',
  endTime: '18:00',
  days: [1, 2, 3, 4, 5],
  message:
    '🕓 Nuestro horario de atención es de 8:00 a 18:00 hs. Te responderemos apenas volvamos a estar disponibles.',
};

const DAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

function parseDays(value: string) {
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
}

export default function WorkingHoursPage() {
  const [records, setRecords] = useState<WorkingHourItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] =
    useState<WorkingHourFormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [recordResponse, areaResponse] = await Promise.all([
        api.get<WorkingHourItem[]>('/working-hours'),
        api.get<AreaItem[]>('/areas', { params: { active: true } }),
      ]);
      setRecords(recordResponse.data);
      setAreas(areaResponse.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
  }, []);

  const selectedAreaName = useMemo(() => {
    if (!formState.areaId) return 'Sin área seleccionada';
    const area = areas.find(
      (item) => item.id === Number.parseInt(formState.areaId, 10)
    );
    return area?.name ?? 'Área desconocida';
  }, [areas, formState.areaId]);

  const resetForm = () => {
    setFormState(INITIAL_FORM);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.areaId) {
      setError('Selecciona un área para continuar.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        areaId: Number(formState.areaId),
        startTime: formState.startTime,
        endTime: formState.endTime,
        days: formState.days,
        message: formState.message || null,
      };
      if (editingId) {
        await api.patch(`/working-hours/${editingId}`, payload);
      } else {
        await api.post('/working-hours', payload);
      }
      resetForm();
      await fetchAll();
    } catch (err) {
      console.error('[WorkingHours] Failed to save schedule', err);
      setError('No fue posible guardar el horario. Verifica los datos.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (record: WorkingHourItem) => {
    setEditingId(record.id);
    setFormState({
      areaId: record.areaId.toString(),
      startTime: record.startTime,
      endTime: record.endTime,
      days: parseDays(record.days),
      message: record.message ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar esta configuración horaria?')) return;
    try {
      await api.delete(`/working-hours/${id}`);
      if (editingId === id) {
        resetForm();
      }
      await fetchAll();
    } catch (err) {
      console.error('[WorkingHours] Failed to delete schedule', err);
      window.alert('No fue posible eliminar el horario.');
    }
  };

  const toggleDay = (value: number) => {
    setFormState((prev) => {
      const exists = prev.days.includes(value);
      return {
        ...prev,
        days: exists
          ? prev.days.filter((day) => day !== value)
          : [...prev.days, value].sort((a, b) => a - b),
      };
    });
  };

  return (
    <div className="panel">
      <header className="panel__header">
        <div>
          <h2>Horarios de atención</h2>
          <p className="panel__description">
            Define franjas horarias por área para controlar las derivaciones a
            operadores.
          </p>
        </div>
      </header>

      <section className="panel__content">
        <div className="panel__card">
          <h3>{editingId ? 'Editar horario' : 'Nuevo horario'}</h3>
          <form className="form" onSubmit={handleSubmit}>
            <label className="form__label">
              Área
              <select
                required
                value={formState.areaId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    areaId: event.target.value,
                  }))
                }
              >
                <option value="">Selecciona un área</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {selectedAreaName}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '1rem',
              }}
            >
              <label className="form__label">
                Hora de inicio
                <input
                  type="time"
                  required
                  value={formState.startTime}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      startTime: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="form__label">
                Hora de fin
                <input
                  type="time"
                  required
                  value={formState.endTime}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      endTime: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="form__label">
              Días activos
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '0.5rem',
                }}
              >
                {DAY_OPTIONS.map((day) => (
                  <label
                    key={day.value}
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formState.days.includes(day.value)}
                      onChange={() => toggleDay(day.value)}
                    />
                    <span>{day.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="form__label">
              Mensaje de ausencia
              <textarea
                rows={3}
                value={formState.message}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    message: event.target.value,
                  }))
                }
              />
            </label>

            {error && <p className="form__error">{error}</p>}

            <div className="form__actions">
              <button
                type="submit"
                className="chat-button chat-button--primary"
                disabled={submitting}
              >
                {submitting
                  ? 'Guardando…'
                  : editingId
                  ? 'Actualizar'
                  : 'Guardar'}
              </button>
              <button
                type="button"
                className="chat-button chat-button--secondary"
                onClick={resetForm}
                disabled={submitting}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>

        <div className="panel__card">
          <h3>Horarios configurados</h3>
          {loading ? (
            <div className="panel__placeholder">Cargando horarios…</div>
          ) : records.length ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Área</th>
                    <th>Días</th>
                    <th>Horario</th>
                    <th>Mensaje</th>
                    <th>Actualizado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>{record.area?.name ?? `Área #${record.areaId}`}</td>
                      <td>{formatDays(record.days)}</td>
                      <td>
                        {record.startTime} - {record.endTime}
                      </td>
                      <td style={{ maxWidth: '260px' }}>
                        {record.message ?? '—'}
                      </td>
                      <td>
                        {new Date(record.updatedAt).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => handleEdit(record)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="link-button link-button--danger"
                          onClick={() => handleDelete(record.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="panel__placeholder">
              Aún no se configuraron horarios de atención.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function formatDays(value: string) {
  const list = parseDays(value);
  if (!list.length) {
    return 'Sin días configurados';
  }
  const labels = DAY_OPTIONS.filter((day) => list.includes(day.value)).map(
    (day) => day.label
  );
  return labels.join(', ');
}
