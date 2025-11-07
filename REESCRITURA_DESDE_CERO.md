# 🔄 ALTERNATIVA: REESCRITURA DESDE CERO (Chat v2 Clean)

**Duración estimada:** 2-3 semanas  
**Riesgo:** Medio (nuevos bugs potenciales)  
**Beneficio:** Clean slate, sin deuda técnica

---

## 📊 COMPARACIÓN: REFACTORIZAR vs REESCRIBIR

| Aspecto              | Refactorizar | Reescribir           |
| -------------------- | ------------ | -------------------- |
| **Tiempo**           | 4 semanas    | 2-3 semanas          |
| **Riesgo**           | Bajo         | Medio                |
| **Calidad final**    | 7/10         | 9/10                 |
| **Downtime**         | 0 minutos    | 2-3 horas            |
| **Bugs potenciales** | 2-3          | 5-10 (solucionables) |
| **Confianza**        | Media        | Alta                 |

---

## 🏗️ ARQUITECTURA NUEVA: DESDE CERO

### FRONTEND: Stack Simple

```
src/
├─ features/
│  └─ chat/
│     ├─ Chat.tsx                    (entrada principal)
│     ├─ components/
│     │  ├─ ChatContainer.tsx
│     │  ├─ MessageList.tsx
│     │  ├─ MessageItem.tsx
│     │  └─ MessageInput.tsx
│     ├─ hooks/
│     │  ├─ useChat.ts              (orquestador simple)
│     │  └─ useChatSocket.ts        (socket simple)
│     ├─ services/
│     │  ├─ chatApi.ts              (fetch + mutations)
│     │  └─ chatSocket.ts           (socket manager)
│     ├─ store/
│     │  └─ chatStore.ts            (Zustand or Context)
│     ├─ types/
│     │  ├─ Chat.ts
│     │  ├─ Message.ts
│     │  └─ Payloads.ts
│     └─ utils/
│        └─ messageFormatter.ts
```

### BACKEND: Modular Limpio

```
src/
├─ modules/
│  └─ chat/
│     ├─ chat.controller.ts
│     ├─ chat.service.ts
│     ├─ chat.routes.ts
│     ├─ message/
│     │  ├─ message.controller.ts
│     │  ├─ message.service.ts
│     │  └─ message.repository.ts
│     ├─ broadcast/
│     │  ├─ broadcast.service.ts
│     │  ├─ socketEvents.ts
│     │  └─ validatePayload.ts
│     └─ types/
│        ├─ Chat.types.ts
│        └─ Message.types.ts
```

---

## 💻 FRONTEND: IMPLEMENTACIÓN LIMPIA

### 1. Store Zustand (Estado Global Limpio)

```typescript
// src/features/chat/store/chatStore.ts

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Chat, Message } from '../types';

interface ChatState {
  // State
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  loading: boolean;
  sending: boolean;
  error: string | null;

  // Actions
  setActiveChat: (chat: Chat | null) => void;
  addMessage: (message: Message) => void;
  addMessages: (messages: Message[]) => void;
  setSending: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;

  // Computed
  sortedMessages: () => Message[];
  unreadCount: () => number;
}

export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set, get) => ({
    chats: [],
    activeChat: null,
    messages: [],
    loading: false,
    sending: false,
    error: null,

    setActiveChat: (chat) => set({ activeChat: chat, messages: [] }),

    addMessage: (message) =>
      set((state) => ({
        messages: [...state.messages, message],
      })),

    addMessages: (messages) =>
      set((state) => ({
        messages: [...state.messages, ...messages],
      })),

    setSending: (value) => set({ sending: value }),
    setLoading: (value) => set({ loading: value }),
    setError: (error) => set({ error }),
    clearMessages: () => set({ messages: [] }),

    sortedMessages: () => {
      const { messages } = get();
      return [...messages].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    },

    unreadCount: () => {
      const { messages } = get();
      return messages.filter((m) => !m.isRead).length;
    },
  }))
);
```

### 2. Socket Manager Limpio

