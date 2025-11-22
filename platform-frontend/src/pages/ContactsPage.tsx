import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { EditContactModal } from '../components/contacts/EditContactModal';
import './ContactsPage.css';

type AreaItem = {
  id: number;
  name: string;
  isActive: boolean;
};

type ContactItem = {
  id: number;
  name: string;
  phone: string;
  dni: string | null;
  obraSocial?: string | null;
  obraSocial2?: string | null;
  area: AreaItem | null;
  isVip?: boolean;
  isProblematic?: boolean;
  isChronic?: boolean;
  createdAt: string;
};

type EditingContactItem = {
  id: number;
  name: string;
  phone: string;
  dni: string | null;
  areaId: number | null;
  obraSocial?: string | null;
  obraSocial2?: string | null;
  isVip?: boolean;
  isProblematic?: boolean;
  isChronic?: boolean;
};

type ContactReminder = {
  id: number;
  contactId: number;
  title: string;
  description?: string | null;
  remindAt: string;
  repeatIntervalDays?: number | null;
  repeatUntil?: string | null;
  contact?: {
    id: number;
    name: string;
    phone: string;
    obraSocial?: string | null;
  } | null;
};

type ContactFormState = {
  name: string;
  phone: string;
  dni: string;
  areaId: string;
  obraSocial: string;
  obraSocial2: string;
  isVip: boolean;
  isProblematic: boolean;
  isChronic: boolean;
};

