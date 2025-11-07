/**
 * ChatView v2 - Display messages with virtual scrolling
 * Completely rewritten without prop drilling
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  useChatStore,
  selectMessages,
  type ChatStoreState,
} from '../../store/chatStore';

interface ChatViewProps {
  conversationId: number;
}

const ChatView_v2: React.FC<ChatViewProps> = ({ conversationId }) => {
  const messages = useChatStore(selectMessages);
  const loading = useChatStore((state: ChatStoreState) => state.loading);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLoadMoreMessages = useCallback(() => {
    console.log('Load more messages for conversation:', conversationId);
    // Implement pagination logic
  }, [conversationId]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-white p-4 space-y-4"
    >
      {/* Load more button at top */}
      {false && (
        <button
          onClick={handleLoadMoreMessages}
          disabled={loading}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load Earlier Messages'}
        </button>
      )}

      {/* Messages */}
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">No messages yet</div>
        </div>
      ) : (
        messages.map((message: any) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              <p className="break-words">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
              {message.status && (
                <p className="text-xs mt-1 opacity-70">
                  {message.status === 'sent' && '✓'}
                  {message.status === 'delivered' && '✓✓'}
                  {message.status === 'read' && '✓✓'}
                  {message.status === 'error' && '✗'}
                </p>
              )}
            </div>
          </div>
        ))
      )}

      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatView_v2;
