/**
 * useSocketListeners v2 - Register socket event handlers
 * Replaces socket listener logic from old useChatSession
 */

import { useEffect, useState } from 'react';
import { getSocketManager } from '../../services/socket/SocketManager';
import { useChatStore } from '../../store/chatStore';
import { normalizeSender } from '../../services/socket/socketSchemas';

export function useSocketListeners() {
  const [socketManager, setSocketManager] = useState(() => getSocketManager());

  useEffect(() => {
    if (socketManager) {
      return;
    }

    let cancelled = false;
    console.warn('⚠️ Socket manager not available yet, retrying…');

    const interval = setInterval(() => {
      if (cancelled) return;
      const manager = getSocketManager();
      if (manager) {
        setSocketManager(manager);
        clearInterval(interval);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [socketManager]);

  useEffect(() => {
    if (!socketManager) {
      return;
    }

    try {
      const socket = socketManager;

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
        const resolvedSenderName =
          payload.senderName ??
          payload.sender?.name ??
          (payload.senderType === 'BOT' ? 'Bot' : null);
        const resolvedSenderUsername =
          payload.senderUsername ?? payload.sender?.username ?? null;
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
          sender: normalizeSender(
            payload.senderType ?? payload.sender ?? 'contact'
          ),
          senderId: parsedSenderId,
          senderName: resolvedSenderName,
          senderUsername: resolvedSenderUsername,
          timestamp:
            typeof payload.timestamp === 'string'
              ? new Date(payload.timestamp).getTime()
              : payload.timestamp || new Date(payload.createdAt).getTime(),
          status: 'sent' as const,
          mediaUrl:
            payload.mediaUrl ??
            payload.metadata?.mediaUrl ??
            (payload as any)?.media?.url ??
            undefined,
          mediaType:
            payload.mediaType ??
            payload.metadata?.mediaType ??
            (payload as any)?.media?.mediaType ??
            undefined,
          metadata: {
            senderType: payload.senderType,
            senderId: parsedSenderId,
            senderName: resolvedSenderName,
            senderUsername: resolvedSenderUsername,
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
        const updateSenderName =
          payload.senderName ??
          payload.sender?.name ??
          (payload.senderType === 'BOT' ? 'Bot' : null);
        const updateSenderUsername =
          payload.senderUsername ?? payload.sender?.username ?? null;
        const normalizedUpdate = {
          id: messageId,
          conversationId:
            typeof payload.conversationId === 'string'
              ? parseInt(payload.conversationId, 10)
              : payload.conversationId,
          content: payload.content,
          sender: normalizeSender(
            payload.senderType ?? payload.sender ?? 'contact'
          ),
          senderId: updateSenderId,
          senderName: updateSenderName,
          senderUsername: updateSenderUsername,
          timestamp:
            typeof payload.timestamp === 'string'
              ? new Date(payload.timestamp).getTime()
              : payload.timestamp || new Date(payload.createdAt).getTime(),
          status: payload.status || ('delivered' as const),
          mediaUrl:
            payload.mediaUrl ??
            payload.metadata?.mediaUrl ??
            (payload as any)?.media?.url ??
            undefined,
          mediaType:
            payload.mediaType ??
            payload.metadata?.mediaType ??
            (payload as any)?.media?.mediaType ??
            undefined,
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
  }, [socketManager]);

  return null;
}
