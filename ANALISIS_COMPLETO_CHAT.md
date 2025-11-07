# 🔍 ANÁLISIS EXHAUSTIVO: ARQUITECTURA DEL CHAT

**Fecha:** 6 de Noviembre 2025  
**Estado:** Sistema funciona pero con DEUDA TÉCNICA SEVERA

---

## 📊 RESUMEN EJECUTIVO

| Aspecto              | Calificación     | Problemas                                    |
| -------------------- | ---------------- | -------------------------------------------- |
| **Complejidad**      | 🔴 ALTA          | 15+ archivos entrelazados sin modularidad    |
| **State Management** | 🔴 CAÓTICO       | useRef, useState, localStorage mezclados     |
| **Performance**      | 🟡 INCONSISTENTE | Timeouts de 20s, queries complejas sin cache |
| **Mantenibilidad**   | 🔴 BAJA          | Código spaghetti con banderas de control     |
| **Testing**          | 🔴 IMPOSIBLE     | Sin tipos claros, lógica mezclada            |
| **Documentación**    | 🟡 PARCIAL       | Algunos comentarios útiles pero incompletos  |

---

## 🔴 PROBLEMAS CRÍTICOS ENCONTRADOS

### 1. **FRONTEND: State Management Espagueti**

**Archivo:** `src/hooks/useChatSession.ts` (534 líneas)

#### Problemas Identificados:

```typescript
// ❌ ANTIPATRON 1: Multitud de banderas de control
const isMountedRef = useRef(true);
const loadingInProgressRef = useRef(false);  // Bandera 1
const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const flowStartedRef = useRef<Set<string>>(new Set());  // Bandera 2

// ❌ ANTIPATRON 2: Batch processing con refs (difícil de debuguear)
const messageQueueRef = useRef<HistoryItem[]>([]);
const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// ❌ ANTIPATRON 3: Timeouts hardcodeados sin configuración
const BATCH_DELAY = 50; // Mágico, sin justificación

// ❌ ANTIPATRON 4: useCallback con dependencias inconsistentes
const sendMessage = useCallback(
  async (content: string, isNote: boolean) => {
    // ... 100+ líneas de lógica compleja ...
  },
  [activeConversation]  // ¿Por qué solo activeConversation?
);

// ❌ ANTIPATRON 5: Tiempos hardcodeados sin documentación
const CACHE_TTL = 60000; // 60 segundos - ¿Por qué 60?
setTimeout(() => reject(...), 20000); // ¿Por qué 20 segundos?
setTimeout(() => reject(...), 10000); // ¿Por qué 10 segundos?
```

**PROBLEMAS:**

- 🔴 **Control manual de ciclo de vida:** `isMountedRef`, `loadingInProgressRef` son contradicciones a React
- 🔴 **State vs Side Effects mezclados:** No está claro qué es estado y qué es efecto
- 🔴 **Timeout towers:** 3 niveles diferentes de timeouts sin orquestación
- 🔴 **Batch processing con refs:** Difícil de testear, imposible de razonar

**PUNTUACIÓN:** 3/10 (Mantenible pero frágil)

---

### 2. **FRONTEND: Componentes con Props Chains**

**Archivos:**

- `src/pages/ChatPage.tsx`
- `src/components/chat/ChatView.tsx`
- `src/components/chat/ChatComposer.tsx`

#### Problema: Prop Drilling

```typescript
// ChatPage.tsx
const { history, loading, sending, sendMessage } = useChatSession();

// Props pasados a ChatView
<ChatView
  history={history}
  loading={loading}
  sending={sending}
  onSendMessage={sendMessage}
/>

// ChatView.tsx pasa props a ChatComposer
<ChatComposer
  isSending={isSending}
  onSubmit={onSubmitMessage}
/>

// ChatComposer.tsx espera await
const handleSubmit = async (e: React.FormEvent) => {
  await onSubmit(content);  // ← Finalmente aquí
  setSending(false);
};
```

**PROBLEMAS:**

