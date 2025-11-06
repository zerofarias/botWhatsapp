import React from 'react';

export interface EditingContactItem {
  id: number;
  name: string;
  phone: string;
  dni: string | null;
  areaId: number | null;
}

export interface AreaItem {
  id: number;
  name: string;
}

export interface EditContactModalProps {
  contact: EditingContactItem | null;
  areas: AreaItem[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

/**
 * Modal para editar información de un contacto
 */
export const EditContactModal: React.FC<EditContactModalProps> = ({
  contact,
  areas,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = React.useState(contact?.name ?? '');
  const [phone, setPhone] = React.useState(contact?.phone ?? '');
  const [dni, setDni] = React.useState(contact?.dni ?? '');
  const [areaId, setAreaId] = React.useState(contact?.areaId ?? '');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (contact) {
      setName(contact.name);
      setPhone(contact.phone);
      setDni(contact.dni ?? '');
      setAreaId(contact.areaId ?? '');
    }
  }, [contact]);

  const handleSave = async () => {
    if (!contact) return;
    setSaving(true);
    try {
      await onSuccess();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!contact) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Editar Contacto</h2>
        <div className="form-group">
          <label>Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del contacto"
          />
        </div>
        <div className="form-group">
          <label>Teléfono</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Número de teléfono"
          />
        </div>
        <div className="form-group">
          <label>DNI</label>
          <input
            type="text"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="Documento de identidad (opcional)"
          />
        </div>
        <div className="form-group">
          <label>Área</label>
          <select
            value={areaId}
            onChange={(e) =>
              setAreaId(e.target.value ? Number(e.target.value) : '')
            }
          >
            <option value="">Seleccionar área</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditContactModal;
