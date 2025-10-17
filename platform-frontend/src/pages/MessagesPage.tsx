import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Message {
  id: number;
  contact: string;
  body: string;
  type: 'IN' | 'OUT';
  createdAt: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<Message[]>('/messages', {
        params: { limit: 200 },
      });
      setMessages(data);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <section
      style={{
        background: '#fff',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0 }}>Historial de mensajes</h2>
          <p style={{ margin: 0, color: '#64748b' }}>
            Visualiza los mensajes entrantes y salientes
          </p>
        </div>
        <button
          onClick={fetchMessages}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid #0f172a',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          Actualizar
        </button>
      </header>
      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <p style={{ color: '#ef4444' }}>{error}</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>
                  Fecha
                </th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>
                  Contacto
                </th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>
                  Tipo
                </th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>
                  Mensaje
                </th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    {new Date(msg.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{msg.contact}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    {msg.type === 'IN' ? 'Entrante' : 'Saliente'}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{msg.body}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
