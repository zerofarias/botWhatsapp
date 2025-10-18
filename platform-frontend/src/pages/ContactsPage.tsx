import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

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
  area: AreaItem | null;
  createdAt: string;
};

type ContactFormState = {
  name: string;
  phone: string;
  dni: string;
  areaId: string;
};

const INITIAL_FORM: ContactFormState = {
  name: '',
  phone: '',
  dni: '',
  areaId: '',
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

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [contactResponse, areaResponse] = await Promise.all([
        api.get<ContactItem[]>('/contacts'),
        api.get<AreaItem[]>('/areas', { params: { active: true } }),
      ]);
      setContacts(contactResponse.data);
      setAreas(areaResponse.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
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
        areaName.toLowerCase().includes(term)
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
      setError('Agrega datos para importar contactos.');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      await api.post('/contacts/import', {
        type: importFormat,
        payload: importPayload,
      });
      setImportPayload('');
      await fetchAll();
    } catch (err) {
      console.error('[Contacts] Failed to import contacts', err);
      setError('No fue posible importar los contactos. Revisa el formato.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="panel">
      <header className="panel__header">
        <div>
          <h2>Contactos</h2>
          <p className="panel__description">
            Administra el padrón de clientes con nombre, DNI y área asignada.
          </p>
        </div>
        <div>
          <input
            type="search"
            placeholder="Buscar por nombre, teléfono o DNI"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="panel__search"
          />
        </div>
      </header>

      <section className="panel__content">
        <div className="panel__grid">
          <div className="panel__card">
            <h3>Nuevo contacto</h3>
            <form className="form" onSubmit={handleCreate}>
              <label className="form__label">
                Nombre
                <input
                  required
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="form__label">
                Teléfono
                <input
                  required
                  value={formState.phone}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="form__label">
                DNI
                <input
                  placeholder="Opcional"
                  value={formState.dni}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      dni: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="form__label">
                Área
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
              {error && <p className="form__error">{error}</p>}
              <div className="form__actions">
                <button
                  type="submit"
                  className="chat-button chat-button--primary"
                  disabled={submitting}
                >
                  {submitting ? 'Guardando…' : 'Guardar contacto'}
                </button>
                <button
                  type="button"
                  className="chat-button chat-button--secondary"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Limpiar
                </button>
              </div>
            </form>
          </div>

          <div className="panel__card">
            <h3>Importar contactos</h3>
            <div className="form">
              <label className="form__label">
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
              <label className="form__label">
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
              {error && <p className="form__error">{error}</p>}
              <div className="form__actions">
                <button
                  type="button"
                  className="chat-button chat-button--primary"
                  onClick={handleImport}
                  disabled={importing}
                >
                  {importing ? 'Importando…' : 'Importar contactos'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="panel__card">
          <h3>Listado de contactos</h3>
          {loading ? (
            <div className="panel__placeholder">Cargando contactos…</div>
          ) : filteredContacts.length ? (
            <div className="table-wrapper">
              <table className="data-table">
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
                      <td>{contact.name}</td>
                      <td>{contact.phone}</td>
                      <td>{contact.dni ?? '—'}</td>
                      <td>{contact.area?.name ?? 'Sin asignar'}</td>
                      <td>
                        {new Date(contact.createdAt).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="link-button link-button--danger"
                          onClick={() => handleDelete(contact.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="panel__placeholder">
              No hay contactos que coincidan con la búsqueda.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
