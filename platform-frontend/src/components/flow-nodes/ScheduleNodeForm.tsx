import type { ScheduleWeek, ScheduleDay } from '../../views/FlowBuilder/types';
// import PropTypes from 'prop-types';

export interface ScheduleNodeFormProps {
  week: ScheduleWeek;
  onChange: (week: ScheduleWeek) => void;
}

const days: { key: keyof ScheduleWeek; label: string }[] = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export const ScheduleNodeForm: React.FC<ScheduleNodeFormProps> = ({
  week,
  onChange,
}) => {
  const handleAddRange = (day: keyof ScheduleWeek) => {
    const prev = week[day] || [];
    const next: ScheduleWeek = {
      ...week,
      [day]: [...prev, { from: '', to: '' }],
    };
    onChange(next);
  };
  const handleRemoveRange = (day: keyof ScheduleWeek, idx: number) => {
    const prev = week[day] || [];
    const next: ScheduleWeek = {
      ...week,
      [day]: prev.filter((_, i) => i !== idx),
    };
    onChange(next);
  };
  const handleChangeRange = (
    day: keyof ScheduleWeek,
    idx: number,
    field: 'from' | 'to',
    value: string
  ) => {
    const prev = week[day] || [];
    const updated: ScheduleDay[] = prev.map((r, i) =>
      i === idx ? { ...r, [field]: value } : r
    );
    const next: ScheduleWeek = { ...week, [day]: updated };
    onChange(next);
  };
  return (
    <div
      style={{
        background: '#e1f5fe',
        padding: 16,
        borderRadius: 8,
        border: '2px solid #0288d1',
        maxWidth: 480,
      }}
    >
      <h3 style={{ margin: 0, color: '#0288d1' }}>Horario semanal</h3>
      <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
        Define los rangos horarios para cada día. Puedes agregar varios rangos
        por día.
      </p>
      {days.map(({ key, label }) => {
        const ranges = week[key] ?? [];
        return (
          <div
            key={key}
            style={{
              marginBottom: 10,
              background: '#fff',
              borderRadius: 6,
              padding: 8,
              boxShadow: '0 1px 2px #0001',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
            {ranges.length > 0 ? (
              ranges.map((range, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <input
                    type="time"
                    value={range.from}
                    onChange={(e) =>
                      handleChangeRange(key, idx, 'from', e.target.value)
                    }
                    style={{ marginRight: 8 }}
                  />
                  <span style={{ margin: '0 4px' }}>a</span>
                  <input
                    type="time"
                    value={range.to}
                    onChange={(e) =>
                      handleChangeRange(key, idx, 'to', e.target.value)
                    }
                    style={{ marginRight: 8 }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveRange(key, idx)}
                    style={{
                      color: '#d32f2f',
                      background: 'none',
                      border: 'none',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <div style={{ color: '#aaa', fontSize: 12 }}>Sin rangos</div>
            )}
            <button
              type="button"
              onClick={() => handleAddRange(key)}
              style={{
                fontSize: 12,
                color: '#1976d2',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginTop: 2,
              }}
            >
              + Agregar rango
            </button>
          </div>
        );
      })}
    </div>
  );
};

// (PropTypes removido: innecesario en componentes TypeScript puros)