- 🔴 **Prop drilling innecesario:** `sending` pasa por 3 niveles
- 🔴 **Inconsistencia de nombres:** `sending`, `isSending`, `onSubmit`, `onSendMessage`
- 🔴 **Conversión manual de strings:** bigint → string → bigint → string
- 🔴 **Acoplamiento fuerte:** Cambiar useChatSession rompe toda la cadena

**PUNTUACIÓN:** 4/10

---

### 3. **BACKEND: Arquitectura de Servicios Desorganizada**

**Archivos:** `src/services/wpp.service.ts` (1300+ líneas)

#### El problema: UN ARCHIVO GIGANTE

```typescript
// wpp.service.ts contiene:
export async function fetchConversationSnapshot() {}
export async function broadcastConversationUpdate() {}
export async function broadcastMessageRecord() {}
export function conversationRooms() {}
export function emitToRoom() {}
export async function sendTextFromSession() {}
export async function extractMessageExternalId() {}
export async function resolveMessageDate() {}
export async function startSession() {}
export async function stopSession() {}
// ... 30+ más funciones
```

**PROBLEMAS:**

- 🔴 **Responsabilidades mezcladas:** Conversaciones, Mensajes, WhatsApp, Socket.IO, Todo
- 🔴 **Difícil de debuguear:** ¿Cuál función está causando el timeout de 15s?
- 🔴 **Imposible de testear:** Demasiadas dependencias, demasiados efectos secundarios
- 🔴 **Duplicación de lógica:** Múltiples funciones hacen lo mismo

**PUNTUACIÓN:** 2/10

---

### 4. **BACKEND: getNextNodeAndContext() - Eficiencia**

**Archivo:** `src/services/flow.service.ts`

```typescript
export async function getNextNodeAndContext(input) {
  // ❌ Se llama EN CADA MENSAJE
  const flowTree = await listFlowTree({
    createdBy: typeof input.botId === 'number' ? input.botId : 1,
    areaId: undefined,
    includeInactive: false,
  });

  // ❌ ENTONCES flatMapea TODO el árbol
  currentNode =
    flowTree
      .flatMap(flattenFlowTree)
      .find((node) => node.id === Number(input.currentNodeId)) ?? null;

  // ❌ ENTONCES busca en children
  nextNode =
    currentNode.children.find((child: FlowNode) => {
      return child.trigger.toLowerCase() === input.message.toLowerCase();
    }) ?? null;
}
```

**PROBLEMAS:**

- 🔴 **Query ineficiente:** Carga TODO el árbol aunque solo necesita 1 nodo
- 🔴 **Búsqueda lineal:** `.find()` en arrays grandes es O(n)
- 🔴 **Sin índices:** BD no optimizada para esta consulta
- 🔴 **Efecto:** Timeouts de 15-20 segundos en cada mensaje

**Solución Actual (Parcial):** Cache de 60 segundos  
**Solución Real Recomendada:** Reescribir con índices en BD

**PUNTUACIÓN:** 4/10

---

### 5. **SOCKET.IO: Broadcasting Caótico**

**Archivos:** `src/services/wpp.service.ts`, `src/app.ts`

```typescript
// ❌ PROBLEMA 1: Broadcasting duplicado
await broadcastConversationUpdate(io, conversationId);
await broadcastMessageRecord(io, conversationId, messageRecord);
// Ambas funciones emiten 'conversation:update'

// ❌ PROBLEMA 2: Rooms confusos
const rooms = conversationRooms(snapshot);
rooms.forEach((room) => emitToRoom(io, room, 'conversation:update', snapshot));
// ¿Cuántos clients reciben esto?

// ❌ PROBLEMA 3: Sin validación
socket.on('message:new', (payload) => {
  // payload no validado
  // ¿Qué si payload.conversationId es "hacker"?
});
```

**PROBLEMAS:**

- 🔴 **Eventos duplicados:** Múltiples broadcasts del mismo evento
- 🔴 **Sin estrategia de rooms:** ¿Por conversación? ¿Por usuario? ¿Por área?
- 🔴 **Sin validación:** Payloads sin schema
- 🔴 **Performance:** Emitir a muchos clients sin throttling

