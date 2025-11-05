import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../services/api';
import '../../styles/EditContactModal.css';

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
  areaId: number | null | undefined;
};

interface EditContactModalProps {
  contact: ContactItem;
  areas: AreaItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export function EditContactModal({
  contact,
  areas,
  onClose,
  onSuccess,
}: EditContactModalProps) {
  const [formState, setFormState] = useState({
    name: contact.name,
    phone: contact.phone,
    dni: contact.dni || '',
    areaId: contact.areaId?.toString() || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.patch(`/contacts/${contact.id}`, {
        name: formState.name,
        phone: formState.phone,
        dni: formState.dni || null,
        areaId: formState.areaId ? Number(formState.areaId) : null,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('[EditContactModal] Failed to update contact', err);
      setError('No fue posible actualizar el contacto. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Contacto</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <label className="form__label">
            Nombre
            <input
              type="text"
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
              type="text"
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
              type="text"
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
              disabled={loading}
            >
              {loading ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              className="chat-button chat-button--secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
