# 🚀 PLAN DE REFACTORIZACIÓN: CHAT v2

**Objetivo:** Convertir el módulo de chat de código spaghetti a arquitectura limpia  
**Tiempo Estimado:** 4 semanas  
**Riesgo:** Bajo (refactorización gradual)

---

## FASE 1: SEPARACIÓN DE HOOKS (Semana 1)

### Objetivo

Convertir el giant `useChatSession.ts` (534 líneas) en 3 hooks especializados y reutilizables.

### Estructura Actual (MALA)

```
useChatSession.ts
├─ loadHistoryOnce()      ← Para cargar datos
├─ sendMessage()          ← Para enviar
├─ Socket listeners       ← Para escuchar
├─ Batch processing       ← Para agrupar
└─ Todos mezclados en 1 hook
```

### Estructura Nueva (BUENA)

```
hooks/
├─ useConversationLoader.ts
│  ├─ loadHistoryOnce()
│  ├─ loadingInProgressRef
│  ├─ loadTimeoutRef
│  └─ Estados: history, loading
│
├─ useMessageSender.ts
│  ├─ sendMessage()
│  ├─ setSending
│  ├─ Timeouts de API
│  └─ Error handling
│
├─ useSocketListeners.ts
│  ├─ onMessage (batch)
│  ├─ onConversationUpdate
│  ├─ onTake
│  └─ Cleanup de listeners
│
└─ useChatSession.ts (NUEVO - orquestador)
   ├─ Importa los 3 hooks
   ├─ Combina sus resultados
   └─ Exporta interfaz unificada
```

### Implementación Paso a Paso

#### Paso 1.1: Crear `useConversationLoader.ts`

```typescript
/**
 * Hook para cargar el historial de una conversación
 * Responsabilidades:
 * - Cargar mensajes del backend
 * - Manejar estados de loading
 * - Aplicar timeouts de seguridad
 * - Limpiar recursos
 */

import { useState, useCallback, useRef } from 'react';
import { getSingleConversationHistory } from '../services/api';
import type { HistoryItem } from '../types/chat';

interface UseConversationLoaderProps {
  conversationId?: string | null;
  phoneNumber?: string;
}

export function useConversationLoader({
  conversationId,
  phoneNumber,
}: UseConversationLoaderProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadingInProgressRef = useRef(false);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadHistory = useCallback(async () => {
    if (!conversationId) return;
    if (loadingInProgressRef.current) return;

    loadingInProgressRef.current = true;
    setLoading(true);
    setError(null);

    // Timeout de seguridad
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      console.warn('[useConversationLoader] Load timeout');
      loadingInProgressRef.current = false;
      setLoading(false);
    }, 10000);

    try {
      const data = await getSingleConversationHistory(conversationId);
      setHistory(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      loadingInProgressRef.current = false;
      setLoading(false);
    }
  }, [conversationId]);

  return {
    history,
    loading,
    error,
    loadHistory,
    setHistory,
  };
}
```

#### Paso 1.2: Crear `useMessageSender.ts`

```typescript
/**
 * Hook para enviar mensajes
 * Responsabilidades:
 * - POST del mensaje al backend
 * - Optimistic updates
 * - Manejo de errores
 * - Timeouts
 */

import { useState, useCallback } from 'react';
import { api } from '../services/api';

export function useMessageSender() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      setSending(true);
      setError(null);

      try {
        const sendPromise = api.post(
          `/conversations/${conversationId}/messages`,
          { content }
        );

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Send timeout after 20s')), 20000)
        );

        await Promise.race([sendPromise, timeoutPromise]);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSending(false);
      }
    },
    []
  );

  return {
    sending,
    error,
    sendMessage,
  };
}
```

#### Paso 1.3: Crear `useSocketListeners.ts`

