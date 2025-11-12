/**
 * Socket Manager - Centralized Socket.IO connection handler
 * Single responsibility: Manage WebSocket connection lifecycle and event routing
 */

import { io, Socket } from 'socket.io-client';
import { validateSocketPayload } from './socketSchemas';
import { useChatStore } from '../../store/chatStore';

export type SocketEventHandler<T = any> = (payload: T) => void | Promise<void>;

export class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private eventHandlers: Map<string, Set<SocketEventHandler>> = new Map();
  private isConnecting = false;

  constructor(private url: string, private options?: Record<string, any>) {}

  /**
   * Initialize socket connection
   */
  connect(): Promise<void> {
    if (this.isConnecting || this.socket?.connected) {
      return Promise.resolve();
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.url, {
          reconnection: true,
          reconnectionDelay: this.reconnectDelay,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: this.maxReconnectAttempts,
          ...this.options,
        });

        this.socket.on('connect', () => {
          console.log('🔌 Socket connected:', this.socket?.id);
          this.reconnectAttempts = 0;
          useChatStore.setState({ socketConnected: true });
          this.isConnecting = false;
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.warn('🔌 Socket disconnected:', reason);
          useChatStore.setState({ socketConnected: false });
        });

        this.socket.on('connect_error', (error) => {
          console.error('🔌 Socket connection error:', error);
          this.reconnectAttempts++;
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.isConnecting = false;
            reject(error);
          }
        });

        // Register internal handlers
        this.registerInternalHandlers();
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.eventHandlers.clear();
    }
  }

  /**
   * Register event handler
   */
  on<T = any>(event: string, handler: SocketEventHandler<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());

      // Register the socket listener only once per event
      this.socket?.on(event, (payload) => {
        // Validate payload if schema exists
        const validationResult = validateSocketPayload(event as any, payload);
        if (!validationResult.valid) {
          console.warn(
            `Invalid payload for event ${event}:`,
            validationResult.error
          );
          return;
        }

        // Call all registered handlers for this event
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.forEach((h) => {
            try {
              h(validationResult.data);
            } catch (error) {
              console.error(`Error in handler for event ${event}:`, error);
            }
          });
        }
      });
    }

    const handlers = this.eventHandlers.get(event)!;
    handlers.add(handler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.socket?.off(event);
        this.eventHandlers.delete(event);
      }
    };
  }

  /**
   * Emit event to server
   */
  emit<T = any>(event: string, payload: T, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error(`Socket timeout on event: ${event}`));
      }, timeout);

      this.socket!.emit(event, payload, (response: any) => {
        clearTimeout(timer);
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  getId(): string | null {
    return this.socket?.id || null;
  }

  /**
   * Register internal socket handlers
   */
  private registerInternalHandlers(): void {
    this.socket?.on('error', (error) => {
      console.error('🔴 Socket error:', error);
      useChatStore.setState({ error: String(error) });
    });

    this.socket?.on('message:new', (payload) => {
      const store = useChatStore.getState();
      const validated = validateSocketPayload('message:new', payload);
      if (validated.valid) {
        store.addMessage(validated.data);
      }
    });

    this.socket?.on('conversation:updated', (payload) => {
      const store = useChatStore.getState();
      const validated = validateSocketPayload('conversation:updated', payload);
      if (validated.valid) {
        store.updateConversation(validated.data.id, validated.data);
      }
    });
  }
}

// Singleton instance
let socketManager: SocketManager | null = null;

export function initializeSocket(
  url: string,
  options?: Record<string, any>
): SocketManager {
  if (!socketManager) {
    socketManager = new SocketManager(url, options);
    // Conectar automáticamente cuando se inicializa
    socketManager.connect().catch((error) => {
      console.error('Failed to connect socket during initialization:', error);
    });
  }
  return socketManager;
}

export function getSocketManager(): SocketManager | null {
  if (!socketManager) {
    console.warn(
      '⚠️ Socket manager not initialized. Call initializeSocket first.'
    );
    return null;
  }
  return socketManager;
}
