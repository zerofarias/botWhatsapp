import React, { useEffect, useState } from 'react';
import { FiAlertCircle, FiX } from 'react-icons/fi';
import './RemindersNotification.css';

interface Reminder {
  id: number;
  title: string;
  contactId: number;
  contactName?: string;
  remindAt: string;
}

interface RemindersNotificationProps {
  reminders: Reminder[];
}

export const RemindersNotification: React.FC<RemindersNotificationProps> = ({
  reminders,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (reminders.length > 0) {
      setIsVisible(true);
    }
  }, [reminders]);

  if (!isVisible || !Array.isArray(reminders) || reminders.length === 0) {
    return null;
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`reminders-notification ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="reminders-notification__bar">
        <div className="reminders-notification__content" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="reminders-notification__icon">
            <FiAlertCircle />
          </div>
          <div className="reminders-notification__text">
            <strong>{Array.isArray(reminders) ? reminders.length : 0} recordatorio{Array.isArray(reminders) && reminders.length !== 1 ? 's' : ''} para hoy</strong>
            {!isExpanded && Array.isArray(reminders) && reminders.length > 0 && (
              <span className="reminders-notification__preview">
                {reminders[0].title}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="reminders-notification__close"
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
          }}
          aria-label="Cerrar"
        >
          <FiX />
        </button>
      </div>

      {isExpanded && (
        <div className="reminders-notification__details">
          {Array.isArray(reminders) && reminders.map((reminder) => (
            <div key={reminder.id} className="reminders-notification__item">
              <div className="reminders-notification__item-time">
                {formatTime(reminder.remindAt)}
              </div>
              <div className="reminders-notification__item-info">
                <div className="reminders-notification__item-title">
                  {reminder.title}
                </div>
                <div className="reminders-notification__item-contact">
                  {reminder.contactName || `Contacto #${reminder.contactId}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RemindersNotification;
