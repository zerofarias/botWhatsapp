import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import './AreasPage_v2.css';

type AreaItem = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  activeOperators: number;
  createdAt: string;
  updatedAt: string;
};

type CreateAreaPayload = {
  name: string;
  description: string;
  isActive: boolean;
};

const initialCreateState: CreateAreaPayload = {
  name: '',
  description: '',
  isActive: true,
};

export default function AreasPage_v2() {
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [createState, setCreateState] =
    useState<CreateAreaPayload>(initialCreateState);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<AreaItem> | null>(null);

  const filteredAreas = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return areas.filter(
      (area) =>
        area.name.toLowerCase().includes(query) ||
        area.description?.toLowerCase().includes(query)
    );
  }, [areas, searchQuery]);

  const fetchAreas = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<AreaItem[]>('/areas');
      setAreas(data);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las áreas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAreas();
  }, []);

  const handleCreateArea = async (event: FormEvent) => {
    event.preventDefault();
    if (!createState.name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/areas', {
        name: createState.name.trim(),
        description: createState.description.trim() || null,
        isActive: createState.isActive,
      });
      setCreateState(initialCreateState);
      setShowCreateForm(false);
      void fetchAreas();
    } catch (err) {
      console.error(err);
      setError('No se pudo crear el área.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (area: AreaItem) => {
    setUpdating(area.id);
    try {
      await api.put(`/areas/${area.id}`, { isActive: !area.isActive });
      void fetchAreas();
    } catch (err) {
      console.error(err);
      setError('No se pudo actualizar el área.');
    } finally {
      setUpdating(null);
    }
  };

  const handleStartEdit = (area: AreaItem) => {
    setEditingId(area.id);
    setEditData({
      name: area.name,
      description: area.description,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editData || !editData.name?.trim()) return;
    setUpdating(editingId);
    try {
      await api.put(`/areas/${editingId}`, {
        name: editData.name.trim(),
        description: editData.description?.trim() || null,
      });
      void fetchAreas();
      setEditingId(null);
      setEditData(null);
    } catch (err) {
      console.error(err);
      setError('No se pudo actualizar el área.');
    } finally {
      setUpdating(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  return (
    <div className="areas-page">
      {/* Header */}
      <div className="areas-page__header">
        <div>
          <h1 className="areas-page__title">Áreas de atención</h1>
          <p className="areas-page__subtitle">
            Organiza tus flujos por equipos (Soporte, Ventas,
            Administración...).
          </p>
        </div>
        <button
          className="areas-page__add-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          ➕ Agregar área
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="areas-page__create-form">
          <h2 className="areas-page__form-title">Crear nueva área</h2>
          <form onSubmit={handleCreateArea} className="areas-page__form">
            <div className="areas-page__form-group">
              <label className="areas-page__label">
                <span className="areas-page__label-text">Nombre del área</span>
                <input
                  className="areas-page__input"
                  type="text"
                  value={createState.name}
                  onChange={(e) =>
                    setCreateState((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Ej: Soporte Técnico"
                  required
                />
              </label>
            </div>

            <div className="areas-page__form-group">
              <label className="areas-page__label">
                <span className="areas-page__label-text">
                  Descripción (opcional)
                </span>
                <input
                  className="areas-page__input"
                  type="text"
                  value={createState.description}
                  onChange={(e) =>
                    setCreateState((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Descripción del área..."
                />
              </label>
            </div>

            <div className="areas-page__form-group">
              <label className="areas-page__checkbox">
                <input
                  type="checkbox"
                  checked={createState.isActive}
                  onChange={(e) =>
                    setCreateState((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                />
                <span>Área activa</span>
              </label>
            </div>

            <div className="areas-page__form-actions">
              <button
                type="submit"
                disabled={submitting}
                className="areas-page__btn areas-page__btn--primary"
              >
                {submitting ? 'Creando...' : 'Crear área'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="areas-page__btn areas-page__btn--secondary"
              >
                Cancelar
              </button>
              {error && <span className="areas-page__error">{error}</span>}
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="areas-page__search">
        <input
          type="text"
          className="areas-page__search-input"
          placeholder="🔍 Buscar áreas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Areas Grid */}
      <div className="areas-page__grid">
        {loading ? (
          <p className="areas-page__loading">Cargando áreas...</p>
        ) : filteredAreas.length === 0 ? (
          <p className="areas-page__empty">
            {searchQuery
              ? 'No se encontraron áreas que coincidan.'
              : 'No hay áreas configuradas aún.'}
          </p>
        ) : (
          filteredAreas.map((area) => (
            <div key={area.id} className="area-card">
              {editingId === area.id ? (
                // Edit Mode
                <div className="area-card__edit">
                  <input
                    type="text"
                    className="areas-page__input"
                    value={editData?.name || ''}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Nombre del área"
                  />
                  <input
                    type="text"
                    className="areas-page__input"
                    value={editData?.description || ''}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Descripción (opcional)"
                  />
                  <div className="area-card__edit-actions">
                    <button
                      onClick={handleSaveEdit}
                      disabled={updating === area.id}
                      className="areas-page__btn areas-page__btn--primary"
                    >
                      {updating === area.id ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="areas-page__btn areas-page__btn--secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // Display Mode
                <>
                  <div className="area-card__header">
                    <div className="area-card__title">
                      <h3 className="area-card__name">🏢 {area.name}</h3>
                      <span
                        className={`area-card__status ${
                          area.isActive
                            ? 'area-card__status--active'
                            : 'area-card__status--inactive'
                        }`}
                      >
                        {area.isActive ? '✓ Activa' : '✗ Inactiva'}
                      </span>
                    </div>
                  </div>

                  {area.description && (
                    <p className="area-card__description">{area.description}</p>
                  )}

                  <div className="area-card__stats">
                    <div className="area-card__stat">
                      <span className="area-card__stat-label">
                        Operadores activos
                      </span>
                      <span className="area-card__stat-value">
                        👥 {area.activeOperators}
                      </span>
                    </div>
                    <div className="area-card__stat">
                      <span className="area-card__stat-label">
                        Última actualización
                      </span>
                      <span className="area-card__stat-value">
                        {new Date(area.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="area-card__actions">
                    <button
                      onClick={() => handleStartEdit(area)}
                      disabled={updating === area.id}
                      className="area-card__action-btn area-card__action-btn--edit"
                    >
                      ✎ Editar
                    </button>
                    <button
                      onClick={() => handleToggleActive(area)}
                      disabled={updating === area.id}
                      className={`area-card__action-btn ${
                        area.isActive
                          ? 'area-card__action-btn--deactivate'
                          : 'area-card__action-btn--activate'
                      }`}
                    >
                      {area.isActive ? '⊘ Desactivar' : '✓ Activar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