**PUNTUACIÓN:** 3/10

---

### 6. **FRONTEND: Listeners de Socket Complejos**

**Archivo:** `src/hooks/useChatSession.ts` (líneas 220-390)

```typescript
// ❌ PROBLEMA 1: Listeners redeclarados en CADA render
useEffect(() => {
  const onMessage = (payload) => {
    /* ... */
  };
  const onTake = (payload) => {
    /* ... */
  };
  const onFinish = (payload) => {
    /* ... */
  };
  const onConversationUpdate = (payload) => {
    /* ... */
  };

  socket.on('message:new', onMessage);
  socket.on('conversation:update', onConversationUpdate);

  return () => {
    socket.off('message:new', onMessage);
    socket.off('conversation:update', onConversationUpdate);
  };
}, [activeConversation, socket, loadHistoryOnce, processBatch]);

// ❌ PROBLEMA 2: Lógica de decisión compleja en listeners
const onConversationUpdate = (payload) => {
  const significantChanges =
    payload.status === 'CLOSED' ||
    payload.status === 'FINISHED' ||
    (payload.botActive !== undefined &&
      payload.botActive !== activeConversation.botActive) ||
    (payload.assignedTo !== undefined &&
      payload.assignedTo !== activeConversation.assignedTo?.id);

  if (significantChanges) {
    loadHistoryOnce(activeConversation.userPhone, activeConversation.id);
  } else {
    // Qué es "menor"?
  }
};

// ❌ PROBLEMA 3: Batch processing intercala listeners
if (batchTimeoutRef.current) {
  console.log('[useChatSession] Timeout ya pendiente, no crear nuevo');
  return; // Pero entonces ¿qué pasa con el mensaje?
}
```

**PROBLEMAS:**

- 🔴 **Memory leaks potenciales:** Si algo no se limpia correctamente
- 🔴 **Lógica de negocio en listeners:** Los listeners son para reaccionar, no decidir
- 🔴 **Race conditions:** Entre listeners y batch processing

**PUNTUACIÓN:** 3/10

---

### 7. **TIPOS DÉBILES EN TODA LA ARQUITECTURA**

```typescript
// ❌ Sin tipos claros
export const sendMessage = useCallback(
  async (content: string, isNote: boolean) => {
    // ¿Qué retorna? ¿Void? ¿void?
    // ¿Qué excepciones lanza?
    // ¿Qué side effects tiene?
  },
  [activeConversation]
);

// ❌ Payload sin tipos
const onMessage = (payload: {
  id: string;
  conversationId: string;
  senderType: string;
  senderId: string | null;
  content: string;
  mediaType: string | null;
  mediaUrl: string | null;
  createdAt: string;
}) => {
  // Si alguien cambia el backend y olvida conversationId,
  // esto compila pero falla en runtime
};

// ❌ Conversión manual de tipos
conversationId = BigInt(conversationIdParam); // Puede fallar
const stringId = messageRecord.id.toString(); // Y acá vuelve a string
```

**PROBLEMAS:**

- 🔴 **Type-unsafe casting:** BigInt ↔ string constantemente
- 🔴 **Sin Zod/Yup:** Payloads sin validación de schema
- 🔴 **Types implicitos:** Cualquiera puede enviar `any` como payload

**PUNTUACIÓN:** 2/10

---

## 🟡 ANTIPATRONES ENCONTRADOS