```typescript
/**
 * Hook para escuchar eventos de Socket
 * Responsabilidades:
 * - Registrar listeners
 * - Batch processing
 * - Limpiar listeners
 */

import { useEffect, useRef, useCallback } from 'react';
import type { HistoryItem } from '../types/chat';
import { useSocket } from './useSocket';

interface UseSocketListenersProps {
  conversationId?: string | null;
  onMessageReceived?: (items: HistoryItem[]) => void;
  onConversationUpdated?: () => void;
}

export function useSocketListeners({
  conversationId,
  onMessageReceived,
  onConversationUpdated,
}: UseSocketListenersProps) {
  const socket = useSocket();
  const messageQueueRef = useRef<HistoryItem[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processBatch = useCallback(() => {
    if (messageQueueRef.current.length === 0) return;

    const batch = messageQueueRef.current.splice(0);
    onMessageReceived?.(batch);
  }, [onMessageReceived]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    const onMessage = (payload: any) => {
      if (payload.conversationId === conversationId) {
        messageQueueRef.current.push({
          type: 'message',
          id: payload.id,
          conversationId: payload.conversationId,
          senderType: payload.senderType,
          senderId: payload.senderId ? Number(payload.senderId) : null,
          content: payload.content,
          mediaType: payload.mediaType,
          mediaUrl: payload.mediaUrl,
          externalId: null,
          isDelivered: true,
          isRead: false,
          createdAt: payload.createdAt,
        });

        if (batchTimeoutRef.current) return;

        batchTimeoutRef.current = setTimeout(() => {
          processBatch();
          batchTimeoutRef.current = null;
        }, 50);
      }
    };

    const onConversationUpdate = (payload: any) => {
      if (payload.conversationId === conversationId) {
        onConversationUpdated?.();
      }
    };

    socket.on('message:new', onMessage);
    socket.on('conversation:update', onConversationUpdate);

    return () => {
      socket.off('message:new', onMessage);
      socket.off('conversation:update', onConversationUpdate);
      if (batchTimeoutRef.current) clearTimeout(batchTimeoutRef.current);
    };
  }, [socket, conversationId, processBatch, onConversationUpdated]);
}
```

#### Paso 1.4: Reescribir `useChatSession.ts` como orquestador

```typescript
/**
 * Hook orquestador que combina los 3 hooks especializados
 * Interfaz única para el resto de la app
 */

import { useCallback, useEffect } from 'react';
import { useConversationLoader } from './useConversationLoader';
import { useMessageSender } from './useMessageSender';
import { useSocketListeners } from './useSocketListeners';

interface ConversationData {
  id: string;
  userPhone: string;
}

export function useChatSession(activeConversation: ConversationData | null) {
  const loader = useConversationLoader({
    conversationId: activeConversation?.id,
    phoneNumber: activeConversation?.userPhone,
  });

  const sender = useMessageSender();

  const handleMessageReceived = useCallback(
    (items: any[]) => {
      loader.setHistory((prev) => [...prev, ...items]);
    },
    [loader]
  );

  const handleConversationUpdated = useCallback(() => {
    loader.loadHistory();
  }, [loader]);

  useSocketListeners({
    conversationId: activeConversation?.id,
    onMessageReceived: handleMessageReceived,
    onConversationUpdated: handleConversationUpdated,
  });

  useEffect(() => {
    loader.loadHistory();
  }, [activeConversation?.id]);

  const sendMessage = useCallback(
    async (content: string, isNote: boolean) => {
      if (!activeConversation) return;

      try {
        await sender.sendMessage(activeConversation.id, content);
      } catch (error) {
        console.error('Failed to send message', error);
      }
    },
    [activeConversation, sender]
  );

  return {
    history: loader.history,
    loading: loader.loading,
    sending: sender.sending,
    error: sender.error || loader.error,
    sendMessage,
  };
}
```

### Beneficios de esta separación

✅ **Cada hook es reutilizable** - Otro componente puede usar `useMessageSender`  
✅ **Responsabilidad única** - Cada hook hace UNA cosa  
✅ **Testeable** - Puedes testear `useMessageSender` sin Socket.IO  
✅ **Debuggeable** - Qué hook está causando el problema? Obvio.  
✅ **Reemplazable** - Si decides usar GraphQL, reemplazas `useMessageSender`

