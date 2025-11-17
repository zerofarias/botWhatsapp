import React from 'react';
import type { AreaMembership } from '../../context/AuthContext';
import './UserCard.css';

type Role = 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' | 'SUPPORT' | 'SALES';

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

const ROLE_COLORS: Record<Role, { bg: string; text: string; badge: string }> = {
  ADMIN: { bg: '#fef2f2', text: '#991b1b', badge: '#ef4444' },
  SUPERVISOR: { bg: '#fff7ed', text: '#92400e', badge: '#f97316' },
  OPERATOR: { bg: '#eff6ff', text: '#0c4a6e', badge: '#3b82f6' },
  SUPPORT: { bg: '#faf5ff', text: '#5b21b6', badge: '#8b5cf6' },
  SALES: { bg: '#f0fdf4', text: '#166534', badge: '#10b981' },
};

interface UserCardProps {
  user: UserListItem;
  onEdit: (user: UserListItem) => void;
  onToggleActive: (user: UserListItem) => void;
  loading?: boolean;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  onEdit,
  onToggleActive,
  loading = false,
}) => {
  const roleColor = ROLE_COLORS[user.role];
  const firstLetter = user.name.charAt(0).toUpperCase();

  return (
    <div className="user-card" data-active={user.isActive}>
      <div className="user-card__header">
        <div className="user-card__photo-section">
          {user.photoUrl ? (
            <img
              src={user.photoUrl}
              alt={user.name}
              className="user-card__photo"
            />
          ) : (
            <div
              className="user-card__photo-placeholder"
              style={{ backgroundColor: roleColor.badge }}
            >
              {firstLetter}
            </div>
          )}
          <div className="user-card__status" data-active={user.isActive} />
        </div>

        <div className="user-card__info">
          <h3 className="user-card__name">{user.name}</h3>
          <p className="user-card__username">@{user.username}</p>
          {user.email && <p className="user-card__email">{user.email}</p>}
        </div>

        <div className="user-card__role">
          <span
            className="user-card__role-badge"
            style={{
              backgroundColor: roleColor.bg,
              color: roleColor.text,
              borderColor: roleColor.badge,
            }}
          >
            {user.role}
          </span>
        </div>
      </div>

      <div className="user-card__body">
        {user.areas.length > 0 && (
          <div className="user-card__areas">
            <label className="user-card__label">Áreas asignadas</label>
            <div className="user-card__areas-list">
              {user.areas.map((area) => (
                <span key={area.id} className="user-card__area-tag">
                  {area.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {user.defaultAreaId && (
          <div className="user-card__default-area">
            <label className="user-card__label">Área principal</label>
            <span className="user-card__area-main">
              {user.areas.find((a) => a.id === user.defaultAreaId)?.name ||
                `Área ${user.defaultAreaId}`}
            </span>
          </div>
        )}

        <div className="user-card__status-badge">
          <span className="user-card__status-dot" data-active={user.isActive} />
          {user.isActive ? 'Activo' : 'Inactivo'}
        </div>
      </div>

      <div className="user-card__footer">
        <button
          className="user-card__btn user-card__btn--primary"
          onClick={() => onEdit(user)}
          disabled={loading}
          type="button"
        >
          ✏️ Editar
        </button>
        <button
          className="user-card__btn user-card__btn--secondary"
          onClick={() => onToggleActive(user)}
          disabled={loading}
          type="button"
        >
          {user.isActive ? '🚫 Desactivar' : '✅ Activar'}
        </button>
      </div>
    </div>
  );
};
