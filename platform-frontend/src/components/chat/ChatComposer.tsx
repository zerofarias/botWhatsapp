import React, { useState } from 'react';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSubmit(inputValue);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && inputValue.trim()) {
        onSubmit(inputValue);
        setInputValue('');
      }
    }
  };

  return (
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
      <textarea
        className={`chat-composer-textarea${isNoteMode ? ' note-mode' : ''}`}
        placeholder={
          isNoteMode ? 'Escribe una nota interna...' : 'Escribe un mensaje...'
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
  );
};

export default ChatComposer;
