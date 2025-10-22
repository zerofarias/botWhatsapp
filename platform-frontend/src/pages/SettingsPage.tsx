import { FormEvent, useEffect, useState } from 'react';
import { api } from '../services/api';

interface BotRecord {
  displayName: string | null;
  phoneNumber: string | null;
  paused: boolean;
}

export default function SettingsPage() {
  const [form, setForm] = useState({
    displayName: '',
    phoneNumber: '',
    paused: false,
    conversationDuration: 20, // duración en horas
  });
  const [message, setMessage] = useState<string | null>(null);

  const fetchMetadata = async () => {
    const { data } = await api.get<{
      record: BotRecord;
      conversationDuration?: number;
    }>('/bot/status');
    setForm({
      displayName: data.record.displayName ?? '',
      phoneNumber: data.record.phoneNumber ?? '',
      paused: data.record.paused,
      conversationDuration: data.conversationDuration ?? 20,
    });
  };

  useEffect(() => {
    void fetchMetadata();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await api.patch('/bot/metadata', {
      displayName: form.displayName,
      phoneNumber: form.phoneNumber,
      conversationDuration: form.conversationDuration,
    });
    await api.post('/bot/pause', { paused: form.paused });
    setMessage('Configuración guardada.');
    setTimeout(() => setMessage(null), 2500);
  };

  return (
    <section
      style={{
        background: '#fff',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
        maxWidth: '520px',
      }}
    >
      <h2 style={{ marginTop: 0 }}>Configuración del bot</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span>Nombre público</span>
          <input
            value={form.displayName}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, displayName: event.target.value }))
            }
            placeholder="Nombre mostrado en el panel"
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5f5',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span>Duración de conversaciones abiertas (horas)</span>
          <input
            type="number"
            min={1}
            max={168}
            value={form.conversationDuration}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                conversationDuration: Number(e.target.value),
              }))
            }
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5f5',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span>Número asociado</span>
          <input
            value={form.phoneNumber}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))
            }
            placeholder="Ej: 5511999999999"
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5f5',
            }}
          />
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: '#f1f5f9',
            padding: '0.8rem 1rem',
            borderRadius: '10px',
          }}
        >
          <input
            type="checkbox"
            checked={form.paused}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, paused: event.target.checked }))
            }
          />
          Pausar bot (no responder automáticamente)
        </label>

        <button
          type="submit"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            border: 'none',
            background: '#0f172a',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Guardar cambios
        </button>
        {message && <div style={{ color: '#22c55e' }}>{message}</div>}
      </form>
    </section>
  );
}
