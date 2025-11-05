import React, { useState } from 'react';
import '../../styles/AddContactModal.css';

type AddContactModalProps = {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  onSubmit: (name: string, dni: string) => Promise<void>;
};

const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  phoneNumber,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({ name: '', dni: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData.name.trim(), formData.dni.trim());
      setFormData({ name: '', dni: '' });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al agregar contacto'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', dni: '' });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="add-contact-modal-overlay" onClick={handleClose} />
      <div className="add-contact-modal">
        <div className="add-contact-modal-header">
          <h2>Agregar nuevo contacto</h2>
          <button
            className="add-contact-modal-close"
            onClick={handleClose}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        <div className="add-contact-modal-body">
          <p className="add-contact-modal-description">
            Número: <strong>{phoneNumber}</strong>
          </p>

          <form onSubmit={handleSubmit} className="add-contact-form">
            <div className="form-group">
              <label htmlFor="name">Nombre *</label>
              <input
                id="name"
                type="text"
                placeholder="Ej: Juan Pérez"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dni">DNI (opcional)</label>
              <input
                id="dni"
                type="text"
                placeholder="Ej: 12345678"
                value={formData.dni}
                onChange={(e) =>
                  setFormData({ ...formData, dni: e.target.value })
                }
                disabled={loading}
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="add-contact-modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Agregando...' : 'Agregar contacto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddContactModal;