| Antipatrón             | Ubicación                              | Severidad  | Solución                          |
| ---------------------- | -------------------------------------- | ---------- | --------------------------------- |
| **God Hook**           | `useChatSession.ts`                    | 🔴 CRÍTICA | Dividir en 3-4 hooks pequeños     |
| **Prop Drilling**      | `ChatPage → ChatView → ChatComposer`   | 🟡 MEDIA   | Context + Zustand                 |
| **God Service**        | `wpp.service.ts`                       | 🔴 CRÍTICA | Dividir en 4 servicios            |
| **Mutable State**      | `isMountedRef`, `loadingInProgressRef` | 🟡 MEDIA   | Usar solo hooks de React          |
| **Hardcoded Timeouts** | Múltiples                              | 🟡 MEDIA   | Config centralisado               |
| **Memory Leaks**       | Listeners no limpios                   | 🔴 CRÍTICA | Revisar useEffect dependencies    |
| **Type Unsafety**      | BigInt ↔ string                        | 🟡 MEDIA   | Usar tipos derivados              |
| **N+1 Queries**        | `listFlowTree` en cada mensaje         | 🔴 CRÍTICA | Índices en BD + cache estratégico |

---

## 📋 LISTA DE REFACTORIZACIÓN PRIORIZADA

### FASE 1: CRÍTICA (Semana 1)

```
1. ✅ [DONE] Agregar timeout a sendMessage (20 segundos)
2. ✅ [DONE] Cachear listFlowTree (60 segundos)
3. ⚠️  [TODO] Separar useChatSession en 3 hooks:
   - useConversationLoader (cargar datos)
   - useMessageSender (enviar mensajes)
   - useSocketListeners (escuchar eventos)
4. ⚠️  [TODO] Crear Context para evitar prop drilling
5. ⚠️  [TODO] Agregar validación con Zod a payloads Socket
```

### FASE 2: IMPORTANTE (Semana 2-3)

```
6. ⚠️  [TODO] Dividir wpp.service.ts en:
   - conversationBroadcaster.ts
   - messageBroadcaster.ts
   - socketManager.ts
   - whatsappSession.ts
7. ⚠️  [TODO] Reescribir getNextNodeAndContext con índices en BD
8. ⚠️  [TODO] Agregar tipos derivados para BigInt/string
9. ⚠️  [TODO] Crear componentes para forms (EditContactModal es buen modelo)
```

### FASE 3: MEJORA (Semana 4+)

```
10. ⚠️  [TODO] Agregar Tests unitarios
11. ⚠️  [TODO] Documentar flujos con diagramas
12. ⚠️  [TODO] Performance profiling
13. ⚠️  [TODO] Rate limiting en Socket.IO
```

---

## 🎯 RECOMENDACIÓN: ¿REESCRIBIR O REFACTORIZAR?

### Opción A: **Refactorizar Gradualmente** (Recomendado)

```
Ventajas:
✅ No rompe lo que funciona
✅ Puedes validar cada cambio
✅ Menos riesgo de reintroducir bugs
✅ Puedes hacer en paralelo

Desventajas:
❌ Más lento
❌ Más trabajo total
```

### Opción B: **Reescribir desde Cero** (Riesgoso)

```
Ventajas:
✅ Más limpio
✅ Más rápido al final
✅ Sin deuda técnica

Desventajas:
❌ Puedes introducir bugs nuevos
❌ Tarda más inicialmente
❌ Riesgo de perder features
```

**MI RECOMENDACIÓN:** Opción A (Refactorización Gradual)  
**FASES:** 4 semanas, validar cada fase

---

## 📝 MÉTRICAS ACTUALES

```
Frontend:
- Líneas en useChatSession.ts: 534 (debería ser 200)
- Props pasadas: 3 niveles (debería ser 1)
- useEffect: 5 (debería ser 3)
- useCallback: 4 (debería ser 2)

Backend:
- Líneas en wpp.service.ts: 1300+ (debería ser 300)
- Responsabilidades: 8+ (debería ser 1)
- Imports: 20+ (debería ser 5)
- Exports: 30+ (debería ser 5)

Socket:
- Broadcasting duplicado: SÍ
- Payloads sin validar: SÍ
- Memory leaks potenciales: SÍ
```

---

## ✅ PRÓXIMOS PASOS

1. **Leer este reporte**
2. **Decidir: Refactorizar o Reescribir**
3. **Si Refactorizar:** Seguir FASE 1
4. **Si Reescribir:** Crear rama nueva `refactor/chat-v2`
5. **Comunicar cambios** al equipo

---

**Generado:** 6 Noviembre 2025
