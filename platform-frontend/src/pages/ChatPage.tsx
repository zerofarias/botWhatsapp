import React, { useState, useMemo, useEffect } from 'react';
import { useConversations } from '../hooks/useConversations';
import { useChatSession } from '../hooks/useChatSession';
import ConversationListItem from '../components/chat/ConversationListItem';
import ChatView from '../components/chat/ChatView';
import ImageModal from '../components/ImageModal';
import './ChatPage.redesign.css';

const TEST_PHONE = '5493533473732'; // Puedes cambiar este número por el que desees consultar

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

  const activeConversation = useMemo(() => {
    const all = [...abiertas, ...cerradas];
    return all.find((c) => c.id === selectedId) ?? null;
  }, [abiertas, cerradas, selectedId]);

  const {
    history,
    loading: loadingHistory,
    closing,
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

  const handleSubmitMessage = (content: string) => {
    sendMessage(content, noteMode).then(() => {
      if (noteMode) setNoteMode(false);
    });
  };

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
              {abiertas.length > 0 && (
                <>
                  <div className="conversation-list-separator">
                    Chats abiertos
                  </div>
                  {Object.values(
                    abiertas.reduce((acc, conv) => {
                      const key =
                        conv.contact?.name?.trim() ||
                        conv.contactName?.trim() ||
                        conv.userPhone;
                      if (
                        !acc[key] ||
                        new Date(conv.lastActivity) >
                          new Date(acc[key].lastActivity)
                      ) {
                        acc[key] = conv;
                      }
                      return acc;
                    }, {} as Record<string, (typeof abiertas)[0]>)
                  ).map((conv) => (
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
              {cerradas.length > 0 && (
                <>
                  <div className="conversation-list-separator">
                    Chats cerrados
                  </div>
                  {Object.values(
                    cerradas.reduce((acc, conv) => {
                      const key =
                        conv.contact?.name?.trim() ||
                        conv.contactName?.trim() ||
                        conv.userPhone;
                      if (
                        !acc[key] ||
                        new Date(conv.lastActivity) >
                          new Date(acc[key].lastActivity)
                      ) {
                        acc[key] = conv;
                      }
                      return acc;
                    }, {} as Record<string, (typeof cerradas)[0]>)
                  ).map((conv) => (
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
              {abiertas.length === 0 && cerradas.length === 0 && (
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
