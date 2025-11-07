# 🔍 Análisis Detallado: Bug en evento `message:new`

## Problemas Encontrados

### 1. **Mismatch de Tipos - Conversatio nId**

**Backend envía:**

```typescript
// wpp.service.ts:797-801
function formatMessageRecord(conversationId, message) {
  return {
    id: message.id.toString(),                    // STRING
    conversationId: BigInt(conversationId).toString(),  // STRING ← PROBLEMA
    senderType: message.senderType,
    ...
  };
}
```

**Frontend v2 espera:**

```typescript
// socketSchemas.ts:8
export const MessageSchema = z.object({
  id: z.union([z.number(), z.string()])...,
  conversationId: z.number(),  // ← ESPERA NÚMERO, no string
  ...
});
```

**Resultado:** Validación Zod falla parcialmente o se convierte incorrectamente

---

### 2. **Mismatch de Campos - senderType vs sender**

**Backend envía:**

```typescript
{
  senderType: 'OPERATOR' | 'CONTACT' | 'BOT';
}
```

**Frontend v2 espera:**

```typescript
{
  sender: 'user' | 'bot' | 'contact'; // ← ENUM diferente
  // Falta: senderType, senderId
}
```

**Resultado:** El payload llega pero no tiene los campos esperados

---

### 3. **Mismatch de Campos - createdAt vs timestamp**

**Backend envía:**

```typescript
{
  createdAt: '2025-11-07T15:30:45.123Z'; // ISO string
}
```

**Frontend v2 espera:**

```typescript
{
  timestamp: number; // Milisegundos desde epoch
  // Falta: createdAt
}
```

**Resultado:** El timestamp es undefined o inválido

---

### 4. **Campos Faltantes**

**Backend envía campos que v2 NO usa:**

- `mediaType` (null)
- `mediaUrl` (null)
- `externalId` (no incluido)

**Frontend v2 espera campos que backend NO envía:**

- `status` (sent | delivered | read | error)
- `metadata` (record)

---

### 5. **Comparación de conversationId - Bug Principal**

**Chat v1:**

```typescript
// useChatSession.ts:252
if (payload.conversationId === activeConversation.id) {
  // Compara STRING === NUMBER (JavaScript lo maneja, pero es impreciso)
  // Si activeConversation.id es "123" o 123, podría no coincidir
}
```

**Chat v2:**

```typescript
// useSocketListeners.ts:25
socket.on('message:new', (message) => {
  useChatStore.getState().addMessage(message);
  // El mensaje tiene conversationId como STRING
  // addMessage intenta buscar por NUMBER
});
```

**Resultado:** Los mensajes NO se agregan a la conversación correcta

---

## 🔴 Resumen de Errores Encontrados

| Aspecto            | Backend Envía  | Frontend v2 Espera          | Chat v1 Maneja | Impacto                          |
| ------------------ | -------------- | --------------------------- | -------------- | -------------------------------- |
| **conversationId** | STRING `"123"` | NUMBER `123`                | SÍ (loose ==)  | ALTO - Mensajes no se muestran   |
| **senderType**     | `"OPERATOR"`   | Field `sender` no existe    | SÍ             | ALTO - Tipo de remitente perdido |
| **createdAt**      | ISO String     | Field `timestamp` no existe | SÍ             | MEDIO - Timestamp perdido        |
| **mediaType/Url**  | Present        | Not in schema               | SÍ             | BAJO - Multimedia no soportada   |
| **id**             | STRING `"123"` | NUMBER ← transforms         | SÍ             | BAJO - Se convierte OK           |

---

## 🛠️ Por qué Chat v1 SÍ funciona

1. **Acepta formato crudo del backend:** No transforma, solo tipea like `payload: { ... }`
2. **Comparación loose:** `"123" === activeConversation.id` funciona con coerción
3. **Batch delay:** Procesa mensajes en cola después de 500ms, permitiendo que el UI se estabilice
4. **No valida schema:** Acepta cualquier estructura que tenga los campos necesarios