---

## FASE 2: CONTEXT PARA EVITAR PROP DRILLING (Semana 1-2)

### Problema Actual

```
ChatPage
  ↓ props: history, sending, ...
ChatView
  ↓ props: isSending, onSendMessage, ...
ChatComposer
  ↓ finalmente usa: isSending
```

### Solución: ChatContext

```typescript
// contexts/ChatContext.tsx

import React, { createContext, useContext } from 'react';
import { useChatSession } from '../hooks/useChatSession';

interface ChatContextValue {
  history: any[];
  loading: boolean;
  sending: boolean;
  error: Error | null;
  sendMessage: (content: string, isNote: boolean) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({
  activeConversation,
  children,
}: {
  activeConversation: any;
  children: React.ReactNode;
}) {
  const chatSession = useChatSession(activeConversation);

  return (
    <ChatContext.Provider value={chatSession}>{children}</ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
}
```

### Uso en componentes

```typescript
// ChatComposer.tsx - ANTES (con props)
function ChatComposer({ isSending, onSubmit }) {
  const handleSubmit = async (e) => {
    await onSubmit(content);
    setSending(false);
  };
}

// ChatComposer.tsx - DESPUÉS (con context)
function ChatComposer() {
  const { sending, sendMessage } = useChatContext();

  const handleSubmit = async (e) => {
    await sendMessage(content, false);
    // ✅ Ya limpiada automáticamente
  };
}
```

---

## FASE 3: BACKEND - DIVIDIR wpp.service.ts (Semana 2-3)

### Estructura Actual (MALA)

```
wpp.service.ts (1300 líneas)
├─ Conversaciones
├─ Mensajes
├─ WhatsApp
├─ Socket broadcasting
├─ Sessions
└─ TODO mezclado
```

### Estructura Nueva (BUENA)

```
services/
├─ whatsappSession.ts (200 líneas)
│  ├─ startSession()
│  ├─ stopSession()
│  ├─ getSessionInfo()
│  └─ Session management
│
├─ conversationBroadcaster.ts (150 líneas)
│  ├─ fetchConversationSnapshot()
│  ├─ broadcastConversationUpdate()
│  ├─ conversationRooms()
│  └─ Solo conversaciones
│
├─ messageBroadcaster.ts (150 líneas)
│  ├─ broadcastMessageRecord()
│  ├─ formatMessageRecord()
│  └─ Solo mensajes
│
├─ socketManager.ts (200 líneas)
│  ├─ emitToRoom()
│  ├─ Socket middleware
│  └─ Socket infrastructure
│
├─ whatsappHandler.ts (300 líneas)
│  ├─ handleIncomingMessage()
│  ├─ sendReply()
│  ├─ ensureConversation()
│  └─ WhatsApp message logic
│
└─ wpp.service.ts (NUEVO - index/exports)
   └─ Re-exporta todo organizado
```

### Ejemplo: Crear conversationBroadcaster.ts

```typescript
/**
 * Servicio para emitir eventos relacionados con conversaciones
 * Responsabilidad única: Conversación → Socket eventos
 */

import { prisma } from '../config/prisma';
import type { SocketIOServer } from 'socket.io';

export async function fetchConversationSnapshot(
  conversationId: bigint | number
) {
  const id =
    typeof conversationId === 'bigint'
      ? conversationId
      : BigInt(conversationId);

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      userPhone: true,
      contactName: true,
      contact: true,
      area: true,
      assignedTo: true,
      status: true,
      botActive: true,
      lastActivity: true,
      updatedAt: true,
    },
  });

  if (!conversation) return null;

  return {
    id: conversation.id.toString(),
    userPhone: conversation.userPhone,
    // ... resto
  };
}

export async function broadcastConversationUpdate(
  io: SocketIOServer | undefined,
  conversationId: bigint | number
) {
  if (!io) return null;

  const snapshot = await fetchConversationSnapshot(conversationId);
  if (!snapshot) return null;

  // Rooms específicos: solo a usuarios con acceso
  const rooms = [
    `conversation:${conversationId}`,
    `user:${snapshot.assignedTo?.id}`,
  ];

  rooms.forEach((room) => {
    io.to(room).emit('conversation:update', snapshot);
  });

  return snapshot;
}
```

