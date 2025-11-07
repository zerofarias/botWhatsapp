/**
 * useSocketListeners v2 - Register socket event handlers
 * Replaces socket listener logic from old useChatSession
 */

import { useEffect } from 'react';
import { getSocketManager } from '../../services/socket/SocketManager';
import { useChatStore } from '../../store/chatStore';

export function useSocketListeners() {
  const store = useChatStore();

  useEffect(() => {
    try {
      const socket = getSocketManager();

      // Only register listeners if socket exists and is connected
      if (!socket) {
        console.warn('⚠️ Socket manager not available yet');
        return;
      }

      // Message listeners
      const unsubMessage = socket.on('message:new', (message) => {
        console.log('📨 New message received:', message.id);
        store.addMessage(message);
      });

      const unsubMessageUpdated = socket.on('message:updated', (message) => {
        console.log('✏️ Message updated:', message.id);
        store.updateMessage(message.id, message);
      });

      const unsubMessageDeleted = socket.on('message:deleted', (payload) => {
        console.log('🗑️ Message deleted:', payload.messageId);
        store.deleteMessage(payload.messageId);
      });

      // Conversation listeners
      const unsubConversationUpdated = socket.on(
        'conversation:updated',
        (conversation) => {
          console.log('📝 Conversation updated:', conversation.id);
          store.updateConversation(conversation.id, conversation);
        }
      );

      const unsubConversationCreated = socket.on(
        'conversation:created',
        (conversation) => {
          console.log('✨ Conversation created:', conversation.id);
          store.addConversation(conversation);
        }
      );

      const unsubConversationDeleted = socket.on(
        'conversation:deleted',
        (payload) => {
          console.log('❌ Conversation deleted:', payload.conversationId);
          // Optionally remove from store
        }
      );

      // Flow listeners
      const unsubFlowStarted = socket.on('flow:started', (payload) => {
        console.log('🚀 Flow started:', payload.flowId);
        store.setError(null);
      });

      const unsubFlowEnded = socket.on('flow:ended', (payload) => {
        console.log('🛑 Flow ended:', payload.flowId);
      });

      // Typing indicators
      const unsubTypingStarted = socket.on('typing:started', (payload) => {
        // Could add to store if needed for "typing..." UI
        console.log('⌨️ Typing started:', payload.sender);
      });

      const unsubTypingEnded = socket.on('typing:ended', (payload) => {
        console.log('⌨️ Typing ended:', payload.sender);
      });

      // Cleanup on unmount
      return () => {
        unsubMessage();
        unsubMessageUpdated();
        unsubMessageDeleted();
        unsubConversationUpdated();
        unsubConversationCreated();
        unsubConversationDeleted();
        unsubFlowStarted();
        unsubFlowEnded();
        unsubTypingStarted();
        unsubTypingEnded();
      };
    } catch (error) {
      console.error('Error registering socket listeners:', error);
      return;
    }
  }, [store]);

  return null;
}
