import React, { useState, useMemo, useRef, useEffect } from 'react';
import QuickReplyPanel from '../QuickReplyPanel';
import {
  quickReplyService,
  type QuickReply,
} from '../../services/quickReply.service';
import '../../styles/chat-composer-note.css';

/**
 * Props para ChatComposer
 * @param disabled Si el input está bloqueado
 * @param isNoteMode Si está en modo nota
 * @param setNoteMode Cambia el modo nota
 * @param onSubmit Envía el mensaje
 */
type ChatComposerProps = {
  disabled: boolean;
  isNoteMode: boolean;
  setNoteMode: (value: boolean) => void;
  onSubmit: (content: string) => void;
};

const ChatComposer: React.FC<ChatComposerProps> = ({
  disabled,
  isNoteMode,
  setNoteMode,
  onSubmit,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [allQuickReplies, setAllQuickReplies] = useState<QuickReply[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  // Cargar quick replies al montar
  useEffect(() => {
    const loadReplies = async () => {
      try {
        const replies = await quickReplyService.list();
        setAllQuickReplies(replies);
      } catch (err) {
        console.error('Error loading quick replies:', err);
      }
    };
    loadReplies();
  }, []);

  // Obtener sugerencias basadas en el input
  const suggestions = useMemo(() => {
    // Si el input no contiene "/" no mostrar sugerencias
    if (!inputValue.includes('/')) {
      return [];
    }

    // Buscar el último "/" y el texto después
    const lastSlashIndex = inputValue.lastIndexOf('/');
    const textAfterSlash = inputValue.substring(lastSlashIndex + 1);

    // Si hay espacio después del "/", no mostrar sugerencias
    if (textAfterSlash.includes(' ')) {
      return [];
    }

    // Filtrar replies que coincidan (case-insensitive)
    return allQuickReplies.filter(
      (reply) =>
        reply.shortcut &&
        reply.shortcut
          .toLowerCase()
          .includes(`/${textAfterSlash.toLowerCase()}`)
    );
  }, [inputValue, allQuickReplies]);

  useEffect(() => {
    setShowSuggestions(suggestions.length > 0);
    setSelectedSuggestionIndex(0);
  }, [suggestions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSubmit(inputValue);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Si hay sugerencias visibles, manejar navegación
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = suggestions[selectedSuggestionIndex];
        if (selected) {
          handleSelectSuggestion(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    // Manejar Enter para enviar mensaje
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && inputValue.trim()) {
        onSubmit(inputValue);
        setInputValue('');
      }
    }
  };

  const handleSelectSuggestion = (reply: QuickReply) => {
    // Reemplazar el "/atajo" con el contenido completo
    const lastSlashIndex = inputValue.lastIndexOf('/');
    const beforeSlash = inputValue.substring(0, lastSlashIndex);
    const newValue = beforeSlash + reply.content;
    setInputValue(newValue);
    setShowSuggestions(false);
  };

  return (
    <>
      <form
        className="chat-composer-container chat-composer-row"
        onSubmit={handleSubmit}
        style={{
          position: 'relative',
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
        }}
      >
        {disabled && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(128, 128, 128, 0.3)',
              borderRadius: '8px',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            Esperando que alguien tome el chat...
          </div>
        )}
        <button
          type="button"
          className="chat-composer-note-btn"
          onClick={() => setNoteMode(true)}
          style={{
            marginRight: '8px',
            alignSelf: 'flex-end',
            height: '40px',
            background: isNoteMode ? '#ffd700' : '#eee',
            border: 'none',
            borderRadius: '6px',
            cursor: isNoteMode ? 'not-allowed' : 'pointer',
            color: '#333',
            fontWeight: '500',
            opacity: disabled ? 0.6 : 1,
          }}
          disabled={isNoteMode || disabled}
        >
          📝 Nota
        </button>
        <div style={{ position: 'relative', flex: 1 }}>
          <textarea
            className={`chat-composer-textarea${
              isNoteMode ? ' note-mode' : ''
            }`}
            placeholder={
              isNoteMode
                ? 'Escribe una nota interna...'
                : 'Escribe un mensaje o / para atajos...'
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={2}
            style={{
              background: disabled ? '#f0f0f0' : '#fff',
              color: disabled ? '#999' : '#000',
            }}
          />
          {/* Mostrar sugerencias de quick replies */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: '6px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 100,
                boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
                marginBottom: '4px',
              }}
            >
              {suggestions.map((reply, idx) => (
                <div
                  key={`${reply.id}-${idx}`}
                  onClick={() => handleSelectSuggestion(reply)}
                  style={{
                    padding: '8px 12px',
                    borderBottom:
                      idx < suggestions.length - 1
                        ? '1px solid #f0f0f0'
                        : 'none',
                    background:
                      selectedSuggestionIndex === idx ? '#e8f4f8' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', fontSize: '13px' }}>
                      {reply.shortcut}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#666',
                        maxWidth: '300px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {reply.title}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#999',
                      marginLeft: '8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {reply.isGlobal
                      ? 'Global'
                      : reply.area
                      ? reply.area.name
                      : 'Personal'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="chat-composer-send-btn"
          disabled={disabled || !inputValue.trim()}
          style={{
            marginLeft: '8px',
            alignSelf: 'flex-end',
            height: '40px',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          Enviar
        </button>
      </form>
    </>
  );
};

export default ChatComposer;
