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
    let retryCount = 0;
    const maxRetries = 20; // 10 seconds max

    const interval = setInterval(() => {
      if (cancelled) return;
      retryCount++;
      const manager = getSocketManager();
      if (manager) {
        setSocketManager(manager);
        clearInterval(interval);
      } else if (retryCount >= maxRetries) {
        console.error('❌ Socket manager failed to initialize after 10 seconds');
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
        // Get current active conversation to check if this message is for it
        const currentState = useChatStore.getState();
        const messageConvId = typeof payload.conversationId === 'string'
          ? parseInt(payload.conversationId, 10)
          : payload.conversationId;
        
        // Only dispatch refresh if message is for the currently active conversation
        if (typeof window !== 'undefined') {
          // Always dispatch generic event for conversation list refresh
          window.dispatchEvent(new Event('chat:messageReceived'));
          
          // If this message is for the active conversation, dispatch specific event
          if (currentState.activeConversationId === messageConvId) {
            window.dispatchEvent(new CustomEvent('chat:activeConversationMessage', {
              detail: { conversationId: messageConvId }
            }));
          } else {
            // Mark conversation as unread (red dot indicator)
            currentState.markConversationUnread(messageConvId);
          }
        }

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

        useChatStore.getState().addMessage(normalizedMessage);
      });

      const unsubMessageUpdated = socket.on('message:updated', (payload) => {
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
          // Trigger conversation list refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('chat:conversationUpdated'));
          }

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

      const unsubConversationNew = socket.on('conversation:new', (payload) => {
        // Trigger conversation list refresh immediately
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('chat:conversationListRefresh'));
        }
      });
      const unsubConversationDeleted = socket.on(
        'conversation:deleted',
        (payload) => {
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
      const unsubFlowStarted = socket.on('flow:started', (_payload) => {
        useChatStore.setState({ error: null });
      });

      const unsubFlowEnded = socket.on('flow:ended', (_payload) => {
        // Flow ended, could update UI if needed
      });

      // Typing indicators
      const unsubTypingStarted = socket.on('typing:started', (_payload) => {
        // Could add to store if needed for "typing..." UI
      });

      const unsubTypingEnded = socket.on('typing:ended', (_payload) => {
        // Typing ended
      });

      // Cleanup on unmount
      return () => {
        unsubMessage();
        unsubMessageUpdated();
        unsubMessageDeleted();
        unsubConversationUpdated();
        unsubConversationCreated();
        unsubConversationNew();
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