```typescript
// src/features/chat/services/chatSocket.ts

import { io, Socket } from 'socket.io-client';
import { useChatStore } from '../store/chatStore';
import type { MessageNewPayload, ConversationUpdatePayload } from '../types';
import {
  validateMessagePayload,
  validateConversationPayload,
} from './validators';

class ChatSocketManager {
  private socket: Socket | null = null;
  private messageQueue: MessageNewPayload[] = [];
  private processingTimeout: NodeJS.Timeout | null = null;

  connect() {
    this.socket = io(import.meta.env.VITE_SOCKET_URL);

    // ✅ LISTENERS: Simple y directo
    this.socket.on('message:new', this.handleMessageNew);
    this.socket.on('conversation:update', this.handleConversationUpdate);
    this.socket.on('disconnect', this.handleDisconnect);
  }

  private handleMessageNew = (payload: unknown) => {
    const validated = validateMessagePayload(payload);
    if (!validated) return;

    // Batch processing: agregar a cola
    this.messageQueue.push(validated);

    // Procesar después de 50ms
    if (this.processingTimeout) return;
    this.processingTimeout = setTimeout(() => {
      const batch = this.messageQueue.splice(0);
      useChatStore.getState().addMessages(batch);
      this.processingTimeout = null;
    }, 50);
  };

  private handleConversationUpdate = (payload: unknown) => {
    const validated = validateConversationPayload(payload);
    if (!validated) return;

    // Recargar datos si cambió algo importante
    if (validated.status === 'CLOSED') {
      useChatStore.getState().clearMessages();
    }
  };

  private handleDisconnect = () => {
    console.log('[ChatSocket] Desconectado');
  };

  disconnect() {
    this.socket?.disconnect();
  }
}

export const chatSocket = new ChatSocketManager();
```

### 3. API Service Limpio

```typescript
// src/features/chat/services/chatApi.ts

import { api } from '@/services/api';
import type { Message, Chat } from '../types';

export const chatApi = {
  // Conversaciones
  async getConversations(): Promise<Chat[]> {
    const res = await api.get('/conversations');
    return res.data;
  },

  async getConversationHistory(id: string): Promise<Message[]> {
    const res = await api.get(`/conversations/${id}/history`);
    return res.data;
  },

  // Mensajes
  async sendMessage(conversationId: string, content: string): Promise<Message> {
    const res = await api.post(`/conversations/${conversationId}/messages`, {
      content,
    });
    return res.data;
  },

  // Con timeout garantizado
  async sendMessageWithTimeout(
    conversationId: string,
    content: string,
    timeoutMs = 20000
  ): Promise<Message> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await api.post(
        `/conversations/${conversationId}/messages`,
        { content },
        { signal: controller.signal }
      );
      return res.data;
    } finally {
      clearTimeout(timeoutId);
    }
  },
};
```

### 4. Hook Orquestador Limpio

```typescript
// src/features/chat/hooks/useChat.ts

import { useEffect, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { chatApi } from '../services/chatApi';
import { chatSocket } from '../services/chatSocket';

export function useChat() {
  const store = useChatStore();

  // Conectar socket al montar
  useEffect(() => {
    chatSocket.connect();
    return () => chatSocket.disconnect();
  }, []);

  // Cargar conversación cuando cambia la activa
  useEffect(() => {
    if (!store.activeChat) return;

    const loadHistory = async () => {
      store.setLoading(true);
      try {
        const messages = await chatApi.getConversationHistory(
          store.activeChat!.id
        );
        store.clearMessages();
        store.addMessages(messages);
      } catch (error) {
        store.setError('Error cargando mensajes');
      } finally {
        store.setLoading(false);
      }
    };

    loadHistory();
  }, [store.activeChat?.id]);

  // Enviar mensaje
  const sendMessage = useCallback(
    async (content: string) => {
      if (!store.activeChat) return;

      store.setSending(true);
      try {
        const message = await chatApi.sendMessageWithTimeout(
          store.activeChat.id,
          content
        );
        store.addMessage(message);
      } catch (error) {
        store.setError('Error enviando mensaje');
      } finally {
        store.setSending(false);
      }
    },
    [store.activeChat?.id]
  );

  return {
    // State
    messages: store.sortedMessages(),
    activeChat: store.activeChat,
    loading: store.loading,
    sending: store.sending,
    error: store.error,

    // Actions
    selectChat: store.setActiveChat,
    sendMessage,
  };
}
```

