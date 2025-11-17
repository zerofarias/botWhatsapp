import React, { useEffect, useState } from 'react';
import type { AreaMembership } from '../../context/AuthContext';
import './EditUserModal.css';

type Role = 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' | 'SUPPORT' | 'SALES';

type AreaItem = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
};

type UserListItem = {
  id: number;
  name: string;
  username: string;
  email: string | null;
  role: Role;
  defaultAreaId: number | null;
  areas: AreaMembership[];
  isActive: boolean;
  photoUrl?: string;
};

type UpdateUserPayload = Partial<{
  name: string;
  email: string | null;
  password: string;
  role: Role;
  defaultAreaId: number | null;
  areaIds: number[];
  isActive: boolean;
  photoUrl?: string;
}>;

const ROLE_OPTIONS: { value: Role; label: string; color: string }[] = [
  { value: 'ADMIN', label: 'Administrador', color: '#ef4444' },
  { value: 'SUPERVISOR', label: 'Supervisor', color: '#f97316' },
  { value: 'OPERATOR', label: 'Operador', color: '#3b82f6' },
  { value: 'SUPPORT', label: 'Soporte', color: '#8b5cf6' },
  { value: 'SALES', label: 'Ventas', color: '#10b981' },
];

interface EditUserModalProps {
  user: UserListItem;
  areas: AreaItem[];
  onClose: () => void;
  onSave: (payload: UpdateUserPayload) => Promise<void>;
  loading?: boolean;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  areas,
  onClose,
  onSave,
  loading = false,
}) => {
  const [editState, setEditState] = useState<UpdateUserPayload>({});
  const [submitting, setSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(user.photoUrl || '');

  const activeAreas = areas.filter((area) => area.isActive);
  const roleColor =
    ROLE_OPTIONS.find((r) => r.value === (editState.role ?? user.role))
      ?.color || '#475569';

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setPhotoPreview(result);
        setEditState((prev) => ({
          ...prev,
          photoUrl: result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave(editState);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="edit-user-modal__overlay" onClick={onClose}>
      <div
        className="edit-user-modal__content"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="edit-user-modal__header">
          <div className="edit-user-modal__title-section">
            <div className="edit-user-modal__photo-container">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt={user.name}
                  className="edit-user-modal__photo"
                />
              ) : (
                <div className="edit-user-modal__photo-placeholder">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <label className="edit-user-modal__photo-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="edit-user-modal__file-input"
                />
                📷
              </label>
            </div>
            <div>
              <h2 className="edit-user-modal__title">Editar usuario</h2>
              <p className="edit-user-modal__subtitle">
                {user.name} · @{user.username}
              </p>
              <div
                className="edit-user-modal__role-badge"
                style={{ borderColor: roleColor }}
              >
                <span
                  className="edit-user-modal__role-dot"
                  style={{ backgroundColor: roleColor }}
                />
                {ROLE_OPTIONS.find(
                  (r) => r.value === (editState.role ?? user.role)
                )?.label || user.role}
              </div>
            </div>
          </div>
          <button
            className="edit-user-modal__close"
            onClick={onClose}
            type="button"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="edit-user-modal__form">
          <div className="edit-user-modal__fields">
            <div className="edit-user-modal__field">
              <label htmlFor="name">Nombre completo</label>
              <input
                id="name"
                type="text"
                value={editState.name ?? user.name}
                onChange={(e) =>
                  setEditState((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Nombre completo"
              />
            </div>

            <div className="edit-user-modal__field">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                value={editState.email ?? user.email ?? ''}
                onChange={(e) =>
                  setEditState((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="edit-user-modal__field">
              <label htmlFor="password">Nueva contraseña</label>
              <input
                id="password"
                type="password"
                value={editState.password ?? ''}
                onChange={(e) =>
                  setEditState((prev) => ({
                    ...prev,
                    password: e.target.value || undefined,
                  }))
                }
                placeholder="Dejar vacío para no cambiar"
              />
            </div>

            <div className="edit-user-modal__field">
              <label htmlFor="role">Rol</label>
              <select
                id="role"
                value={editState.role ?? user.role}
                onChange={(e) =>
                  setEditState((prev) => ({
                    ...prev,
                    role: e.target.value as Role,
                  }))
                }
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="edit-user-modal__field">
              <label htmlFor="defaultArea">Área principal</label>
              <select
                id="defaultArea"
                value={editState.defaultAreaId ?? user.defaultAreaId ?? ''}
                onChange={(e) =>
                  setEditState((prev) => ({
                    ...prev,
                    defaultAreaId: e.target.value
                      ? Number(e.target.value)
                      : null,
                  }))
                }
              >
                <option value="">Sin asignar</option>
                {activeAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="edit-user-modal__field-full">
              <fieldset className="edit-user-modal__areas-fieldset">
                <legend>Áreas asignadas</legend>
                <div className="edit-user-modal__areas-grid">
                  {activeAreas.length === 0 ? (
                    <p className="edit-user-modal__empty">
                      No hay áreas disponibles
                    </p>
                  ) : (
                    activeAreas.map((area) => {
                      const isChecked =
                        editState.areaIds?.includes(area.id) ||
                        user.areas.some((ua) => ua.id === area.id);
                      return (
                        <label
                          key={area.id}
                          className="edit-user-modal__checkbox"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const newAreaIds = new Set(
                                editState.areaIds ||
                                  (user.areas
                                    .map((a) => a.id)
                                    .filter((id) => id !== null) as number[])
                              );
                              if (e.target.checked) {
                                newAreaIds.add(area.id);
                              } else {
                                newAreaIds.delete(area.id);
                              }
                              setEditState((prev) => ({
                                ...prev,
                                areaIds: Array.from(newAreaIds),
                              }));
                            }}
                          />
                          <span>{area.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </fieldset>
            </div>
          </div>

          <footer className="edit-user-modal__footer">
            <button
              type="button"
              className="edit-user-modal__btn edit-user-modal__btn--secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="edit-user-modal__btn edit-user-modal__btn--primary"
              disabled={submitting}
            >
              {submitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
