import React, { useEffect, useMemo, useState } from 'react';
import '../../styles/AddContactModal.css';

type ContactFormData = {
  name: string;
  dni: string;
  address1: string;
  address2: string;
  obraSocial: string;
  obraSocial2: string;
};

type AddContactModalProps = {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  onSubmit: (data: {
    name: string;
    dni?: string;
    address1?: string;
    address2?: string;
    obraSocial?: string;
    obraSocial2?: string;
  }) => Promise<void>;
  mode?: 'create' | 'edit';
  initialData?: {
    name?: string | null;
    dni?: string | null;
    address1?: string | null;
    address2?: string | null;
    obraSocial?: string | null;
    obraSocial2?: string | null;
  };
};

const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  phoneNumber,
  onSubmit,
  mode = 'create',
  initialData,
}) => {
  // Memoizar los valores individuales para evitar re-renders innecesarios
  const initialName = initialData?.name ?? '';
  const initialDni = initialData?.dni ?? '';
  const initialAddress1 = initialData?.address1 ?? '';
  const initialAddress2 = initialData?.address2 ?? '';
  const initialObraSocial = initialData?.obraSocial ?? '';
  const initialObraSocial2 = initialData?.obraSocial2 ?? '';

  const [formData, setFormData] = useState<ContactFormData>({
    name: initialName,
    dni: initialDni,
    address1: initialAddress1,
    address2: initialAddress2,
    obraSocial: initialObraSocial,
    obraSocial2: initialObraSocial2,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track si el modal se acaba de abrir para resetear el form
  const [wasOpen, setWasOpen] = useState(false);

  useEffect(() => {
    // Solo resetear cuando el modal se ABRE (transición de cerrado a abierto)
    if (isOpen && !wasOpen) {
      setFormData({
        name: initialName,
        dni: initialDni,
        address1: initialAddress1,
        address2: initialAddress2,
        obraSocial: initialObraSocial,
        obraSocial2: initialObraSocial2,
      });
      setError(null);
    }
    setWasOpen(isOpen);
  }, [isOpen, wasOpen, initialName, initialDni, initialAddress1, initialAddress2, initialObraSocial, initialObraSocial2]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        name: formData.name.trim(),
        dni: formData.dni.trim() || undefined,
        address1: formData.address1.trim() || undefined,
        address2: formData.address2.trim() || undefined,
        obraSocial: formData.obraSocial.trim() || undefined,
        obraSocial2: formData.obraSocial2.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al guardar el contacto'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const modalTitle =
    mode === 'edit' ? 'Editar contacto' : 'Agregar nuevo contacto';
  const submitLabel = mode === 'edit' ? 'Guardar cambios' : 'Agregar contacto';

  return (
    <>
      <div className="add-contact-modal-overlay" onClick={handleClose} />
      <div className="add-contact-modal">
        <div className="add-contact-modal-header">
          <h2>{modalTitle}</h2>
          <button
            className="add-contact-modal-close"
            onClick={handleClose}
            aria-label="Cerrar modal"
            type="button"
          >
            X
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
                placeholder="Ej: Juan Perez"
                value={formData.name}
                onChange={(event) =>
                  setFormData({ ...formData, name: event.target.value })
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
                onChange={(event) =>
                  setFormData({ ...formData, dni: event.target.value })
                }
                disabled={loading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="obraSocial">Obra Social (opcional)</label>
                <input
                  id="obraSocial"
                  type="text"
                  placeholder="Ej: IOMA, PAMI, OSDE"
                  value={formData.obraSocial}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      obraSocial: event.target.value,
                    })
                  }
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="obraSocial2">Obra Social 2 (opcional)</label>
                <input
                  id="obraSocial2"
                  type="text"
                  placeholder="Ej: Cobertura secundaria"
                  value={formData.obraSocial2}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      obraSocial2: event.target.value,
                    })
                  }
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="address1">Dirección 1 (opcional)</label>
                <input
                  id="address1"
                  type="text"
                  placeholder="Ej: Av. Siempre Viva 742"
                  value={formData.address1}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      address1: event.target.value,
                    })
                  }
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="address2">Dirección 2 (opcional)</label>
                <input
                  id="address2"
                  type="text"
                  placeholder="Piso, referencia, etc."
                  value={formData.address2}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      address2: event.target.value,
                    })
                  }
                  disabled={loading}
                />
              </div>
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
                {loading ? 'Guardando...' : submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddContactModal;
