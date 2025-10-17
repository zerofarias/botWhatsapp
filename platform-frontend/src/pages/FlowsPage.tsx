import { FormEvent, useEffect, useState } from 'react';
import { api } from '../services/api';

interface Flow {
  id: number;
  keyword: string;
  response: string;
}

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [response, setResponse] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Flow[]>('/flows');
      setFlows(data);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los flujos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.post('/flows', {
        id: editingId ?? undefined,
        keyword,
        response,
      });

      setKeyword('');
      setResponse('');
      setEditingId(null);
      fetchFlows();
    } catch (err) {
      console.error(err);
      setError('No se pudo guardar el flujo.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta palabra clave?')) return;
    await api.delete(`/flows/${id}`);
    fetchFlows();
  };

  const startEdit = (flow: Flow) => {
    setEditingId(flow.id);
    setKeyword(flow.keyword);
    setResponse(flow.response);
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section
        style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          {editingId ? 'Editar palabra clave' : 'Nueva palabra clave'}
        </h2>
        <form
          onSubmit={handleSubmit}
          style={{ display: 'grid', gap: '1rem', maxWidth: '520px' }}
        >
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Palabra clave</span>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Ej: hola"
              required
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5f5',
              }}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Respuesta</span>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Respuesta automática"
              rows={4}
              required
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5f5',
              }}
            />
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              style={{
                padding: '0.65rem 1.2rem',
                borderRadius: '10px',
                border: 'none',
                background: '#0f172a',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {editingId ? 'Actualizar' : 'Agregar'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setKeyword('');
                  setResponse('');
                }}
                style={{
                  padding: '0.65rem 1.2rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5f5',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            )}
          </div>
          {error && <span style={{ color: '#ef4444' }}>{error}</span>}
        </form>
      </section>

      <section
        style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Palabras registradas</h2>
        {loading ? (
          <p>Cargando...</p>
        ) : flows.length === 0 ? (
          <p>Todavía no hay flujos configurados.</p>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr
                style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}
              >
                <th style={{ padding: '0.75rem 0.5rem' }}>Palabra</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Respuesta</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {flows.map((flow) => (
                <tr key={flow.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                    {flow.keyword}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{flow.response}</td>
                  <td
                    style={{
                      padding: '0.75rem 0.5rem',
                      display: 'flex',
                      gap: '0.75rem',
                    }}
                  >
                    <button
                      onClick={() => startEdit(flow)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#2563eb',
                        cursor: 'pointer',
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(flow.id)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
