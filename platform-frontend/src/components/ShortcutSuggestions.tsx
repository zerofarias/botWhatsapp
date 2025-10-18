import React from 'react';
import { QuickReply } from '../services/quickReply.service';
import './ShortcutSuggestions.css';

interface ShortcutSuggestionsProps {
  suggestions: QuickReply[];
  onSelect: (reply: QuickReply) => void;
  selectedIndex: number;
}

const ShortcutSuggestions: React.FC<ShortcutSuggestionsProps> = ({
  suggestions,
  onSelect,
  selectedIndex,
}) => {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="shortcut-suggestions">
      <div className="shortcut-suggestions__header">
        <span className="shortcut-suggestions__title">
          ⚡ Respuestas rápidas
        </span>
        <span className="shortcut-suggestions__hint">
          ↑↓ para navegar • Enter para seleccionar • Esc para cancelar
        </span>
      </div>
      <div className="shortcut-suggestions__list">
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.id}
            className={`shortcut-suggestion ${
              index === selectedIndex ? 'shortcut-suggestion--selected' : ''
            }`}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => {
              // Opcional: actualizar el índice seleccionado al hover
            }}
          >
            <div className="shortcut-suggestion__header">
              <span className="shortcut-suggestion__shortcut">
                {suggestion.shortcut}
              </span>
              <span className="shortcut-suggestion__title">
                {suggestion.title}
              </span>
            </div>
            <div className="shortcut-suggestion__preview">
              {suggestion.content.length > 100
                ? `${suggestion.content.substring(0, 100)}...`
                : suggestion.content}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ShortcutSuggestions;