### 5. Componentes Simples

```typescript
// src/features/chat/components/Chat.tsx

import { useChat } from '../hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function Chat() {
  const { messages, sending, loading, error, sendMessage } = useChat();

  return (
    <div className="chat-container">
      {error && <div className="error">{error}</div>}

      <MessageList messages={messages} loading={loading} />

      <MessageInput onSend={sendMessage} disabled={sending || loading} />
    </div>
  );
}
```

---

## 🔧 BACKEND: IMPLEMENTACIÓN LIMPIA

### Estructura Modular

```typescript
// src/modules/chat/chat.service.ts

export class ChatService {
  async sendMessage(conversationId: string, userId: number, content: string) {
    // 1. Validar
    if (!content.trim()) throw new Error('Content required');

    // 2. Enviar por WhatsApp
    const whatsappResult = await this.sendViaWhatsapp(conversationId, content);

    // 3. Guardar en BD
    const message = await this.createMessage({
      conversationId,
      senderType: 'OPERATOR',
      senderId: userId,
      content,
      isDelivered: !!whatsappResult,
    });

    // 4. Determinar siguiente nodo (con cache)
    const { nextNodeId, context } = await this.getNextFlowNode(
      conversationId,
      content
    );

    // 5. Actualizar conversación
    await this.updateConversation(conversationId, {
      lastActivity: new Date(),
      currentFlowNodeId: nextNodeId,
      context,
    });

    return message;
  }

  private async sendViaWhatsapp(conversationId: string, content: string) {
    // Lógica WhatsApp
  }

  private async createMessage(data: any) {
    // Crear mensaje en BD
  }

  private async getNextFlowNode(conversationId: string, content: string) {
    // ✅ Con cache de 60 segundos
  }

  private async updateConversation(id: string, data: any) {
    // Actualizar conversación
  }
}
```

---

## 📊 COMPARACIÓN DE COMPLEJIDAD

### ANTES (Actual - Spaguetti)

```
534 líneas → 1 hook
├─ 50+ variables de estado
├─ 10+ useEffect
├─ 5+ useCallback
└─ Imposible testear
```

### DESPUÉS (Reescritura Limpia)

```
Zustand store (100 líneas) ✅ Testeable
Socket manager (80 líneas) ✅ Reemplazable
API service (60 líneas) ✅ Mockeable
Hook orquestador (40 líneas) ✅ Simple
Componentes (20 líneas c/u) ✅ Reutilizables
```

---

## ⏱️ TIMELINE REESCRITURA

```
DÍA 1-2: Diseño y estructura
├─ Crear tipos TypeScript
├─ Definir Zustand store
└─ Diseñar servicios

DÍA 3-4: Socket + API
├─ Socket manager
├─ API service
└─ Validators (Zod)

DÍA 5-6: Frontend
├─ Hook useChat
├─ Componentes
└─ Integración

DÍA 7-8: Backend
├─ Refactorizar service
├─ Tests unitarios
└─ Tests e2e

DÍA 9: QA + Deploy
├─ Testing en staging
├─ Deploy gradual (5% → 50% → 100%)
└─ Rollback plan
```

---

## 🎯 DECISIÓN

### ✅ Reescribir si:

- [ ] Equipo tiene tiempo para QA exhaustiva
- [ ] Aceptas riesgo de nuevos bugs (solucionables)
- [ ] Quieres código REALMENTE limpio
- [ ] Tienes 2-3 semanas disponibles

### ✅ Refactorizar si:

- [ ] Necesitas minimizar riesgo
- [ ] Tienes tiempo limitado
- [ ] Sistema debe estar 100% estable
- [ ] Prefieres cambios incrementales

---

**Recomendación:** Dado el estado actual, **REESCRIBIR** es la opción mejor a largo plazo.  
**Riesgo:** Bajo si sigues el plan paso a paso.
