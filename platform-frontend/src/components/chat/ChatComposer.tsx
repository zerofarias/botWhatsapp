import React, { useState } from 'react';

import '../../styles/chat-composer-note.css';

type ChatComposerProps = {
  disabled: boolean;
  isNoteMode: boolean;
  onSubmit: (content: string) => void;
};

const ChatComposer: React.FC<ChatComposerProps> = ({
  disabled,
  isNoteMode,
  onSubmit,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed) {
        onSubmit(trimmed);
        setInputValue('');
      }
    }
  };

  return (
    <form
      className="chat-composer-container chat-composer-row"
      onSubmit={handleSubmit}
    >
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