const INITIAL_FORM: ContactFormState = {
  name: '',
  phone: '',
  dni: '',
  areaId: '',
  obraSocial: '',
  obraSocial2: '',
  isVip: false,
  isProblematic: false,
  isChronic: false,
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [formState, setFormState] = useState<ContactFormState>(INITIAL_FORM);
  const [search, setSearch] = useState('');
  const [importFormat, setImportFormat] = useState<'csv' | 'json'>('csv');
  const [importPayload, setImportPayload] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingContact, setEditingContact] =
    useState<EditingContactItem | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [dailyReminders, setDailyReminders] = useState<ContactReminder[]>([]);
  const [reminderForm, setReminderForm] = useState<{
    contactId: string;
    title: string;
    description: string;
    remindAt: string;
    repeatIntervalDays: string;
    repeatUntil: string;
  }>({
    contactId: '',
    title: '',
    description: '',
    remindAt: '',
    repeatIntervalDays: '',
    repeatUntil: '',
  });
  const [creatingReminder, setCreatingReminder] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [contactResponse, areaResponse] = await Promise.all([
        api.get<ContactItem[]>('/contacts'),
        api.get<AreaItem[]>('/areas', { params: { active: true } }),
      ]);
      setContacts(contactResponse.data);
      setAreas(areaResponse.data);
      setLastSync(new Date());
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyReminders = async () => {
    try {
      const response = await api.get<{
        reminders: ContactReminder[];
      }>('/contact-reminders/due');
      setDailyReminders(response.data.reminders || []);
    } catch (err) {
      console.error('[Contacts] Failed to load reminders', err);
    }
  };

  useEffect(() => {
    void fetchAll();
    void fetchDailyReminders();
  }, []);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) {
      return contacts;
    }
    const term = search.trim().toLowerCase();
    return contacts.filter((contact) => {
      const areaName = contact.area?.name ?? '';
      return (
        contact.name.toLowerCase().includes(term) ||
        contact.phone.toLowerCase().includes(term) ||
        (contact.dni ?? '').toLowerCase().includes(term) ||
        areaName.toLowerCase().includes(term) ||
        (contact.obraSocial ?? '').toLowerCase().includes(term) ||
        (contact.obraSocial2 ?? '').toLowerCase().includes(term)
      );
    });
  }, [contacts, search]);

  const resetForm = () => {
    setFormState(INITIAL_FORM);
    setError(null);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/contacts', {
        name: formState.name,
        phone: formState.phone,
        dni: formState.dni || null,
        areaId: formState.areaId ? Number(formState.areaId) : null,
        obraSocial: formState.obraSocial || null,
        obraSocial2: formState.obraSocial2 || null,
        isVip: formState.isVip,
        isProblematic: formState.isProblematic,
        isChronic: formState.isChronic,
      });
      resetForm();
      await fetchAll();
    } catch (err) {
      console.error('[Contacts] Failed to create contact', err);
      setError(
        'No fue posible crear el contacto. Verifica los datos ingresados.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este contacto?')) return;
    try {
      await api.delete(`/contacts/${id}`);
      await fetchAll();
    } catch (err) {
      console.error('[Contacts] Failed to delete contact', err);
      window.alert('No fue posible eliminar el contacto.');
    }
  };

  const handleImport = async () => {
    if (!importPayload.trim()) {
      setError('Ingresa datos para importar.');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      if (importFormat === 'csv') {
        await api.post('/contacts/import/csv', { payload: importPayload });
      } else {
        await api.post('/contacts/import/json', { payload: importPayload });
      }
      setImportPayload('');
      await fetchAll();
    } catch (err) {
      console.error('[Contacts] Failed to import contacts', err);
      setError('El formato no es válido o contiene datos incompletos.');
    } finally {
      setImporting(false);
    }
  };

  const handleEditStart = (contact: ContactItem) => {
    setEditingContact({
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      dni: contact.dni,
      areaId: contact.area?.id ?? null,
      obraSocial: contact.obraSocial ?? null,
      obraSocial2: contact.obraSocial2 ?? null,
      isVip: contact.isVip ?? false,
      isProblematic: contact.isProblematic ?? false,
      isChronic: contact.isChronic ?? false,
    });
  };

  const handleEditClose = () => {
    setEditingContact(null);
  };

  const handleEditSuccess = async () => {
    await fetchAll();
    await fetchDailyReminders();
    setEditingContact(null);
  };

  const handleCreateReminder = async () => {
    if (!reminderForm.contactId || !reminderForm.title || !reminderForm.remindAt) {
      window.alert('Selecciona contacto, título y fecha para el recordatorio.');
      return;
    }
    setCreatingReminder(true);
    try {
      await api.post(
        `/contact-reminders/${reminderForm.contactId}`,
        {
          title: reminderForm.title,
          description: reminderForm.description || null,
          remindAt: reminderForm.remindAt,
          repeatIntervalDays: reminderForm.repeatIntervalDays
            ? Number(reminderForm.repeatIntervalDays)
            : null,
          repeatUntil: reminderForm.repeatUntil || null,
        }
      );
      setReminderForm({
        contactId: '',
        title: '',
        description: '',
        remindAt: '',
        repeatIntervalDays: '',
        repeatUntil: '',
      });
      await fetchDailyReminders();
    } catch (err) {
      console.error('[Contacts] Failed to create reminder', err);
      window.alert('No se pudo crear el recordatorio.');
    } finally {
      setCreatingReminder(false);
    }
  };

  const handleTriggerReminder = async (reminderId: number) => {
    try {
      await api.post(`/contact-reminders/trigger/${reminderId}`);
      await fetchDailyReminders();
    } catch (err) {
      console.error('[Contacts] Failed to trigger reminder', err);
    }
  };

  const totalContacts = contacts.length;
  const totalAreas = areas.length;
  const unassignedContacts = contacts.filter((c) => !c.area).length;
  const lastSyncLabel = lastSync
    ? lastSync.toLocaleString('es-AR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : 'Sincronizando…';

  return (
    <div className="contacts-page">
      <section className="contacts-hero">
        <div className="contacts-hero__text">
          <p>Contactos</p>
          <h1>Base centralizada de clientes</h1>
          <span>Última sincronización: {lastSyncLabel}</span>
        </div>
        <div className="contacts-hero__metrics">
          <article className="contacts-metric">
            <h4>Total registrados</h4>
            <strong>{totalContacts}</strong>
            <span>Registros activos</span>
          </article>
          <article className="contacts-metric">
            <h4>Áreas disponibles</h4>
            <strong>{totalAreas}</strong>
            <span>Grupos operativos</span>
          </article>
          <article className="contacts-metric">
            <h4>Sin área</h4>
            <strong>{unassignedContacts}</strong>
            <span>Contactos por asignar</span>
          </article>
        </div>
      </section>

      <section className="contacts-actions">
        <div className="contacts-search">
          <label htmlFor="contacts-search-input">Buscar contactos</label>
          <input
            id="contacts-search-input"
            type="search"
            placeholder="Nombre, teléfono, DNI o área…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <button
          type="button"
          className="contacts-refresh"
          onClick={() => void fetchAll()}
          disabled={loading}
        >
          {loading ? 'Actualizando…' : 'Actualizar datos'}
        </button>
      </section>

      <section className="contacts-panels">
        <div className="contacts-card">
          <header>
            <div>
              <p>Nuevo registro</p>
              <h2>Crear contacto</h2>
            </div>
          </header>
          <form className="contacts-form" onSubmit={handleCreate}>
            <label>
              Nombre completo
              <input
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              Teléfono
              <input
                value={formState.phone}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    phone: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              DNI (opcional)
              <input
                value={formState.dni}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    dni: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Área asignada
              <select
                value={formState.areaId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    areaId: event.target.value,
                  }))
                }
              >
                <option value="">Sin asignar</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
            {error && <p className="contacts-form__error">{error}</p>}
            <label>
              Obra social
              <input
                value={formState.obraSocial}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    obraSocial: event.target.value,
                  }))
                }
                placeholder="Ej: Swiss Medical"
              />
            </label>
            <label>
              Obra social 2
              <input
                value={formState.obraSocial2}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    obraSocial2: event.target.value,
                  }))
                }
                placeholder="Otra cobertura (opcional)"
              />
            </label>
            <div className="contacts-switches">
              <label className="contacts-switch">
                <input
                  type="checkbox"
                  checked={formState.isVip}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      isVip: event.target.checked,
                    }))
                  }
                />
                <span>
                  <strong>Cliente importante 👑</strong>
                  <small>Priorizar seguimiento y derivaciones</small>
                </span>
              </label>
              <label className="contacts-switch">
                <input
                  type="checkbox"
                  checked={formState.isProblematic}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      isProblematic: event.target.checked,
                    }))
                  }
                />
                <span>
                  <strong>Cliente problemático 😕</strong>
                  <small>Requiere atención especial</small>
                </span>
              </label>
              <label className="contacts-switch">
                <input
                  type="checkbox"
                  checked={formState.isChronic}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      isChronic: event.target.checked,
                    }))
                  }
                />
                <span>
                  <strong>Cliente crónico 🔁</strong>
                  <small>Pedidos recurrentes o tratamientos</small>
                </span>
              </label>
            </div>
            <div className="contacts-form__actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Guardando…' : 'Guardar contacto'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={resetForm}
                disabled={submitting}
              >
                Limpiar
              </button>
            </div>
          </form>
        </div>

        <div className="contacts-card">
          <header>
            <div>
              <p>Bulk load</p>
              <h2>Importar contactos</h2>
            </div>
          </header>
          <div className="contacts-form">
            <label>
              Formato
              <select
                value={importFormat}
                onChange={(event) =>
                  setImportFormat(event.target.value as 'csv' | 'json')
                }
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </label>
            <label>
              Datos a importar
              <textarea
                rows={8}
                value={importPayload}
                onChange={(event) => setImportPayload(event.target.value)}
                placeholder={
                  importFormat === 'csv'
                    ? 'name,phone,dni,area'
                    : '[{"name":"Juan","phone":"+549...","dni":"12345678"}]'
                }
              />
            </label>
            {error && <p className="contacts-form__error">{error}</p>}
            <div className="contacts-form__actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? 'Importando…' : 'Importar contactos'}
              </button>
            </div>
          </div>
        </div>
        <div className="contacts-card">
          <header>
            <div>
              <p>Agenda inteligente</p>
              <h2>Crear recordatorio</h2>
            </div>
          </header>
          <div className="contacts-form">
            <label>
              Contacto
              <select
                value={reminderForm.contactId}
                onChange={(event) =>
                  setReminderForm((prev) => ({
                    ...prev,
                    contactId: event.target.value,
                  }))
                }
              >
                <option value="">Selecciona un contacto</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} ({contact.phone})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Título
              <input
                type="text"
                value={reminderForm.title}
                onChange={(event) =>
                  setReminderForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                placeholder="Ej: Retiro de medicación"
              />
            </label>
            <label>
              Descripción
              <textarea
                rows={3}
                value={reminderForm.description}
                onChange={(event) =>
                  setReminderForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Detalles o instrucciones"
              />
            </label>
            <label>
              Fecha
              <input
                type="datetime-local"
                value={reminderForm.remindAt}
                onChange={(event) =>
                  setReminderForm((prev) => ({
                    ...prev,
                    remindAt: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Repetir cada (días)
              <input
                type="number"
                min={0}
                value={reminderForm.repeatIntervalDays}
                onChange={(event) =>
                  setReminderForm((prev) => ({
                    ...prev,
                    repeatIntervalDays: event.target.value,
                  }))
                }
                placeholder="0 para único"
              />
            </label>
            <label>
              Repetir hasta
              <input
                type="date"
                value={reminderForm.repeatUntil}
                onChange={(event) =>
                  setReminderForm((prev) => ({
                    ...prev,
                    repeatUntil: event.target.value,
                  }))
                }
              />
            </label>
            <div className="contacts-form__actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateReminder}
                disabled={creatingReminder}
              >
                {creatingReminder ? 'Guardando…' : 'Guardar recordatorio'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="contacts-list">
        <div className="contacts-card">
          <header className="contacts-list__header">
            <div>
              <p>Directorio en tiempo real</p>
              <h2>Listado de contactos</h2>
            </div>
            <span>{filteredContacts.length} resultados</span>
          </header>
          {loading ? (
            <div className="contacts-placeholder">Cargando contactos…</div>
          ) : filteredContacts.length ? (
            <div className="contacts-table-wrapper">
              <table className="contacts-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>DNI</th>
                    <th>Área</th>
                    <th>Creado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id}>
                      <td>
                        <div className="contacts-cell">
                          <span className="contacts-name">{contact.name}</span>
                          <small>ID #{contact.id}</small>
                          {(contact.obraSocial || contact.obraSocial2) && (
                            <span className="contacts-insurance">
                              {contact.obraSocial && (
                                <em>Obra social: {contact.obraSocial}</em>
                              )}
                              {contact.obraSocial2 && (
                                <em>Complementaria: {contact.obraSocial2}</em>
                              )}
                            </span>
                          )}
                          {(contact.isVip ||
                            contact.isProblematic ||
                            contact.isChronic) && (
                            <div className="contacts-flags">
                              {contact.isVip && (
                                <span className="contacts-flag contacts-flag--vip">
                                  👑 Importante
                                </span>
                              )}
                              {contact.isProblematic && (
                                <span className="contacts-flag contacts-flag--alert">
                                  😕 Problemático
                                </span>
                              )}
                              {contact.isChronic && (
                                <span className="contacts-flag contacts-flag--loop">
                                  🔁 Crónico
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="contacts-phone">{contact.phone}</td>
                      <td>{contact.dni ?? '—'}</td>
                      <td>
                        <span className="contacts-pill">
                          {contact.area?.name ?? 'Sin asignar'}
                        </span>
                      </td>
                      <td>
                        {new Date(contact.createdAt).toLocaleString('es-AR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="contacts-row-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleEditStart(contact)}
                          title="Editar contacto"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-icon--danger"
                          onClick={() => handleDelete(contact.id)}
                          title="Eliminar contacto"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="contacts-placeholder">
              No hay contactos que coincidan con la búsqueda.
            </div>
          )}
        </div>
      </section>

      <section className="contacts-list">
        <div className="contacts-card">
          <header className="contacts-list__header">
            <div>
              <p>Planificador diario</p>
              <h2>Recordatorios para hoy</h2>
            </div>
            <button
              type="button"
              className="contacts-refresh"
              onClick={() => void fetchDailyReminders()}
            >
              Refrescar
            </button>
          </header>
          {dailyReminders.length ? (
            <div className="contacts-table-wrapper">
              <table className="contacts-table">
                <thead>
                  <tr>
                    <th>Contacto</th>
                    <th>Detalle</th>
                    <th>Horario</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {dailyReminders.map((reminder) => (
                    <tr key={reminder.id}>
                      <td>
                        <div className="contacts-cell">
                          <span className="contacts-name">
                            {reminder.contact?.name ?? 'Contacto'}
                          </span>
                          <small>{reminder.contact?.phone}</small>
                        </div>
                      </td>
                      <td>
                        <strong>{reminder.title}</strong>
                        {reminder.description && (
                          <div className="contacts-insurance">
                            <em>{reminder.description}</em>
                          </div>
                        )}
                        {reminder.repeatIntervalDays && (
                          <span className="contacts-pill">
                            Cada {reminder.repeatIntervalDays} días
                          </span>
                        )}
                        {reminder.repeatUntil && (
                          <span className="contacts-pill contacts-pill--muted">
                            Hasta{' '}
                            {new Date(reminder.repeatUntil).toLocaleDateString(
                              'es-AR'
                            )}
                          </span>
                        )}
                      </td>
                      <td>
                        {new Date(reminder.remindAt).toLocaleString('es-AR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="contacts-row-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          title="Marcar atendido"
                          onClick={() => handleTriggerReminder(reminder.id)}
                        >
                          ✅
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="contacts-placeholder">
              No hay recordatorios programados para hoy.
            </div>
          )}
        </div>
      </section>

      {editingContact && (
        <EditContactModal
          contact={editingContact}
          areas={areas}
          onClose={handleEditClose}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
