import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import './ReminderModal.css';

export type ContactSummary = {
  id: number;
  name: string;
  phone: string;
  obraSocial?: string | null;
  obraSocial2?: string | null;
};

type ReminderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: Date | null;
  defaultContact?: ContactSummary | null;
  onCreated?: () => void;
};

type ReminderFormState = {
  contactId: string;
  title: string;
  description: string;
  remindAt: string;
  repeatIntervalDays: string;
  repeatUntil: string;
};

const INITIAL_FORM: ReminderFormState = {
  contactId: '',
  title: '',
  description: '',
  remindAt: '',
  repeatIntervalDays: '',
  repeatUntil: '',
};

export default function ReminderModal({
  isOpen,
  onClose,
  defaultDate,
  defaultContact,
  onCreated,
}: ReminderModalProps) {
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [formState, setFormState] = useState<ReminderFormState>(INITIAL_FORM);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || defaultContact) {
      return;
    }
    let cancelled = false;
    const fetchContacts = async () => {
      setLoadingContacts(true);
      try {
        const response = await api.get<ContactSummary[]>('/contacts');
        if (!cancelled) {
          setContacts(response.data ?? []);
        }
      } catch (err) {
        console.error('[ReminderModal] Failed to load contacts', err);
        if (!cancelled) {
          setContacts([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingContacts(false);
        }
      }
    };
    void fetchContacts();
    return () => {
      cancelled = true;
    };
  }, [isOpen, defaultContact]);

  useEffect(() => {
    if (!isOpen) return;
    const initialDate = defaultDate ?? new Date();
    const isoLocal = new Date(initialDate.getTime() - initialDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setFormState((prev) => ({
      ...INITIAL_FORM,
      contactId: defaultContact ? String(defaultContact.id) : prev.contactId,
      remindAt: isoLocal,
    }));
    setError(null);
  }, [isOpen, defaultContact, defaultDate]);

  const contactOptions = useMemo(() => {
    if (defaultContact) {
      return [defaultContact];
    }
    return contacts;
  }, [defaultContact, contacts]);

  const selectedContact = useMemo(() => {
    const id = Number(formState.contactId || defaultContact?.id);
    if (!id) return defaultContact ?? null;
    return (
      defaultContact?.id === id
        ? defaultContact
        : contacts.find((contact) => contact.id === id) ?? null
    );
  }, [formState.contactId, defaultContact, contacts]);

  const handleChange = (field: keyof ReminderFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const contactId =
      defaultContact?.id ??
      (formState.contactId ? Number(formState.contactId) : null);
    if (!contactId) {
      setError('Selecciona un contacto');
      return;
    }
    if (!formState.title.trim()) {
      setError('El título es obligatorio');
      return;
    }
    if (!formState.remindAt) {
      setError('Debes elegir una fecha');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // For repeatUntil, if it's just a date string, append end-of-day time to include the full day
      let repeatUntilDate: Date | null = null;
      if (formState.repeatUntil) {
        if (formState.repeatUntil.includes('T')) {
          // It's a datetime
          repeatUntilDate = new Date(formState.repeatUntil);
        } else {
          // It's just a date (YYYY-MM-DD), set to end of day
          const dateObj = new Date(formState.repeatUntil + 'T23:59:59');
          repeatUntilDate = dateObj;
        }
      }

      await api.post(`/contact-reminders/${contactId}`, {
        title: formState.title.trim(),
        description: formState.description.trim() || null,
        remindAt: new Date(formState.remindAt),
        repeatIntervalDays: formState.repeatIntervalDays
          ? Number(formState.repeatIntervalDays)
          : null,
        repeatUntil: repeatUntilDate,
      });
      onCreated?.();
      onClose();
    } catch (err) {
      console.error('[ReminderModal] Failed to create reminder', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear el recordatorio'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="reminder-modal__overlay" onClick={onClose} />
      <div className="reminder-modal__panel" role="dialog" aria-modal="true">
        <header className="reminder-modal__header">
          <h2>Nuevo recordatorio</h2>
          <button
            type="button"
            className="reminder-modal__close"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <form className="reminder-modal__form" onSubmit={handleSubmit}>
          {!defaultContact && (
            <label>
              Contacto
              <select
                value={formState.contactId}
                onChange={handleChange('contactId')}
                disabled={loadingContacts || saving}
              >
                <option value="">Selecciona un contacto</option>
                {contactOptions.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} · {contact.phone}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedContact && (
            <div className="reminder-modal__contact-info">
              <p>
                <strong>{selectedContact.name}</strong> - {selectedContact.phone}
              </p>
              {selectedContact.obraSocial && (
                <p>Obra social: {selectedContact.obraSocial}</p>
              )}
              {selectedContact.obraSocial2 && (
                <p>Complementaria: {selectedContact.obraSocial2}</p>
              )}
            </div>
          )}

          <label>
            Título
            <input
              type="text"
              value={formState.title}
              onChange={handleChange('title')}
              placeholder="Ej: Retirar Neumoterol 400"
              disabled={saving}
            />
          </label>

          <label>
            Detalle
            <textarea
              value={formState.description}
              onChange={handleChange('description')}
              placeholder="Notas para el operador o detalles del retiro"
              disabled={saving}
            />
          </label>

          <div className="reminder-modal__row">
            <label>
              Fecha y hora
              <input
                type="datetime-local"
                value={formState.remindAt}
                onChange={handleChange('remindAt')}
                disabled={saving}
              />
            </label>
            <label>
              Repetir cada (días)
              <input
                type="number"
                min="1"
                value={formState.repeatIntervalDays}
                onChange={handleChange('repeatIntervalDays')}
                placeholder="30"
                disabled={saving}
              />
            </label>
          </div>

          <label>
            Repetir hasta (opcional)
            <input
              type="date"
              value={formState.repeatUntil}
              onChange={handleChange('repeatUntil')}
              disabled={saving}
            />
          </label>

          {error && <div className="reminder-modal__error">{error}</div>}

          <footer className="reminder-modal__actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Crear recordatorio'}
            </button>
          </footer>
        </form>
      </div>
    </>
  );
}
