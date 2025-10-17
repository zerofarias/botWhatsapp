import { FormEvent, useEffect, useState } from 'react';
import { api } from '../services/api';

type AreaItem = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  activeOperators: number;
  createdAt: string;
  updatedAt: string;
};

type CreateAreaState = {
  name: string;
  description: string;
  isActive: boolean;
};

const initialCreateState: CreateAreaState = {
  name: '',
  description: '',
  isActive: true,
};

export default function AreasPage() {
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createState, setCreateState] =
    useState<CreateAreaState>(initialCreateState);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAreas = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<AreaItem[]>('/areas');
      setAreas(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAreas();
  }, []);

  const handleCreateArea = async (event: FormEvent) => {
    event.preventDefault();
    if (!createState.name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/areas', {
        name: createState.name.trim(),
        description: createState.description.trim() || null,
        isActive: createState.isActive,
      });
      setCreateState(initialCreateState);
      void fetchAreas();
    } catch (err) {
      console.error(err);
      setError('No se pudo crear el Ã¡rea.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (area: AreaItem) => {
    setUpdatingId(area.id);
    try {
      await api.put(`/areas/${area.id}`, { isActive: !area.isActive });
      void fetchAreas();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleInlineUpdate = async (
    areaId: number,
    changes: Partial<Pick<AreaItem, 'name' | 'description'>>
  ) => {
    setUpdatingId(areaId);
    try {
      await api.put(`/areas/${areaId}`, changes);
      void fetchAreas();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
        }}
      >
        <h2 style={{ margin: 0 }}>Crear Ã¡rea de atenciÃ³n</h2>
        <p style={{ marginTop: '0.25rem', color: '#64748b' }}>
          Organiza tus flujos por equipos (Soporte, Ventas, Administración...).
        </p>
        <form
          onSubmit={handleCreateArea}
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            marginTop: '1rem',
          }}
        >
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Nombre del Ã¡rea</span>
            <input
              value={createState.name}
              onChange={(event) =>
                setCreateState((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              required
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Descripción (opcional)</span>
            <input
              value={createState.description}
              onChange={(event) =>
                setCreateState((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              style={inputStyle}
            />
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <input
              type="checkbox"
              checked={createState.isActive}
              onChange={(event) =>
                setCreateState((prev) => ({
                  ...prev,
                  isActive: event.target.checked,
                }))
              }
            />
            Ãrea activa
          </label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                border: 'none',
                background: '#0f172a',
                color: '#fff',
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting ? 'Creando...' : 'Crear Ã¡rea'}
            </button>
            {error && <span style={{ color: '#ef4444' }}>{error}</span>}
          </div>
        </form>
      </section>

      <section
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
          display: 'grid',
          gap: '1rem',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>ÃÁreas configuradas</h2>
            <p style={{ margin: 0, color: '#64748b' }}>
              GestionÃ¡ quÃ© equipos reciben conversaciones y flujos.
            </p>
          </div>
          <button
            onClick={() => void fetchAreas()}
            style={{
              border: '1px solid #0f172a',
              borderRadius: '8px',
              padding: '0.5rem 1.25rem',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Actualizar
          </button>
        </header>

        {loading ? (
          <p>Cargando Ã¡reas...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '540px',
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: 'left',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <th style={tableHeaderStyle}>Nombre</th>
                  <th style={tableHeaderStyle}>Descripción</th>
                  <th style={tableHeaderStyle}>Operadores activos</th>
                  <th style={tableHeaderStyle}>Estado</th>
                  <th style={tableHeaderStyle}>Actualizado</th>
                  <th style={tableHeaderStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {areas.map((area) => (
                  <tr
                    key={area.id}
                    style={{ borderBottom: '1px solid #e2e8f0' }}
                  >
                    <td style={tableCellStyle}>
                      <InlineEditableText
                        value={area.name}
                        disabled={updatingId === area.id}
                        onSave={(value) =>
                          handleInlineUpdate(area.id, { name: value })
                        }
                      />
                    </td>
                    <td style={tableCellStyle}>
                      <InlineEditableText
                        value={area.description ?? ''}
                        placeholder="Sin descripción"
                        disabled={updatingId === area.id}
                        onSave={(value) =>
                          handleInlineUpdate(area.id, {
                            description: value || null,
                          })
                        }
                      />
                    </td>
                    <td style={tableCellStyle}>{area.activeOperators}</td>
                    <td style={tableCellStyle}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: area.isActive ? '#16a34a' : '#ef4444',
                          fontWeight: 600,
                        }}
                      >
                        <span
                          style={{
                            width: '0.55rem',
                            height: '0.55rem',
                            borderRadius: '999px',
                            background: area.isActive ? '#16a34a' : '#ef4444',
                          }}
                        />
                        {area.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td style={tableCellStyle}>
                      {new Date(area.updatedAt).toLocaleString()}
                    </td>
                    <td style={tableCellStyle}>
                      <button
                        onClick={() => handleToggleActive(area)}
                        disabled={updatingId === area.id}
                        style={linkButtonStyle}
                        type="button"
                      >
                        {area.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function InlineEditableText({
  value,
  onSave,
  disabled,
  placeholder,
}: {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (localValue === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(localValue);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => !disabled && setEditing(true)}
        style={{
          border: 'none',
          background: 'transparent',
          textAlign: 'left',
          color: value ? '#0f172a' : '#94a3b8',
          cursor: disabled ? 'not-allowed' : 'pointer',
          width: '100%',
        }}
      >
        {value || placeholder || 'Click para editar'}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
      <input
        value={localValue}
        onChange={(event) => setLocalValue(event.target.value)}
        autoFocus
        style={inputStyle}
      />
      <button
        type="submit"
        disabled={saving}
        style={{
          borderRadius: '8px',
          border: 'none',
          padding: '0.45rem 0.9rem',
          background: '#0f172a',
          color: '#fff',
          cursor: saving ? 'wait' : 'pointer',
        }}
      >
        Guardar
      </button>
      <button
        type="button"
        onClick={() => {
          setEditing(false);
          setLocalValue(value);
        }}
        style={linkButtonStyle}
      >
        Cancelar
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '0.65rem 1rem',
  borderRadius: '8px',
  border: '1px solid #cbd5f5',
};

const tableHeaderStyle: React.CSSProperties = {
  padding: '0.75rem 0.5rem',
  fontWeight: 600,
  color: '#475569',
  fontSize: '0.9rem',
};

const tableCellStyle: React.CSSProperties = {
  padding: '0.75rem 0.5rem',
  verticalAlign: 'top',
  fontSize: '0.92rem',
};

const linkButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#2563eb',
  cursor: 'pointer',
  padding: 0,
  fontSize: '0.9rem',
};
