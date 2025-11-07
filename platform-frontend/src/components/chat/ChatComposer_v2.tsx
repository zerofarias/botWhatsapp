/**
 * ChatComposer v2 - Send messages with clean state management
 * Uses Zustand store and hooks directly, no props
 */

import React, { useState, useCallback } from 'react';
import {
  useChatStore,
  selectActiveConversation,
  selectSending,
} from '../../store/chatStore';
import { useMessageSender } from '../../hooks/v2/useMessageSender';

const ChatComposer_v2: React.FC = () => {
  const [content, setContent] = useState('');
  const activeConversation = useChatStore(selectActiveConversation);
  const sending = useChatStore(selectSending);
  const { sendMessage } = useMessageSender();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!content.trim() || !activeConversation) {
        return;
      }

      const trimmedContent = content.trim();
      setContent('');

      // Send message
      await sendMessage(
        activeConversation.id,
        trimmedContent,
        activeConversation.botId
      );
    },
    [content, activeConversation, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Send on Ctrl+Enter or Cmd+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(e as any);
      }
    },
    [handleSubmit]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-gray-300 bg-white p-4 space-y-2"
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message... (Ctrl+Enter to send)"
        disabled={sending || !activeConversation}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        rows={3}
      />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setContent('')}
          disabled={!content || sending}
          className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear
        </button>
        <button
          type="submit"
          disabled={!content.trim() || sending || !activeConversation}
          className="px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>

      {sending && (
        <div className="text-sm text-blue-600">⏳ Message is being sent...</div>
      )}
    </form>
  );
};

export default ChatComposer_v2;
