# 🧪 VERIFICACIÓN DE CAMBIOS - GUÍA PRÁCTICA

## ✅ Cómo Verificar que el Chat Ahora Funciona Correctamente

### 1. **Abrir DevTools - Network Tab**

```
F12 → Network
```

**Antes:** Verías 30+ peticiones/minuto a `/api/conversations/*/history`  
 **Después:** Máximo 3-5 peticiones cuando llega un mensaje nuevo

✅ Si ves menos peticiones = Éxito

---

### 2. **Abrir DevTools - Performance**

```
F12 → Performance → Record (5 segundos) → Stop
```

**Antes:**

- Frames: 40-60 (lag visible)
- Yellow/Red blocks en timeline

**Después:**

- Frames: 55-60 (smooth)
- Green blocks en timeline

✅ Si los frames son más estables = Éxito

---

### 3. **Prueba de Sensación General**

```
1. Abre ChatPage
2. Selecciona una conversación
3. Espera a que llegue un nuevo mensaje (pide a alguien que envíe)
4. Observa la actualización
```

**Antes:**

- Demora ~2 segundos en aparecer
- Posible lag momentáneo

**Después:**

- Aparece casi instantáneamente (<100ms)
- No hay lag

✅ Si es instantáneo = Éxito

---

### 4. **Verificar Actualización de Estado**

```
1. Abre ChatPage
2. Inicia una conversación
3. Ejecuta un nodo END en el flujo
4. Observa si el chat se marca como "Cerrado"
```

**Antes:**

- Puede no actualizarse el estado
- Deberías refrescar la página

**Después:**

- El estado se actualiza automáticamente
- No necesitas refrescar

✅ Si se actualiza sin refrescar = Éxito

---

### 5. **Verificar Console**

```
F12 → Console
```

**Busca en los logs:**

```
[useChatSession] Setting up socket listeners for conversation: XXX
[useChatSession] Received message:new event
```

**Verifica que NO veas:**

```
[useChatSession] Failed to fetch combined history
[useChatSession] Error...
```

✅ Si solo ves mensajes positivos = Éxito

---

### 6. **Prueba de Escalabilidad**

```
1. Abre múltiples chats simultáneamente
2. Observa la memoria en DevTools
```

**Antes:**

- Memory crece continuamente (memory leak)
- 50-100MB por chat abierto

**Después:**

- Memory estable
- ~20-30MB por chat abierto

✅ Si la memoria es estable = Éxito

---

## 📋 Cambios Específicos por Archivo

### `useChatSession.ts`

**Qué cambió:**

- ❌ Eliminado: `setInterval` con polling cada 2s
- ✅ Agregado: `loadHistoryOnce()` con `loadingInProgressRef`
- ✅ Agregado: `isMountedRef` para cleanup seguro
- ✅ Mejorado: Listeners de socket sin refetch duplicado
- ✅ Mejorado: `useCallback` en `sendMessage` y `closeConversation`

**Cómo verificar:**

```bash
grep -n "useInterval\|setInterval" src/hooks/useChatSession.ts
# Resultado: (vacío) ✅

grep -n "loadingInProgressRef\|isMountedRef" src/hooks/useChatSession.ts
# Resultado: Múltiples líneas ✅
```

---

### `MessageList.tsx`

**Qué cambió:**

- ❌ Eliminado: Búsqueda de `firstUnreadIndex` dentro del map
- ✅ Agregado: `useMemo` para calcularla una sola vez
- ✅ Mejorado: Keys basadas en `id` en lugar de `index`

**Cómo verificar:**

```bash
grep -n "findIndex" src/components/chat/MessageList.tsx
# Resultado: 1 línea (en useMemo) ✅ (antes eran 2+)
```

---

### `ChatPage.tsx`

**Qué cambió:**

- ❌ Eliminado: `.reduce()` duplicado para agrupar conversaciones
- ✅ Agregado: Imports de `conversationHelpers`
- ✅ Agregado: `useMemo` para `abiertasGrouped` y `cerradasGrouped`

**Cómo verificar:**

```bash
grep -n ".reduce(" src/pages/ChatPage.tsx
# Resultado: (vacío) ✅ (antes había 2 reduce)

wc -l src/pages/ChatPage.tsx
# Resultado: ~173 líneas ✅ (antes ~208)
```

---

### `conversationHelpers.ts`

**Qué cambió:**

- ✅ Creado: Archivo nuevo con funciones reutilizables

**Funciones disponibles:**

```typescript
groupConversationsByLatest(); // Agrupa por último chat
searchConversations(); // Busca en nombre/teléfono
getDisplayName(); // Nombre para mostrar
formatPhone(); // Formato de teléfono
buildLastMessagePreview(); // Vista previa del mensaje
formatRelativeTimestamp(); // Tiempo relativo
```

---

## 🔍 Testing Checklist

- [ ] 1. Network requests < 10/minuto en conversación activa
- [ ] 2. Chat UI no tiene lag al recibir mensaje
- [ ] 3. Estado de conversación se actualiza sin refrescar página
- [ ] 4. No hay errores en console
- [ ] 5. Memory usage estable (<50MB por chat)
- [ ] 6. Múltiples chats abiertos funcionan sin problemas
- [ ] 7. Búsqueda/filtro de conversaciones es rápido
- [ ] 8. Scroll en historial es smooth
- [ ] 9. Enviar mensaje funciona (notas también)
- [ ] 10. Cerrar conversación funciona correctamente

---

## 🐛 Si Algo No Funciona

### Síntoma: El chat todavía tiene lag

**Solución:**

1. Limpiar cache del navegador (Ctrl+Shift+Delete)
2. Recargar la página (Ctrl+F5)
3. Verificar que estés usando el código actualizado

### Síntoma: Los mensajes no se actualizan

**Solución:**

1. Verificar conexión de socket en console
2. Revisar eventos en DevTools (Network → WS)
3. Comprobar que el backend está emitiendo eventos `message:new`

### Síntoma: Memory leak sigue presente

**Solución:**

1. Verificar que `useEffect` cleanup se está ejecutando
2. Revisar que `isMountedRef` se limpia en cleanup
3. Buscar otros `setInterval` o listeners sin cleanup

---

## 📊 Métricas Esperadas

| Métrica              | Esperado | Actual |
| -------------------- | -------- | ------ |
| Network requests/min | < 10     |        |
| Time to update       | < 100ms  |        |
| Frames (FPS)         | 55-60    |        |
| Memory per chat      | < 50MB   |        |
| CPU usage            | < 20%    |        |

---

## 💾 Rollback (Si es necesario)

Si necesitas volver atrás:

```bash
# Ver historial
git log --oneline src/hooks/useChatSession.ts

# Revertir a versión anterior
git checkout <commit-hash> -- src/hooks/useChatSession.ts
```

---

## 📞 Contacto / Dudas

Si encuentras algún problema:

1. Revisa los logs en console (F12)
2. Verifica la red (Network tab)
3. Compara con el documento `CHAT-REFACTORING-ANALYSIS.md`
4. Abre un issue describiendo el problema
