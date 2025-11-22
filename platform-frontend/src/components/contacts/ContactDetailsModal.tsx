import { useEffect, useMemo, useState } from 'react';
import { FiX, FiPhone, FiCalendar, FiClock, FiAlertCircle } from 'react-icons/fi';
import { api } from '../../services/api';
import './ContactDetailsModal.css';

type ContactLike = {
  id?: number;
  name?: string | null;
  phone?: string | null;
  dni?: string | null;
  address1?: string | null;
  address2?: string | null;
  obraSocial?: string | null;
  obraSocial2?: string | null;
  isVip?: boolean | null;
  isProblematic?: boolean | null;
  isChronic?: boolean | null;
};

type ContactReminder = {
  id: number;
  title: string;
  description?: string | null;
  remindAt: string;
  repeatIntervalDays?: number | null;
  repeatUntil?: string | null;
  completedAt?: string | null;
};

type ContactDetailsModalProps = {
  isOpen: boolean;
  contact: ContactLike | null;
  onClose: () => void;
  onEdit?: () => void;
};

export function ContactDetailsModal({
  isOpen,
  contact,
  onClose,
  onEdit,
}: ContactDetailsModalProps) {
  const [reminders, setReminders] = useState<ContactReminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !contact?.id) {
      setReminders([]);
      setReminderError(null);
      return;
    }
    let cancelled = false;
    const fetchReminders = async () => {
      setLoadingReminders(true);
      setReminderError(null);
      try {
        const response = await api.get<ContactReminder[]>(
          `/contact-reminders/${contact.id}`
        );
        if (!cancelled) {
          setReminders(
            Array.isArray(response.data) ? response.data : []
          );
        }
      } catch (error) {
        if (!cancelled) {
          setReminderError(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los recordatorios'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingReminders(false);
        }
      }
    };
    void fetchReminders();
    return () => {
      cancelled = true;
    };
  }, [isOpen, contact?.id]);

  const flagBadges = useMemo(() => {
    if (!contact) return [];
    const badges: Array<{ key: string; label: string; description: string }> =
      [];
    if (contact.isVip) {
      badges.push({
        key: 'vip',
        label: 'Cliente importante 👑',
        description: 'Priorizar seguimiento y derivaciones',
      });
    }
    if (contact.isProblematic) {
      badges.push({
        key: 'problematic',
        label: 'Cliente problemático 😕',
        description: 'Requiere atención especial',
      });
    }
    if (contact.isChronic) {
      badges.push({
        key: 'chronic',
        label: 'Cliente crónico 🔁',
        description: 'Seguimiento recurrente',
      });
    }
    return badges;
  }, [contact]);

  if (!isOpen || !contact) {
    return null;
  }

  const infoRows: Array<{ label: string; value?: string | null }> = [
    { label: 'DNI', value: contact.dni },
    { label: 'Dirección', value: contact.address1 },
    { label: 'Referencia', value: contact.address2 },
    { label: 'Obra social', value: contact.obraSocial },
    { label: 'Obra social 2', value: contact.obraSocial2 },
  ].filter((row) => row.value);

  return (
    <>
      <div className="contact-details-modal__overlay" onClick={onClose} />
      <div
        className="contact-details-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Información del contacto"
      >
        <header className="contact-details-modal__header">
          <div>
            <p>Contacto #{contact.id ?? 'N/A'}</p>
            <h2>{contact.name ?? 'Sin nombre'}</h2>
            <span className="contact-details-modal__phone">
              <FiPhone aria-hidden="true" />
              {contact.phone ?? 'Sin número'}
            </span>
          </div>
          <div className="contact-details-modal__actions">
            {onEdit && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onEdit}
              >
                Editar
              </button>
            )}
            <button
              type="button"
              className="btn btn-icon"
              aria-label="Cerrar"
              onClick={onClose}
            >
              <FiX aria-hidden="true" />
            </button>
          </div>
        </header>

        {flagBadges.length > 0 && (
          <div className="contact-details-modal__flags">
            {flagBadges.map((badge) => (
              <div key={badge.key} className="contact-details-flag">
                <strong>{badge.label}</strong>
                <small>{badge.description}</small>
              </div>
            ))}
          </div>
        )}

        <section className="contact-details-modal__section">
          <h3>Datos del contacto</h3>
          {infoRows.length > 0 ? (
            <dl className="contact-details-modal__grid">
              {infoRows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="contact-details-modal__empty">
              No hay datos adicionales cargados.
            </p>
          )}
        </section>

        <section className="contact-details-modal__section">
          <header>
            <h3>Recordatorios</h3>
            <span className="contact-details-modal__hint">
              {loadingReminders
                ? 'Cargando…'
                : reminderError
                ? reminderError
                : reminders.length
                ? `${reminders.length} recordatorios`
                : 'Sin recordatorios para este contacto'}
            </span>
          </header>
          {reminders.length > 0 ? (
            <ul className="contact-details-modal__reminders">
              {reminders.map((reminder) => (
                <li key={reminder.id}>
                  <div className="contact-details-modal__reminder-info">
                    <strong>{reminder.title}</strong>
                    {reminder.description && <p>{reminder.description}</p>}
                  </div>
                  <div className="contact-details-modal__reminder-meta">
                    <span>
                      <FiCalendar aria-hidden="true" />
                      {new Date(reminder.remindAt).toLocaleString('es-AR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                    {reminder.repeatIntervalDays && (
                      <span>
                        <FiClock aria-hidden="true" />
                        Cada {reminder.repeatIntervalDays} días
                      </span>
                    )}
                    {reminder.repeatUntil && (
                      <span>
                        <FiAlertCircle aria-hidden="true" />
                        Hasta{' '}
                        {new Date(reminder.repeatUntil).toLocaleDateString(
                          'es-AR'
                        )}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            !loadingReminders &&
            !reminderError && (
              <p className="contact-details-modal__empty">
                Aún no hay recordatorios programados para este contacto.
              </p>
            )
          )}
        </section>
      </div>
    </>
  );
}

export default ContactDetailsModal;
