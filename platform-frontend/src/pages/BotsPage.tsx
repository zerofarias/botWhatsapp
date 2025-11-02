import React, { useEffect, useState, FormEvent } from 'react';
import { api } from '../services/api';
import '../styles/modal.css'; // Assuming a simple modal style is available
import FlowBuilder from '../views/FlowBuilder/FlowBuilder';

/**
 * Tipo de bot para gestión en BotsPage
 */
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

/**
 * Página de gestión de bots y acceso a Flow Builder
 */
export default function BotsPage() {
  const [bots, setBots] = useState<BotType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBotData, setNewBotData] = useState(initialNewBotData);
  const [selectedBot, setSelectedBot] = useState<BotType | null>(null);

  const fetchBots = async () => {
    try {
      setLoading(true);
      const response = await api.get<BotType[]>('/bots');
      setBots(response.data);
    } catch (err) {
      setError('Failed to fetch bots. Make sure the API is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const handleOpenModal = () => {
    setNewBotData(initialNewBotData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setNewBotData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreateBot = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/bots', newBotData);
      handleCloseModal();
      fetchBots(); // Refresh the list
    } catch (err) {
      alert('Failed to create bot.');
      console.error(err);
    }
  };

  if (loading) {
    return <div>Loading bots...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>{error}</div>;
  }

  // Si hay un bot seleccionado, mostrar el Flow Builder para ese bot
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
    <div className="page-container">
      <h1>Bot Management</h1>
      <p>Create, edit, and manage your conversational bots.</p>

      <div style={{ marginTop: '2rem' }}>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Is Default?</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bots.length > 0 ? (
              bots.map((bot) => (
                <tr key={bot.id}>
                  <td>{bot.id}</td>
                  <td>{bot.name}</td>
                  <td>{bot.description}</td>
                  <td>{bot.isDefault ? 'Yes' : 'No'}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setSelectedBot(bot)}
                    >
                      Flow Builder
                    </button>
                    <button className="btn btn-sm btn-danger ms-2">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center">
                  No bots found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <button className="btn btn-success mt-3" onClick={handleOpenModal}>
          Create New Bot
        </button>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Create New Bot</h2>
            <form onSubmit={handleCreateBot}>
              <div className="mb-3">
                <label htmlFor="name" className="form-label">
                  Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="name"
                  name="name"
                  value={newBotData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <textarea
                  className="form-control"
                  id="description"
                  name="description"
                  rows={3}
                  value={newBotData.description}
                  onChange={handleInputChange}
                ></textarea>
              </div>
              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="isDefault"
                  name="isDefault"
                  checked={newBotData.isDefault}
                  onChange={handleInputChange}
                />
                <label className="form-check-label" htmlFor="isDefault">
                  Set as default bot
                </label>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
