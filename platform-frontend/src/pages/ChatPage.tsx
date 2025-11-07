import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useConversations } from '../hooks/useConversations';
import { useChatSession } from '../hooks/useChatSession';
import ConversationListItem from '../components/chat/ConversationListItem';
import ChatView from '../components/chat/ChatView';
import ImageModal from '../components/ImageModal';
import {
  groupConversationsByLatest,
  searchConversations,
} from '../utils/conversationHelpers';
import './ChatPage.redesign.css';

const ChatPage = () => {
  const {
    loading: loadingConversations,
    abiertas,
    cerradas,
    unread,
    setUnread,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  } = useConversations();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageUrl] = useState('');
  const [noteMode, setNoteMode] = useState(false);

  // Memoizar conversación activa
  const activeConversation = useMemo(() => {
    const all = [...abiertas, ...cerradas];
    return all.find((c) => c.id === selectedId) ?? null;
  }, [abiertas, cerradas, selectedId]);

  const {
    history,
    loading: loadingHistory,
    closing,
    sending,
    sendMessage,
    closeConversation,
  } = useChatSession(activeConversation);

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedId) {
      if (abiertas.length > 0) {
        setSelectedId(abiertas[0].id);
      } else if (cerradas.length > 0) {
        setSelectedId(cerradas[0].id);
      }
    }
  }, [abiertas, cerradas, selectedId]);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setUnread((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setNoteMode(false);
  };

  const handleSubmitMessage = useCallback(
    async (content: string) => {
      console.log('[ChatPage] handleSubmitMessage called with:', {
        content,
        noteMode,
      });
      const isNote = noteMode; // Capturar el valor actual
      await sendMessage(content, isNote);
      if (isNote) {
        console.log('[ChatPage] Resetting noteMode');
        setNoteMode(false);
      }
    },
    [sendMessage, noteMode] // noteMode necesario para capturar cambios
  );

  // Memoizar conversaciones agrupadas y buscadas (sin duplicación)
  const abiertasGrouped = useMemo(
    () => groupConversationsByLatest(searchConversations(abiertas, searchTerm)),
    [abiertas, searchTerm]
  );

  const cerradasGrouped = useMemo(
    () => groupConversationsByLatest(searchConversations(cerradas, searchTerm)),
    [cerradas, searchTerm]
  );

  return (
    <div className="chat-page-redesign">
      <aside className="conversation-list-panel">
        <header className="conversation-list-header">
          <div className="conversation-list-search">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar o iniciar un nuevo chat"
            />
          </div>
          <div className="conversation-list-filters">
            {[
              { label: 'Todos', value: 'all' },
              { label: 'Asignados a mí', value: 'mine' },
              { label: 'No asignados', value: 'unassigned' },
              { label: 'Pendientes', value: 'pending' },
              { label: 'Activos', value: 'active' },
              { label: 'Cerrados', value: 'closed' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`conversation-filter-btn${
                  filter === option.value
                    ? ' conversation-filter-btn--active'
                    : ''
                }`}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </header>
        <div className="conversation-list-items">
          {loadingConversations ? (
            <div className="conversation-list-empty">Cargando...</div>
          ) : (
            <>
              {abiertasGrouped.length > 0 && (
                <>
                  <div className="conversation-list-separator">
                    Chats abiertos
                  </div>
                  {abiertasGrouped.map((conv) => (
                    <ConversationListItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === selectedId}
                      isUnread={unread.has(conv.id)}
                      onSelect={() => handleSelectConversation(conv.id)}
                    />
                  ))}
                </>
              )}
              {cerradasGrouped.length > 0 && (
                <>
                  <div className="conversation-list-separator">
                    Chats cerrados
                  </div>
                  {cerradasGrouped.map((conv) => (
                    <ConversationListItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === selectedId}
                      isUnread={unread.has(conv.id)}
                      onSelect={() => handleSelectConversation(conv.id)}
                    />
                  ))}
                </>
              )}
              {abiertasGrouped.length === 0 && cerradasGrouped.length === 0 && (
                <div className="conversation-list-empty">
                  No hay conversaciones.
                </div>
              )}
            </>
          )}
        </div>
      </aside>
      <ChatView
        conversation={activeConversation}
        messages={history}
        loadingMessages={loadingHistory}
        isClosing={closing}
        isNoteMode={noteMode}
        setNoteMode={setNoteMode}
        onSendMessage={handleSubmitMessage}
        onCloseConversation={closeConversation}
        isSending={sending}
      />
      <ImageModal
        imageUrl={selectedImageUrl}
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        alt="Imagen del chat"
      />
    </div>
  );
};

export default ChatPage;
