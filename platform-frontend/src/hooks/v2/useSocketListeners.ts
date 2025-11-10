/**
 * useSocketListeners v2 - Register socket event handlers
 * Replaces socket listener logic from old useChatSession
 */

import { useEffect } from 'react';
import { getSocketManager } from '../../services/socket/SocketManager';
import { useChatStore } from '../../store/chatStore';

export function useSocketListeners() {
  useEffect(() => {
    try {
      const socket = getSocketManager();

      // Only register listeners if socket exists and is connected
      if (!socket) {
        console.warn('ÔÜá´©Å Socket manager not available yet');
        return;
      }

      // Get the store state once, without reactive subscription
      const store = useChatStore.getState();

      // Message listeners
      const unsubMessage = socket.on('message:new', (payload) => {
        console.log('­ƒô¿ New message received:', payload);

        // Normalize message to v2 format
        const parsedSenderId =
          typeof payload.senderId === 'string'
            ? parseInt(payload.senderId, 10)
            : payload.senderId ?? null;
        const normalizedMessage = {
          id:
            typeof payload.id === 'string'
              ? parseInt(payload.id, 10)
              : payload.id,
          conversationId:
            typeof payload.conversationId === 'string'
              ? parseInt(payload.conversationId, 10)
              : payload.conversationId,
          content: payload.content,
          sender: (payload.sender ||
            payload.senderType?.toLowerCase() ||
            'contact') as 'user' | 'bot' | 'contact',
          senderId: parsedSenderId,
          senderName: payload.senderName ?? null,
          senderUsername: payload.senderUsername ?? null,
          timestamp:
            typeof payload.timestamp === 'string'
              ? new Date(payload.timestamp).getTime()
              : payload.timestamp || new Date(payload.createdAt).getTime(),
          status: 'sent' as const,
          mediaUrl: payload.mediaUrl || undefined,
          metadata: {
            senderType: payload.senderType,
            senderId: parsedSenderId,
            senderName: payload.senderName ?? null,
            senderUsername: payload.senderUsername ?? null,
            ...(payload.metadata || {}),
          },
        };

        console.log('Ô£à Normalized message:', normalizedMessage);
        useChatStore.getState().addMessage(normalizedMessage);
      });

      const unsubMessageUpdated = socket.on('message:updated', (payload) => {
        console.log('Ô£Å´©Å Message updated:', payload);

        const messageId =
          typeof payload.id === 'string'
            ? parseInt(payload.id, 10)
            : payload.id;
        const updateSenderId =
          typeof payload.senderId === 'string'
            ? parseInt(payload.senderId, 10)
            : payload.senderId ?? null;
        const normalizedUpdate = {
          id: messageId,
          conversationId:
            typeof payload.conversationId === 'string'
              ? parseInt(payload.conversationId, 10)
              : payload.conversationId,
          content: payload.content,
          sender: (payload.sender ||
            payload.senderType?.toLowerCase() ||
            'contact') as 'user' | 'bot' | 'contact',
          senderId: updateSenderId,
          senderName: payload.senderName ?? null,
          senderUsername: payload.senderUsername ?? null,
          timestamp:
            typeof payload.timestamp === 'string'
              ? new Date(payload.timestamp).getTime()
              : payload.timestamp || new Date(payload.createdAt).getTime(),
          status: payload.status || ('delivered' as const),
        };

        useChatStore.getState().updateMessage(messageId, normalizedUpdate);
      });

      const unsubMessageDeleted = socket.on('message:deleted', (payload) => {
        console.log('­ƒùæ´©Å Message deleted:', payload.messageId);

        const messageId =
          typeof payload.messageId === 'string'
            ? parseInt(payload.messageId, 10)
            : payload.messageId;
        useChatStore.getState().deleteMessage(messageId);
      });

      // Conversation listeners
      const unsubConversationUpdated = socket.on(
        'conversation:updated',
        (payload) => {
          console.log('­ƒôØ Conversation updated:', payload.id);

          const normalizedConversation = {
            ...payload,
            id:
              typeof payload.id === 'string'
                ? parseInt(payload.id, 10)
                : payload.id,
            botId:
              typeof payload.botId === 'string'
                ? parseInt(payload.botId, 10)
                : payload.botId,
            contactId:
              typeof payload.contactId === 'string'
                ? parseInt(payload.contactId, 10)
                : payload.contactId,
            progressStatus:
              typeof payload.progressStatus === 'string'
                ? payload.progressStatus.toUpperCase()
                : payload.progressStatus,
          };

          useChatStore
            .getState()
            .updateConversation(
              normalizedConversation.id,
              normalizedConversation
            );
        }
      );

      const unsubConversationCreated = socket.on(
        'conversation:created',
        (payload) => {
          console.log('Ô£¿ Conversation created:', payload.id);

          const normalizedConversation = {
            ...payload,
            id:
              typeof payload.id === 'string'
                ? parseInt(payload.id, 10)
                : payload.id,
            botId:
              typeof payload.botId === 'string'
                ? parseInt(payload.botId, 10)
                : payload.botId,
            contactId:
              typeof payload.contactId === 'string'
                ? parseInt(payload.contactId, 10)
                : payload.contactId,
            progressStatus:
              typeof payload.progressStatus === 'string'
                ? payload.progressStatus.toUpperCase()
                : payload.progressStatus,
          };

          useChatStore.getState().addConversation(normalizedConversation);
        }
      );

      const unsubConversationDeleted = socket.on(
        'conversation:deleted',
        (payload) => {
          console.log('ÔØî Conversation deleted:', payload.conversationId);

          const conversationId =
            typeof payload.conversationId === 'string'
              ? parseInt(payload.conversationId, 10)
              : payload.conversationId;

          // Optionally remove from store or mark as deleted
          useChatStore.setState((state) => ({
            conversations: state.conversations.filter(
              (c) => c.id !== conversationId
            ),
            activeConversationId:
              state.activeConversationId === conversationId
                ? null
                : state.activeConversationId,
          }));
        }
      );

      // Flow listeners
      const unsubFlowStarted = socket.on('flow:started', (payload) => {
        console.log('­ƒÜÇ Flow started:', payload.flowId);
        useChatStore.setState({ error: null });
      });

      const unsubFlowEnded = socket.on('flow:ended', (payload) => {
        console.log('­ƒøæ Flow ended:', payload.flowId);
      });

      // Typing indicators
      const unsubTypingStarted = socket.on('typing:started', (payload) => {
        // Could add to store if needed for "typing..." UI
        console.log('Ôî¿´©Å Typing started:', payload.sender);
      });

      const unsubTypingEnded = socket.on('typing:ended', (payload) => {
        console.log('Ôî¿´©Å Typing ended:', payload.sender);
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
  }, []);

  return null;
}
