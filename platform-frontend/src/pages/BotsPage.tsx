import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import FlowBuilder from '../views/FlowBuilder/FlowBuilder';
import './BotsPage.css';

type BotType = {
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  initialFlowId: number | null;
};

const initialNewBotData = {
  name: '',
  description: '',
  isDefault: false,
  initialFlowId: null,
};

export default function BotsPage() {
  const [bots, setBots] = useState<BotType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBotData, setNewBotData] = useState(initialNewBotData);
  const [selectedBot, setSelectedBot] = useState<BotType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBots = async () => {
    try {
      setLoading(true);
      const response = await api.get<BotType[]>('/bots');
      setBots(response.data);
    } catch (err) {
      setError('No se pudieron cargar los bots. ¿API activa?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBots();
  }, []);

  const handleOpenModal = () => {
    setNewBotData(initialNewBotData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = event.target;
    const checked = (event.target as HTMLInputElement).checked;
    setNewBotData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreateBot = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.post('/bots', newBotData);
      handleCloseModal();
      fetchBots();
    } catch (err) {
      console.error(err);
      alert('No se pudo crear el bot.');
    }
  };

  const filteredBots = useMemo(() => {
    if (!searchQuery.trim()) return bots;
    const query = searchQuery.toLowerCase();
    return bots.filter(
      (bot) =>
        bot.name.toLowerCase().includes(query) ||
        bot.description?.toLowerCase().includes(query) ||
        bot.id.toString().includes(query)
    );
  }, [bots, searchQuery]);

  const defaultCount = useMemo(
    () => bots.filter((bot) => bot.isDefault).length,
    [bots]
  );
  const withInitialFlow = useMemo(
    () => bots.filter((bot) => Boolean(bot.initialFlowId)).length,
    [bots]
  );

  if (selectedBot) {
    return (
      <FlowBuilder
        botId={selectedBot.id}
        botName={selectedBot.name}
        onBack={() => setSelectedBot(null)}
      />
    );
  }

  return (
    <div className="bots-page">
      <header className="bots-page__header">
        <div>
          <p className="bots-page__subtitle">Gestión de bots</p>
          <h1 className="bots-page__title">Bots & Flujos</h1>
          <p className="bots-page__description">
            Administra tus asistentes automáticos y accede al Flow Builder.
          </p>
        </div>
        <div className="bots-page__stats">
          <div className="bots-page__stat">
            <span className="bots-page__stat-label">Bots totales</span>
            <span className="bots-page__stat-value">{bots.length}</span>
          </div>
          <div className="bots-page__stat">
            <span className="bots-page__stat-label">Bots por defecto</span>
            <span className="bots-page__stat-value">{defaultCount}</span>
          </div>
          <div className="bots-page__stat">
            <span className="bots-page__stat-label">Con flujo inicial</span>
            <span className="bots-page__stat-value">{withInitialFlow}</span>
          </div>
        </div>
      </header>

      {error && <div className="bots-page__error">❌ {error}</div>}

      <div className="bots-page__controls">
        <div className="bots-page__search">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por nombre, descripción o ID…"
            className="bots-page__search-input"
          />
          <span className="bots-page__search-icon">🔍</span>
        </div>
        <button
          className="bots-page__btn-add"
          type="button"
          onClick={handleOpenModal}
        >
          Crear nuevo bot
        </button>
      </div>

      {loading ? (
        <div className="bots-page__loading">Cargando bots...</div>
      ) : filteredBots.length ? (
        <div className="bots-page__grid">
          {filteredBots.map((bot) => (
            <article
              key={bot.id}
              className={`bot-card ${bot.isDefault ? 'bot-card--default' : ''}`}
            >
              <header className="bot-card__header">
                <div>
                  <h3 className="bot-card__title">{bot.name}</h3>
                  <p className="bot-card__subtitle">ID #{bot.id}</p>
                </div>
                {bot.isDefault && (
                  <span className="bot-card__badge">Bot principal</span>
                )}
              </header>
              <p className="bot-card__description">
                {bot.description || 'Sin descripción'}
              </p>
              <div className="bot-card__meta">
                <span>
                  Flujo inicial:{' '}
                  {bot.initialFlowId ? `#${bot.initialFlowId}` : 'No asignado'}
                </span>
                <span>
                  Estado: {bot.isDefault ? 'Prioritario' : 'Secundario'}
                </span>
              </div>
              <div className="bot-card__actions">
                <button
                  className="bot-card__btn bot-card__btn--primary"
                  type="button"
                  onClick={() => setSelectedBot(bot)}
                >
                  Abrir Flow Builder
                </button>
                <button
                  className="bot-card__btn bot-card__btn--ghost"
                  type="button"
                  disabled
                  title="Próximamente"
                >
                  Configuración
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="bots-page__empty">
          <p>No encontramos bots con ese criterio.</p>
          <button
            type="button"
            className="bots-page__btn-add bots-page__btn-add--ghost"
            onClick={handleOpenModal}
          >
            Crear bot
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="bots-modal">
          <div
            className="bots-modal__backdrop"
            onClick={handleCloseModal}
          ></div>
          <div className="bots-modal__content">
            <header className="bots-modal__header">
              <div>
                <p className="bots-modal__subtitle">Nuevo bot</p>
                <h2 className="bots-modal__title">
                  Diseña un asistente desde cero
                </h2>
              </div>
              <button
                type="button"
                className="bots-modal__close"
                onClick={handleCloseModal}
              >
                ✕
              </button>
            </header>

            <form className="bots-modal__form" onSubmit={handleCreateBot}>
              <div className="bots-modal__form-grid">
                <label className="bots-modal__field">
                  <span>Nombre del bot</span>
                  <input
                    type="text"
                    name="name"
                    value={newBotData.name}
                    onChange={handleInputChange}
                    placeholder="Ej: Asistente Principal"
                    required
                  />
                </label>
                <label className="bots-modal__field">
                  <span>Descripción</span>
                  <textarea
                    name="description"
                    value={newBotData.description}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Describe el propósito del bot"
                  />
                </label>
                <label className="bots-modal__checkbox">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={newBotData.isDefault}
                    onChange={handleInputChange}
                  />
                  <span>Usar como bot principal del sistema</span>
                </label>
              </div>

              <div className="bots-modal__actions">
                <button
                  type="button"
                  className="bots-modal__btn bots-modal__btn--ghost"
                  onClick={handleCloseModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bots-modal__btn bots-modal__btn--primary"
                >
                  Crear bot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
