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

  return (
    <form className="chat-composer-container" onSubmit={handleSubmit}>
      <textarea
        className={`chat-composer-textarea${isNoteMode ? ' note-mode' : ''}`}
        placeholder={
          isNoteMode ? 'Escribe una nota interna...' : 'Escribe un mensaje...'
        }
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={disabled}
        rows={2}
      />
      <div className="chat-composer-actions">
        <button type="submit" disabled={disabled || !inputValue.trim()}>
          Enviar
        </button>
      </div>
    </form>
  );
};

export default ChatComposer;
