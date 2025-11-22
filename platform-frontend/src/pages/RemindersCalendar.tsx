import { useCallback, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import '../styles/fullcalendar-legacy.css';
import './RemindersCalendar.css';
import { api } from '../services/api';
import ReminderModal, {
  type ContactSummary,
} from '../components/reminders/ReminderModal';

type ReminderContact = {
  id: number;
  name?: string | null;
  phone?: string | null;
  obraSocial?: string | null;
  obraSocial2?: string | null;
  isVip?: boolean | null;
  isProblematic?: boolean | null;
  isChronic?: boolean | null;
};

type CalendarReminder = {
  id: number;
  title: string;
  description?: string | null;
  remindAt: string;
  repeatIntervalDays?: number | string | null;
  repeatUntil?: string | null;
  completedAt?: string | null;
  contact?: ReminderContact | null;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    reminder: CalendarReminder;
    contactName?: string | null;
  };
};

const colorTokens = {
  default: { bg: '#c7d2fe', border: '#818cf8' },
  vip: { bg: '#fde68a', border: '#f59e0b' },
  alert: { bg: '#fecaca', border: '#ef4444' },
  chronic: { bg: '#bbf7d0', border: '#22c55e' },
};

function sanitizeDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseRepeatIntervalDays(
  repeat: CalendarReminder['repeatIntervalDays']
) {
  if (typeof repeat === 'number' && repeat > 0) {
    return repeat;
  }
  if (typeof repeat === 'string') {
    const parsed = Number(repeat);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function generateOccurrences(
  reminder: CalendarReminder,
  rangeStart: Date,
  rangeEnd: Date
) {
  const occurrences: Date[] = [];
  const base = sanitizeDate(reminder.remindAt);
  if (!base) return occurrences;

  const repeatDays = parseRepeatIntervalDays(reminder.repeatIntervalDays);
  const limitDate = sanitizeDate(reminder.repeatUntil);
  const endTimestamp = rangeEnd.getTime();
  const startTimestamp = rangeStart.getTime();

  const pushIfInRange = (timestamp: number) => {
    if (timestamp < startTimestamp || timestamp > endTimestamp) {
      return;
    }
    if (limitDate && timestamp > limitDate.getTime()) {
      return;
    }
    occurrences.push(new Date(timestamp));
  };

  if (!repeatDays) {
    pushIfInRange(base.getTime());
    return occurrences;
  }

  const repeatMs = repeatDays * 24 * 60 * 60 * 1000;
  let current = base.getTime();

  if (current < startTimestamp) {
    const diff = startTimestamp - current;
    const steps = Math.floor(diff / repeatMs);
    current += steps * repeatMs;
  }

  while (current <= endTimestamp) {
    if (limitDate && current > limitDate.getTime()) {
      break;
    }
    pushIfInRange(current);
    current += repeatMs;
  }

  return occurrences;
}

function computeNextOccurrence(reminder: CalendarReminder) {
  const now = new Date();
  const futureRange = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const occurrences = generateOccurrences(
    reminder,
    now,
    futureRange
  );
  return occurrences[0] ?? null;
}

export default function RemindersCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReminder, setSelectedReminder] =
    useState<CalendarReminder | null>(null);
  const [rangeLabel, setRangeLabel] = useState<string>('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState<Date | null>(null);
  const [modalDefaultContact, setModalDefaultContact] =
    useState<ContactSummary | null>(null);
  const [currentRange, setCurrentRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  const fetchReminders = useCallback(
    async (start: Date, end: Date) => {
      setLoading(true);
      try {
        const response = await api.get<CalendarReminder[]>('/contact-reminders', {
          params: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
        });
        const mapped: CalendarEvent[] = (response.data ?? []).flatMap(
          (reminder) => {
            const contactName = reminder.contact?.name ?? 'Contacto';
            const title = `${contactName} · ${reminder.title}`;
            let palette = colorTokens.default;
            if (reminder.contact?.isVip) palette = colorTokens.vip;
            else if (reminder.contact?.isProblematic) palette = colorTokens.alert;
            else if (reminder.contact?.isChronic) palette = colorTokens.chronic;

            const occurrences = generateOccurrences(reminder, start, end);
            if (!occurrences.length) {
              return [];
            }

            return occurrences.map((date) => ({
              id: `${reminder.id}-${date.getTime()}`,
              title,
              start: date.toISOString(),
              backgroundColor: palette.bg,
              borderColor: palette.border,
              extendedProps: {
                reminder,
                contactName,
              },
            }));
          }
        );
        setEvents(mapped);
      } catch (error) {
        console.error('[RemindersCalendar] Failed to load reminders', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const start = arg.start;
      const end = arg.end;
      setCurrentRange({ start, end });
      setRangeLabel(
        `${start.toLocaleDateString('es-AR', {
          month: 'long',
          year: 'numeric',
        })}`
      );
      void fetchReminders(start, end);
    },
    [fetchReminders]
  );

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const reminder = clickInfo.event.extendedProps.reminder as CalendarReminder;
    setSelectedReminder(reminder);
  }, []);

  const handleDateClick = useCallback((arg: DateClickArg) => {
    setModalDefaultDate(arg.date);
    setModalDefaultContact(null);
    setCreateModalOpen(true);
  }, []);

  const handleReminderCreated = useCallback(() => {
    setCreateModalOpen(false);
    if (currentRange) {
      void fetchReminders(currentRange.start, currentRange.end);
    }
  }, [currentRange, fetchReminders]);

  const nextOccurrence = useMemo(() => {
    if (!selectedReminder) return null;
    const next = computeNextOccurrence(selectedReminder);
    if (!next) return null;
    return next.toLocaleString('es-AR', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
  }, [selectedReminder]);

  return (
    <div className="reminders-calendar-page">
      <header className="reminders-calendar-header">
        <div>
          <p>Agenda inteligente</p>
          <h1>Recordatorios crónicos</h1>
        </div>
        <div className="reminders-calendar-header-meta">
          {loading && <span>Cargando…</span>}
          {rangeLabel && <span>{rangeLabel}</span>}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setModalDefaultDate(new Date());
              setModalDefaultContact(null);
              setCreateModalOpen(true);
            }}
          >
            Nuevo recordatorio
          </button>
        </div>
      </header>

      <div className="reminders-calendar-content">
        <div className="reminders-calendar-main">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            locale="es"
            events={events}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            dateClick={handleDateClick}
            height="auto"
            selectable
            eventDisplay="block"
          />
        </div>

        <aside className="reminders-calendar-details">
          {selectedReminder ? (
            <>
              <h2>{selectedReminder.title}</h2>
              <div className="reminders-calendar-details-section">
                <h3>Contacto</h3>
                <p>
                  <strong>
                    {selectedReminder.contact?.name ?? 'Sin nombre'}
                  </strong>
                </p>
                {selectedReminder.contact?.phone && (
                  <p>{selectedReminder.contact.phone}</p>
                )}
                {selectedReminder.contact?.obraSocial && (
                  <p>
                    Obra social:{' '}
                    <strong>{selectedReminder.contact.obraSocial}</strong>
                  </p>
                )}
                {selectedReminder.contact?.obraSocial2 && (
                  <p>
                    Complementaria:{' '}
                    <strong>{selectedReminder.contact.obraSocial2}</strong>
                  </p>
                )}
                {selectedReminder.contact && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      const contact = selectedReminder.contact!;
                      setModalDefaultContact({
                        id: contact.id,
                        name: contact.name ?? 'Sin nombre',
                        phone: contact.phone ?? '',
                        obraSocial: contact.obraSocial,
                        obraSocial2: contact.obraSocial2,
                      });
                      setModalDefaultDate(new Date());
                      setCreateModalOpen(true);
                    }}
                  >
                    Nuevo recordatorio para este contacto
                  </button>
                )}
              </div>

              <div className="reminders-calendar-details-section">
                <h3>Próxima notificación</h3>
                <p>
                  <strong>
                    {nextOccurrence ?? 'No hay próximas repeticiones'}
                  </strong>
                </p>
                {selectedReminder.description && (
                  <p className="reminders-calendar-description">
                    {selectedReminder.description}
                  </p>
                )}
                {selectedReminder.repeatIntervalDays && (
                  <p>
                    Repite cada{' '}
                    <strong>{selectedReminder.repeatIntervalDays}</strong> días
                  </p>
                )}
                {selectedReminder.repeatUntil && (
                  <p>
                    Hasta{' '}
                    {new Date(selectedReminder.repeatUntil).toLocaleDateString(
                      'es-AR'
                    )}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="reminders-calendar-details-empty">
              Selecciona un recordatorio para ver los detalles
            </div>
          )}
        </aside>
      </div>

      <ReminderModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        defaultDate={modalDefaultDate ?? undefined}
        defaultContact={modalDefaultContact ?? undefined}
        onCreated={handleReminderCreated}
      />
    </div>
  );
}
