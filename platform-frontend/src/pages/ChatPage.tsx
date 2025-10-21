import React, { useState, useMemo, useEffect } from 'react';
import { useConversations } from '../hooks/useConversations';
import { useChatSession } from '../hooks/useChatSession';
import ConversationList from '../components/chat/ConversationList';
import ChatView from '../components/chat/ChatView';
import ImageModal from '../components/ImageModal';
import './ChatPage.redesign.css';

const TEST_PHONE = '5493533473732'; // Puedes cambiar este número por el que desees consultar

const ChatPage = () => {
  const {
    loading: loadingConversations,
    conversations,
    unread,
    setUnread,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
  } = useConversations(TEST_PHONE);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [noteMode, setNoteMode] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const {
    history,
    loading: loadingHistory,
    sending,
    closing,
    sendMessage,
    closeConversation,
  } = useChatSession(activeConversation);

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

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
      <ConversationList
        loading={loadingConversations}
        conversations={conversations}
        selectedId={selectedId}
        unreadConversations={unread}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        filter={filter}
        onFilterChange={setFilter}
        onConversationSelect={handleSelectConversation}
      />
      <ChatView
        conversation={activeConversation}
        messages={history}
        loadingMessages={loadingHistory}
        isClosing={closing}
        isNoteMode={noteMode}
        onSendMessage={handleSubmitMessage}
        onCloseConversation={closeConversation}
        onToggleNoteMode={() => setNoteMode((prev) => !prev)}
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
