import React, { useState, useEffect } from 'react';
import {
  quickReplyService,
  type QuickReply,
} from '../services/quickReply.service';
import './QuickReplyPanel.css';

interface QuickReplyPanelProps {
  onSelectReply: (content: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const QuickReplyPanel: React.FC<QuickReplyPanelProps> = ({
  onSelectReply,
  isOpen,
  onToggle,
}) => {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadQuickReplies();
    }
  }, [isOpen]);

  const loadQuickReplies = async () => {
    setLoading(true);
    setError(null);
    try {
      const replies = await quickReplyService.list();
      setQuickReplies(replies);
    } catch (err) {
      console.error('Error loading quick replies:', err);
      setError('Error al cargar respuestas rápidas');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReply = (reply: QuickReply) => {
    onSelectReply(reply.content);
    setSearchTerm('');
  };

  const filteredReplies = quickReplies.filter(
    (reply) =>
      reply.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reply.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reply.shortcut &&
        reply.shortcut.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getReplyTypeLabel = (reply: QuickReply): string => {
    if (reply.isGlobal) return 'Global';
    if (reply.area) return reply.area.name;
    if (reply.user) return 'Personal';
    return '';
  };

  const getReplyTypeClass = (reply: QuickReply): string => {
    if (reply.isGlobal) return 'quick-reply-type--global';
    if (reply.area) return 'quick-reply-type--area';
    if (reply.user) return 'quick-reply-type--personal';
    return '';
  };

  if (!isOpen) {
    return (
      <button
        className="quick-reply-toggle"
        onClick={onToggle}
        title="Respuestas rápidas"
      >
        ⚡ Respuestas Rápidas
      </button>
    );
  }

  return (
    <div className="quick-reply-panel">
      <div className="quick-reply-panel__header">
        <h3>⚡ Respuestas Rápidas</h3>
        <button
          className="quick-reply-panel__close"
          onClick={onToggle}
          title="Cerrar"
        >
          ✕
        </button>
      </div>

      <div className="quick-reply-panel__search">
        <input
          type="text"
          placeholder="Buscar respuesta rápida..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="quick-reply-panel__search-input"
        />
      </div>

      <div className="quick-reply-panel__content">
        {loading && (
          <div className="quick-reply-panel__loading">
            <div className="spinner"></div>
            <p>Cargando...</p>
          </div>
        )}

        {error && (
          <div className="quick-reply-panel__error">
            <p>{error}</p>
            <button onClick={loadQuickReplies}>Reintentar</button>
          </div>
        )}

        {!loading && !error && filteredReplies.length === 0 && (
          <div className="quick-reply-panel__empty">
            {searchTerm ? (
              <p>No se encontraron respuestas</p>
            ) : (
              <p>No hay respuestas rápidas disponibles</p>
            )}
          </div>
        )}

        {!loading && !error && filteredReplies.length > 0 && (
          <div className="quick-reply-list">
            {filteredReplies.map((reply) => (
              <button
                key={reply.id}
                className="quick-reply-item"
                onClick={() => handleSelectReply(reply)}
                title={reply.content}
              >
                <div className="quick-reply-item__header">
                  <span className="quick-reply-item__title">{reply.title}</span>
                  <span
                    className={`quick-reply-type ${getReplyTypeClass(reply)}`}
                  >
                    {getReplyTypeLabel(reply)}
                  </span>
                </div>
                {reply.shortcut && (
                  <div className="quick-reply-item__shortcut">
                    {reply.shortcut}
                  </div>
                )}
                <div className="quick-reply-item__preview">
                  {reply.content.length > 80
                    ? `${reply.content.substring(0, 80)}...`
                    : reply.content}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="quick-reply-panel__footer">
        <p className="quick-reply-panel__hint">
          💡 Tip: Usa atajos como <code>/saludo</code> en el chat
        </p>
      </div>
    </div>
  );
};

export default QuickReplyPanel;
