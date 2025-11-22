import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import './EditContactModal.css';

export interface EditingContactItem {
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

export const EditContactModal: React.FC<EditContactModalProps> = ({
  contact,
  areas,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState(contact?.name ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [dni, setDni] = useState(contact?.dni ?? '');
  const [areaId, setAreaId] = useState<number | ''>(contact?.areaId ?? '');
  const [obraSocial, setObraSocial] = useState(contact?.obraSocial ?? '');
  const [obraSocial2, setObraSocial2] = useState(contact?.obraSocial2 ?? '');
  const [isVip, setIsVip] = useState(Boolean(contact?.isVip));
  const [isProblematic, setIsProblematic] = useState(
    Boolean(contact?.isProblematic)
  );
  const [isChronic, setIsChronic] = useState(Boolean(contact?.isChronic));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setPhone(contact.phone);
      setDni(contact.dni ?? '');
      setAreaId(contact.areaId ?? '');
      setObraSocial(contact.obraSocial ?? '');
      setObraSocial2(contact.obraSocial2 ?? '');
      setIsVip(Boolean(contact.isVip));
      setIsProblematic(Boolean(contact.isProblematic));
      setIsChronic(Boolean(contact.isChronic));
      setError(null);
    }
  }, [contact]);

  const handleSave = useCallback(async () => {
    if (!contact) return;
    if (!name.trim() || !phone.trim()) {
      setError('Nombre y teléfono son obligatorios');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/contacts/${contact.id}`, {
        name,
        phone,
        dni,
        areaId: areaId === '' ? null : areaId,
        obraSocial,
        obraSocial2,
        isVip,
        isProblematic,
        isChronic,
      });
      await onSuccess();
      onClose();
    } catch (err) {
      console.error('[EditContactModal] Failed to save contact', err);
      setError('No se pudo guardar el contacto. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  }, [
    contact,
    name,
    phone,
    dni,
    areaId,
    obraSocial,
    obraSocial2,
    isVip,
    isProblematic,
    isChronic,
    onClose,
    onSuccess,
  ]);

  if (!contact) return null;

  return (
    <div className="edit-contact-modal__overlay" onClick={onClose}>
      <div
        className="edit-contact-modal__content"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="edit-contact-modal__header">
          <div>
            <p>Contacto #{contact.id}</p>
            <h2>Editar información</h2>
          </div>
          <button
            type="button"
            className="edit-contact-modal__close"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </header>

        <div className="edit-contact-modal__form">
          <label>
            Nombre
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre del contacto"
            />
          </label>
          <label>
            Teléfono
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Número de teléfono"
            />
          </label>
          <label>
            DNI
            <input
              type="text"
              value={dni}
              onChange={(event) => setDni(event.target.value)}
              placeholder="Documento de identidad (opcional)"
            />
          </label>
          <label>
            Área asignada
            <select
              value={areaId}
              onChange={(event) =>
                setAreaId(event.target.value ? Number(event.target.value) : '')
              }
            >
              <option value="">Seleccionar área</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Obra social
            <input
              type="text"
              value={obraSocial}
              onChange={(event) => setObraSocial(event.target.value)}
              placeholder="Swiss Medical, OSDE..."
            />
          </label>
          <label>
            Obra social 2
            <input
              type="text"
              value={obraSocial2}
              onChange={(event) => setObraSocial2(event.target.value)}
              placeholder="Cobertura adicional"
            />
          </label>
          <div className="edit-contact-modal__toggles">
            <label className="contacts-switch">
              <input
                type="checkbox"
                checked={isVip}
                onChange={(event) => setIsVip(event.target.checked)}
              />
              <span>
                <strong>Cliente importante 👑</strong>
                <small>Priorizar su atención</small>
              </span>
            </label>
            <label className="contacts-switch">
              <input
                type="checkbox"
                checked={isProblematic}
                onChange={(event) => setIsProblematic(event.target.checked)}
              />
              <span>
                <strong>Cliente problemático 😕</strong>
                <small>Registrar incidentes o reclamos</small>
              </span>
            </label>
            <label className="contacts-switch">
              <input
                type="checkbox"
                checked={isChronic}
                onChange={(event) => setIsChronic(event.target.checked)}
              />
              <span>
                <strong>Cliente crónico 🔁</strong>
                <small>Seguimiento periódico</small>
              </span>
            </label>
          </div>
          {error && <p className="edit-contact-modal__error">{error}</p>}
        </div>

        <footer className="edit-contact-modal__actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default EditContactModal;
