import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';

interface QuietHourSetting {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

interface SystemSettings {
  timezone: string;
  language: 'es' | 'en';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY';
  autoCloseMinutes: number;
  notificationsEmail: boolean;
  notificationsWeb: boolean;
  notificationsPush: boolean;
  quietHours: QuietHourSetting[];
}

interface SettingsAudit {
  id: number;
  action: string;
  description?: string | null;
  createdAt: string;
  user: { id: number; name: string | null; username: string } | null;
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const DEFAULT_FORM: SystemSettings = {
  timezone: 'America/Buenos_Aires',
  language: 'es',
  dateFormat: 'DD/MM/YYYY',
  autoCloseMinutes: 30,
  notificationsEmail: true,
  notificationsWeb: true,
  notificationsPush: false,
  quietHours: Object.keys(DAY_LABELS).map((day) => ({
    day,
    enabled: day !== 'saturday' && day !== 'sunday',
    start: '08:00',
    end: '20:00',
  })),
};

function mergeQuietHours(list?: QuietHourSetting[]): QuietHourSetting[] {
  const map = new Map<string, QuietHourSetting>();
  if (Array.isArray(list)) {
    list.forEach((item) => {
      if (item?.day && DAY_LABELS[item.day]) {
        map.set(item.day, {
          day: item.day,
          enabled: Boolean(item.enabled),
          start: item.start || '08:00',
          end: item.end || '20:00',
        });
      }
    });
  }
  return DEFAULT_FORM.quietHours.map((item) => map.get(item.day) ?? item);
}

export default function SettingsPage() {
  const [form, setForm] = useState<SystemSettings>(DEFAULT_FORM);
  const [audits, setAudits] = useState<SettingsAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const timezoneOptions = useMemo(() => {
    const supported = (
      Intl as unknown as {
        supportedValuesOf?: (key: string) => string[];
      }
    ).supportedValuesOf;
    if (typeof supported === 'function') {
      return supported('timeZone');
    }
    return [
      'America/Buenos_Aires',
      'America/Mexico_City',
      'America/Bogota',
      'America/Santiago',
      'Europe/Madrid',
      'UTC',
    ];
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') {
      setMessage(text);
      setTimeout(() => setMessage(null), 2500);
    } else {
      setError(text);
      setTimeout(() => setError(null), 4000);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{
        settings: SystemSettings;
        audits: SettingsAudit[];
      }>('/settings');
      setForm({
        ...data.settings,
        quietHours: mergeQuietHours(data.settings.quietHours),
      });
      setAudits(data.audits ?? []);
    } catch (err) {
      console.error('[Settings] Failed to load settings', err);
      showToast('No se pudieron cargar las configuraciones.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    const isCheckbox =
      event.target instanceof HTMLInputElement &&
      event.target.type === 'checkbox';
    const checked = isCheckbox
      ? (event.target as HTMLInputElement).checked
      : false;
    setForm((prev) => ({
      ...prev,
      [name]: isCheckbox
        ? checked
        : name === 'autoCloseMinutes'
        ? Number(value)
        : value,
    }));
  };

  const handleQuietHourChange = (
    day: string,
    field: 'enabled' | 'start' | 'end',
    value: string | boolean
  ) => {
    setForm((prev) => ({
      ...prev,
      quietHours: prev.quietHours.map((item) =>
        item.day === day ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put<{ settings: SystemSettings }>(
        '/settings',
        {
          ...form,
          quietHours: form.quietHours,
        }
      );
      setForm({
        ...data.settings,
        quietHours: mergeQuietHours(data.settings.quietHours),
      });
      showToast('Configuración guardada.');
    } catch (err) {
      console.error('[Settings] Failed to save', err);
      showToast('No se pudo guardar la configuración.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await api.post<{ settings: SystemSettings }>(
        '/settings/export'
      );
      const blob = new Blob([JSON.stringify(data.settings, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system-settings-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Archivo exportado.');
    } catch (err) {
      console.error('[Settings] Failed to export', err);
      showToast('No se pudo exportar la configuración.', 'error');
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const { data } = await api.post<{ settings: SystemSettings }>(
        '/settings/import',
        { settings: parsed }
      );
      setForm({
        ...data.settings,
        quietHours: mergeQuietHours(data.settings.quietHours),
      });
      showToast('Configuración importada.');
    } catch (err) {
      console.error('[Settings] Failed to import', err);
      showToast('Archivo inválido o importación fallida.', 'error');
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      'Restablecerá todos los valores a los predeterminados. ¿Deseas continuar?'
    );
    if (!confirmed) return;
    setSaving(true);
    try {
      const { data } = await api.post<{ settings: SystemSettings }>(
        '/settings/reset'
      );
      setForm({
        ...data.settings,
        quietHours: mergeQuietHours(data.settings.quietHours),
      });
      showToast('Configuración restablecida.');
    } catch (err) {
      console.error('[Settings] Failed to reset', err);
      showToast('No se pudo restablecer.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Cargando configuración...</div>;
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem', paddingBottom: '2rem' }}>
      {(message || error) && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: message ? '#dcfce7' : '#fee2e2',
            color: message ? '#166534' : '#b91c1c',
          }}
        >
          {message || error}
        </div>
      )}

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
        <header>
          <h2 style={{ margin: 0 }}>Preferencias operativas</h2>
          <p style={{ margin: 0, color: '#64748b' }}>
            Ajusta idioma, horario y formato de fecha para todo el panel.
          </p>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Zona horaria</span>
            <select
              name="timezone"
              value={form.timezone}
              onChange={handleInputChange}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                border: '1px solid #cbd5f5',
              }}
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Idioma</span>
            <select
              name="language"
              value={form.language}
              onChange={handleInputChange}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                border: '1px solid #cbd5f5',
              }}
            >
              <option value="es">Español</option>
              <option value="en">Inglés</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Formato de fecha</span>
            <select
              name="dateFormat"
              value={form.dateFormat}
              onChange={handleInputChange}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                border: '1px solid #cbd5f5',
              }}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Cierre automático de chats (minutos)</span>
            <input
              name="autoCloseMinutes"
              type="number"
              min={5}
              max={480}
              value={form.autoCloseMinutes}
              onChange={handleInputChange}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                border: '1px solid #cbd5f5',
              }}
            />
            <small style={{ color: '#64748b' }}>
              Después de X minutos sin respuesta, el chat se cierra y envía un
              mensaje final.
            </small>
          </label>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <label
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              background: '#f1f5f9',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
            }}
          >
            <input
              type="checkbox"
              name="notificationsEmail"
              checked={form.notificationsEmail}
              onChange={handleInputChange}
            />
            Notificaciones por correo
          </label>
          <label
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              background: '#f1f5f9',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
            }}
          >
            <input
              type="checkbox"
              name="notificationsWeb"
              checked={form.notificationsWeb}
              onChange={handleInputChange}
            />
            Alertas dentro del panel
          </label>
          <label
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              background: '#f1f5f9',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
            }}
          >
            <input
              type="checkbox"
              name="notificationsPush"
              checked={form.notificationsPush}
              onChange={handleInputChange}
            />
            Notificaciones push
          </label>
        </div>
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
        <header>
          <h2 style={{ margin: 0 }}>Auditoría y respaldos</h2>
          <p style={{ margin: 0, color: '#64748b' }}>
            Descarga, importa o restablece configuraciones, y revisa quién hizo
            cada cambio.
          </p>
        </header>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              background: saving ? '#cbd5f5' : '#0f172a',
              color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid #94a3b8',
              background: '#fff',
              color: '#0f172a',
              cursor: 'pointer',
            }}
          >
            Exportar configuración
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid #94a3b8',
              background: '#fff',
              color: '#0f172a',
              cursor: 'pointer',
            }}
          >
            Importar archivo
          </button>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              background: '#f87171',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Restablecer valores
          </button>
          <input
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            ref={importInputRef}
            onChange={handleImportFile}
          />
        </div>

        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem',
            maxHeight: '320px',
            overflowY: 'auto',
          }}
        >
          {!audits.length ? (
            <p style={{ margin: 0, color: '#94a3b8' }}>
              Todavía no hay actividad registrada.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {audits.map((audit) => (
                <li
                  key={audit.id}
                  style={{
                    padding: '0.75rem 0',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {audit.user
                      ? `${audit.user.name ?? audit.user.username}`
                      : 'Sistema'}{' '}
                    · {audit.action}
                  </div>
                  {audit.description && (
                    <div style={{ color: '#475569' }}>{audit.description}</div>
                  )}
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    {new Date(audit.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