---

## 🛠️ Por qué Chat v2 FALLA

1. **Validación stricta con Zod:** Rechaza valores que no coinciden exactamente
2. **Transformación esperada:** Espera que los valores ya estén en el tipo correcto
3. **Comparación strict:** `"123" !== 123` en Zustand (aunque transforma, el mismatch ocurre)
4. **addMessage falla:** Si conversationId no es número, no se agrega al store
5. **No hay fallback:** Si validación falla, no hay manejo de error robusto

---

## 🎯 Soluciones

### Opción A: Corregir en Backend (Correcto)

Cambiar `formatMessageRecord` para devolver tipos correctos:

```typescript
function formatMessageRecord(conversationId, message) {
  return {
    id: Number(message.id),
    conversationId: Number(BigInt(conversationId)), // ← Número
    sender: message.senderType.toLowerCase(), // "OPERATOR" → "operator"
    senderId: message.senderId,
    content: message.content,
    timestamp: message.createdAt.getTime(), // ISO → milisegundos
    mediaUrl: message.mediaUrl || undefined,
  };
}
```

### Opción B: Corregir en Frontend v2 (Rápido)

Normalizar el payload en el hook:

```typescript
socket.on('message:new', (payload) => {
  const normalized = {
    id: Number(payload.id),
    conversationId: Number(payload.conversationId),
    sender: payload.senderType.toLowerCase(),
    senderId: payload.senderId,
    content: payload.content,
    timestamp: new Date(payload.createdAt).getTime(),
  };
  useChatStore.getState().addMessage(normalized);
});
```

### Opción C: Actualizar Schema Zod (Flexible)

Aceptar formato backend y transformar:

```typescript
export const MessageSchema = z.object({
  id: z.union([z.number(), z.string()]).transform((val) => Number(val)),
  conversationId: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val)),
  sender: z.enum(['OPERATOR', 'CONTACT', 'BOT', 'user', 'bot', 'contact']),
  senderType: z.string().optional(),
  senderId: z.union([z.number(), z.string(), z.null()]),
  content: z.string(),
  timestamp: z.number().optional(),
  createdAt: z
    .string()
    .datetime()
    .transform((val) => new Date(val).getTime()),
  mediaType: z.string().nullable().optional(),
  mediaUrl: z.string().nullable().optional(),
});
```

---

## 🧹 Spaghetti Code Encontrado

**En `useChatSession.ts:252:**

```typescript
// ❌ CÓDIGO SPAGUETTI
if (payload.conversationId === activeConversation.id) {
  // Mezcla tipos (string vs number)
  // Comparación implícita de coerción
  // Sin validación de tipo explícita

  const newHistoryItem: HistoryItem = {
    // Mapeo manual de campos
    type: 'message',
    id: payload.id,
    conversationId: payload.conversationId,
    senderType: payload.senderType as 'CONTACT' | 'BOT' | 'OPERATOR', // ← CAST forzado
    senderId: payload.senderId ? Number(payload.senderId) : null, // ← Conversión ad-hoc
    content: payload.content,
    // ... más campos manualmente mapeados
  };

  messageQueueRef.current.push(newHistoryItem); // ← Batch ad-hoc
}
```

**Problemas:**

- No hay transformación centralizada
- Cast forzado (`as`) indica tipo incorrecto
- Conversión manual de `senderId` es error-prone
- Batch processing es workaround de problema subyacente

---

## ✅ Recomendación Final

**Usar Opción B + Opción C combinadas:**

1. **Actualizar socketSchemas.ts** para ser más flexible con transformaciones
2. **Actualizar useSocketListeners.ts v2** para normalizar antes de agregar
3. **Documentar formato esperado** en ambos backend y frontend

Esto permite que ambas versiones (v1 y v2) funcionen correctamente sin cambiar el backend.
