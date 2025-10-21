import React, { useState } from 'react';

import '../../styles/chat-composer-note.css';

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
    >
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
        }}
        disabled={isNoteMode}
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
      />
      <button
        type="submit"
        className="chat-composer-send-btn"
        disabled={disabled || !inputValue.trim()}
        style={{ marginLeft: '8px', alignSelf: 'flex-end', height: '40px' }}
      >
        Enviar
      </button>
    </form>
  );
};

export default ChatComposer;
