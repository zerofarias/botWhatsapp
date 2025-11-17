/**
 * ChatComposer v2 - Send messages with clean state management
 * Uses Zustand store and hooks directly, no props
 * WhatsApp Web style composer
 * Includes note mode and quick replies functionality
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  useChatStore,
  selectActiveConversation,
  selectSending,
} from '../../store/chatStore';
import { useMessageSender } from '../../hooks/v2/useMessageSender';
import { createConversationNote } from '../../services/api';
import {
  quickReplyService,
  type QuickReply,
} from '../../services/quickReply.service';
import QuickReplyEditor from '../QuickReplyEditor';
import {
  FiFilePlus,
  FiXCircle,
  FiZap,
  FiSend,
  FiSave,
  FiLoader,
} from 'react-icons/fi';
import './ChatComposer_v2.css';

const ChatComposer_v2: React.FC = () => {
  const [content, setContent] = useState('');
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [allQuickReplies, setAllQuickReplies] = useState<QuickReply[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [showQuickReplyEditor, setShowQuickReplyEditor] = useState(false);

  const activeConversation = useChatStore(selectActiveConversation);
  const sending = useChatStore(selectSending);
  const addConversationNote = useChatStore(
    (state) => state.addConversationNote
  );
  const { sendMessage } = useMessageSender();
  const isConversationClosed = activeConversation?.status === 'CLOSED';
  const composerDisabled = !activeConversation || isConversationClosed;
  const disabledPlaceholder = composerDisabled
    ? !activeConversation
      ? 'Selecciona una conversacion para escribir.'
      : 'La conversacion esta cerrada. Reactivala para escribir.'
    : null;
  const showLockedBanner = Boolean(activeConversation && isConversationClosed);

  // Load quick replies on component mount
  useEffect(() => {
    const loadQuickReplies = async () => {
      try {
        const replies = await quickReplyService.list();
        setAllQuickReplies(replies);
      } catch (error) {
        console.error('Error loading quick replies:', error);
      }
    };
    loadQuickReplies();
  }, []);

  // Get suggestions based on input
  const suggestions = useMemo(() => {
    if (!content.includes('/')) {
      return [];
    }

    const lastSlashIndex = content.lastIndexOf('/');
    const searchTerm = content.substring(lastSlashIndex + 1).toLowerCase();

    if (searchTerm === '') {
      return allQuickReplies.slice(0, 5);
    }

    return allQuickReplies
      .filter(
        (reply) =>
          reply.title.toLowerCase().includes(searchTerm) ||
          (reply.shortcut &&
            reply.shortcut.toLowerCase().includes(searchTerm)) ||
          reply.content.toLowerCase().includes(searchTerm)
      )
      .slice(0, 5);
  }, [content, allQuickReplies]);

  // Show suggestions when typing /
  useEffect(() => {
    setShowSuggestions(suggestions.length > 0 && content.includes('/'));
    setSelectedSuggestionIndex(0);
  }, [suggestions.length, content]);

  const sendNoteInternally = useCallback(
    async (noteContent: string) => {
      if (!activeConversation) return;

      try {
        const result = await createConversationNote(
          activeConversation.id,
          noteContent
        );
        addConversationNote(activeConversation.id, {
          id: result.id,
          conversationId: activeConversation.id,
          content: result.content,
          createdAt: new Date(result.createdAt).getTime(),
          createdById: result.createdById,
          createdByName: result.createdByName ?? 'Tú',
        });
        console.debug('[ChatComposer_v2] Internal note created successfully');
      } catch (error) {
        console.error('[ChatComposer_v2] Error creating internal note:', error);
        useChatStore.setState({
          error: 'Error al crear la nota interna',
        });
      }
    },
    [activeConversation, addConversationNote]
  );

  const handleSelectSuggestion = useCallback(
    (reply: QuickReply) => {
      const lastSlashIndex = content.lastIndexOf('/');
      const beforeSlash = content.substring(0, lastSlashIndex);
      const newValue = beforeSlash + reply.content;
      setContent(newValue);
      setShowSuggestions(false);
    },
    [content]
  );

  const handleQuickReplySaved = useCallback(async (reply: QuickReply) => {
    try {
      const replies = await quickReplyService.list();
      setAllQuickReplies(replies);
    } catch (error) {
      console.error('Error reloading quick replies:', error);
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!content.trim() || !activeConversation || composerDisabled) {
        console.warn(
          '[ChatComposer_v2] Missing content or activeConversation',
          {
            content: content.trim(),
            activeConversation,
          }
        );
        return;
      }

      const trimmedContent = content.trim();
      console.debug('[ChatComposer_v2] Submitting message:', {
        conversationId: activeConversation.id,
        contentLength: trimmedContent.length,
        botId: activeConversation.botId,
        isNoteMode,
      });

      setContent('');

      if (isNoteMode) {
        // Send internal note
        await sendNoteInternally(trimmedContent);
        setIsNoteMode(false);
      } else {
        // Send regular message
        await sendMessage(
          activeConversation.id,
          trimmedContent,
          activeConversation.botId
        );
      }
    },
    [
      content,
      activeConversation,
      sendMessage,
      sendNoteInternally,
      isNoteMode,
      composerDisabled,
    ]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Handle suggestions navigation
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

      // Send on Enter (Shift+Enter keeps newline)
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleSubmit(e as any);
        return;
      }

      // Fallback shortcut: Ctrl/Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(e as any);
      }
    },
    [
      handleSubmit,
      showSuggestions,
      suggestions,
      selectedSuggestionIndex,
      handleSelectSuggestion,
    ]
  );

  return (
    <>
      <form onSubmit={handleSubmit} className="chat-composer-v2">
        <div className="chat-composer-v2-footer">
          {/* Note Mode Button */}
          {!isNoteMode && (
            <button
              type="button"
              className="chat-composer-v2-btn-icon"
              onClick={() => setIsNoteMode(true)}
              disabled={sending || composerDisabled}
              title="Agregar nota interna"
            >
              <FiFilePlus />
            </button>
          )}

          {/* Remove Note Mode Button */}
          {isNoteMode && (
            <button
              type="button"
              className="chat-composer-v2-btn-icon chat-composer-v2-btn-remove-note"
              onClick={() => {
                setIsNoteMode(false);
                setContent('');
              }}
              title="Quitar nota"
            >
              <FiXCircle />
            </button>
          )}

          {/* Quick Reply Creator Button */}
          <button
            type="button"
            className="chat-composer-v2-btn-icon"
            onClick={() => setShowQuickReplyEditor(true)}
            disabled={sending || composerDisabled}
            title="Crear nuevo atajo rápido"
          >
            <FiZap />
          </button>

          <div className="chat-composer-v2-input-wrapper">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                disabledPlaceholder ??
                (isNoteMode
                  ? 'Escribe una nota interna...'
                  : 'Escribe un mensaje o / para atajos...')
              }
              disabled={sending || composerDisabled}
              className={`chat-composer-v2-textarea ${
                isNoteMode ? 'note-mode' : ''
              }`}
              rows={1}
            />

            {/* Quick Reply Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="chat-composer-v2-suggestions">
                {suggestions.map((reply, index) => (
                  <div
                    key={reply.id}
                    className={`chat-composer-v2-suggestion ${
                      index === selectedSuggestionIndex ? 'selected' : ''
                    }`}
                    onClick={() => handleSelectSuggestion(reply)}
                  >
                    <div className="suggestion-title">{reply.title}</div>
                    <div className="suggestion-content">
                      {reply.content.substring(0, 50)}...
                    </div>
                    {reply.shortcut && (
                      <div className="suggestion-shortcut">
                        /{reply.shortcut}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!content.trim() || sending || composerDisabled}
            className="chat-composer-v2-btn-send"
            title={isNoteMode ? 'Guardar nota (Enter)' : 'Enviar (Enter)'}
          >
            {sending ? (
              <span className="chat-composer-v2-icon-spin">
                <FiLoader />
              </span>
            ) : isNoteMode ? (
              <FiSave />
            ) : (
              <FiSend />
            )}
          </button>
        </div>
      </form>

      {showLockedBanner && (
        <div className="chat-composer-v2-locked-banner">
          La conversacion esta cerrada. Reactivala para enviar mensajes.
        </div>
      )}

      {/* Quick Reply Editor Modal */}
      <QuickReplyEditor
        isOpen={showQuickReplyEditor}
        onClose={() => setShowQuickReplyEditor(false)}
        onSave={handleQuickReplySaved}
      />
    </>
  );
};

export default ChatComposer_v2;