### Beneficios

✅ **Cada archivo <300 líneas**  
✅ **Fácil encontrar bugs** - ¿Conversación? Busca en conversationBroadcaster.ts  
✅ **Reemplazable** - Si cambias Socket.IO por EventEmitter, es un archivo  
✅ **Testeable** - Mock `prisma` y listo

---

## FASE 4: VALIDACIÓN Y TIPOS (Semana 3-4)

### Agregar Zod para validar payloads Socket

```typescript
// schemas/socketPayloads.ts

import { z } from 'zod';

export const messageNewPayload = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderType: z.enum(['CONTACT', 'BOT', 'OPERATOR']),
  senderId: z.number().nullable(),
  content: z.string(),
  mediaType: z.string().nullable(),
  mediaUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type MessageNewPayload = z.infer<typeof messageNewPayload>;

// En useSocketListeners.ts
const onMessage = (payload: unknown) => {
  const validated = messageNewPayload.safeParse(payload);
  if (!validated.success) {
    console.error('Invalid message payload', validated.error);
    return;
  }

  // ✅ Ahora `validated.data` tiene tipos correctos
  processMessage(validated.data);
};
```

---

## 📋 TABLA DE PROGRESO

| Tarea                         | Semana    | Líneas   | Tests | Riesgo   |
| ----------------------------- | --------- | -------- | ----- | -------- |
| Crear `useConversationLoader` | 1         | 80       | Alto  | 🟢 Bajo  |
| Crear `useMessageSender`      | 1         | 60       | Alto  | 🟢 Bajo  |
| Crear `useSocketListeners`    | 1         | 100      | Medio | 🟡 Medio |
| Reescribir `useChatSession`   | 1         | 50       | Alto  | 🟢 Bajo  |
| Crear `ChatContext`           | 1-2       | 40       | Medio | 🟢 Bajo  |
| Reemplazar props drilling     | 2         | 20       | Alto  | 🟢 Bajo  |
| Dividir `wpp.service.ts`      | 2-3       | -300     | Medio | 🟡 Medio |
| Agregar Zod validation        | 3-4       | 100      | Medio | 🟢 Bajo  |
| Tests e2e                     | 4         | -        | Alto  | 🟡 Medio |
| **TOTAL**                     | **4 sem** | **-200** | -     | -        |

---

## ✅ CRITERIOS DE ACEPTACIÓN

### Fase 1 Complete cuando:

- [ ] Todos los 3 hooks funcionan
- [ ] Tests unitarios pasan
- [ ] Props drilling reducido en 50%

### Fase 2 Complete cuando:

- [ ] `ChatContext` funciona
- [ ] ChatComposer no recibe props innecesarias
- [ ] cero cambios en UX

### Fase 3 Complete cuando:

- [ ] wpp.service.ts dividido
- [ ] Cada archivo <300 líneas
- [ ] Timeouts sigue siendo <5 seg (con cache)

### Fase 4 Complete cuando:

- [ ] Zod valida todos los payloads
- [ ] Types derivados, sin casting manual
- [ ] 0 errors de runtime por payloads inválidos

---

## 🎯 MÉTRICAS POST-REFACTORIZACIÓN

```
Frontend:
- useChatSession.ts: 534 → 50 líneas
- Props pasadas: 3 → 1 nivel
- useEffect: 5 → 2
- useCallback: 4 → 1
- Testeable: No → Sí

Backend:
- wpp.service.ts: 1300+ → 300 líneas
- Responsabilidades: 8 → 1
- Imports por archivo: 20+ → 5
- Exports reutilizables: 3 → 15+

Socket:
- Broadcasting duplicado: Sí → No
- Payloads validados: No → Sí
- Memory leaks: Sí → No
```

---

**Siguiente paso:** Decidir si proceder con refactorización o reescritura
