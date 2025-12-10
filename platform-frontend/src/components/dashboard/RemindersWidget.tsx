import React from 'react';
import { FiAlertCircle, FiClock, FiCalendar, FiMessageCircle, FiPhone, FiStar, FiAlertTriangle, FiActivity } from 'react-icons/fi';
import './RemindersWidget.css';
import { useNavigate } from 'react-router-dom';

interface Reminder {
  id: number;
  title: string;
  description?: string;
  contactId: number;
  remindAt: string;
  contact?: {
    id: number;
    name: string;
    phone: string;
    obraSocial?: string;
    obraSocial2?: string;
    isVip?: boolean;
    isProblematic?: boolean;
    isChronic?: boolean;
  };
}

interface RemindersWidgetProps {
  todayReminders?: Reminder[];
  upcomingReminders?: Reminder[];
  loading?: boolean;
}

export const RemindersWidget: React.FC<RemindersWidgetProps> = ({
  todayReminders = [],
  upcomingReminders = [],
  loading = false,
}) => {
  const navigate = useNavigate();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleWriteMessage = (contactId: number, contactName: string) => {
    navigate(`/chat/${contactId}?name=${encodeURIComponent(contactName)}`);
  };

  const allReminders = [
    ...(Array.isArray(todayReminders) ? todayReminders : []),
    ...(Array.isArray(upcomingReminders) ? upcomingReminders : []),
  ].slice(0, 10);

  return (
    <div className="reminders-widget">
      <div className="reminders-widget__header">
        <div className="reminders-widget__title-group">
          <div className="reminders-widget__icon">
            <FiCalendar />
          </div>
          <h3>Próximos Recordatorios</h3>
        </div>
        {todayReminders.length > 0 && (
          <span className="reminders-widget__badge reminders-widget__badge--today">
            {todayReminders.length} hoy
          </span>
        )}
      </div>

      {loading ? (
        <div className="reminders-widget__loading">Cargando recordatorios...</div>
      ) : allReminders.length === 0 ? (
        <div className="reminders-widget__empty">
          No hay recordatorios próximos
        </div>
      ) : (
        <div className="reminders-widget__list">
          {Array.isArray(todayReminders) && todayReminders.length > 0 && (
            <>
              <div className="reminders-widget__section-title">
                <div className="reminders-widget__alert-icon">
                  <FiAlertCircle />
                </div>
                Para Hoy
              </div>
              {todayReminders.map((reminder) => (
                <div
                  key={`today-${reminder.id}`}
                  className="reminders-widget__item reminders-widget__item--today"
                >
                  <div className="reminders-widget__item-time">
                    <FiClock size={14} />
                    <span>{formatTime(reminder.remindAt)}</span>
                  </div>
                  <div className="reminders-widget__item-content">
                    <div className="reminders-widget__item-title">
                      {reminder.title}
                    </div>
                    {reminder.description && (
                      <div className="reminders-widget__item-description">
                        {reminder.description}
                      </div>
                    )}
                    <div className="reminders-widget__item-contact">
                      <div className="reminders-widget__contact-info">
                        <strong>{reminder.contact?.name || `Contacto #${reminder.contactId}`}</strong>
                        {reminder.contact?.phone && (
                          <div className="reminders-widget__phone">
                            <FiPhone size={12} />
                            <a href={`https://wa.me/${reminder.contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                              {reminder.contact.phone}
                            </a>
                          </div>
                        )}
                        {(reminder.contact?.isVip || reminder.contact?.isProblematic || reminder.contact?.isChronic) && (
                          <div className="reminders-widget__status-icons">
                            {reminder.contact.isVip && <span title="VIP"><FiStar size={12} /></span>}
                            {reminder.contact.isProblematic && <span title="Problemático"><FiAlertTriangle size={12} /></span>}
                            {reminder.contact.isChronic && <span title="Crónico"><FiActivity size={12} /></span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {reminder.contact && (
                    <button
                      className="reminders-widget__action-btn"
                      onClick={() => handleWriteMessage(reminder.contact!.id, reminder.contact!.name)}
                      title="Escribir mensaje"
                    >
                      <FiMessageCircle size={16} />
                    </button>
                  )}
                </div>
              ))}
            </>
          )}

          {Array.isArray(upcomingReminders) && upcomingReminders.length > 0 && (
            <>
              <div className="reminders-widget__section-title">
                Próximos
              </div>
              {Array.isArray(upcomingReminders) && upcomingReminders.slice(0, 10 - (Array.isArray(todayReminders) ? todayReminders.length : 0)).map((reminder) => (
                <div
                  key={`upcoming-${reminder.id}`}
                  className="reminders-widget__item"
                >
                  <div className="reminders-widget__item-date">
                    {formatDate(reminder.remindAt)}
                  </div>
                  <div className="reminders-widget__item-content">
                    <div className="reminders-widget__item-title">
                      {reminder.title}
                    </div>
                    {reminder.description && (
                      <div className="reminders-widget__item-description">
                        {reminder.description}
                      </div>
                    )}
                    <div className="reminders-widget__item-contact">
                      <div className="reminders-widget__contact-info">
                        <strong>{reminder.contact?.name || `Contacto #${reminder.contactId}`}</strong>
                        {reminder.contact?.phone && (
                          <div className="reminders-widget__phone">
                            <FiPhone size={12} />
                            <a href={`https://wa.me/${reminder.contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                              {reminder.contact.phone}
                            </a>
                          </div>
                        )}
                        {(reminder.contact?.isVip || reminder.contact?.isProblematic || reminder.contact?.isChronic) && (
                          <div className="reminders-widget__status-icons">
                            {reminder.contact.isVip && <span title="VIP"><FiStar size={12} /></span>}
                            {reminder.contact.isProblematic && <span title="Problemático"><FiAlertTriangle size={12} /></span>}
                            {reminder.contact.isChronic && <span title="Crónico"><FiActivity size={12} /></span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {reminder.contact && (
                    <button
                      className="reminders-widget__action-btn"
                      onClick={() => handleWriteMessage(reminder.contact!.id, reminder.contact!.name)}
                      title="Escribir mensaje"
                    >
                      <FiMessageCircle size={16} />
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RemindersWidget;
