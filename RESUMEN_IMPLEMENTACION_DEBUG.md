# ✅ Resumen - Sistema de Debug e Implementación

## 🎯 Qué Se Implementó

### 1. **Logging Detallado en Backend** ✅

Agregado logging en `saveFlowGraph` para rastrear:

- Nodos recibidos del frontend
- Búsqueda por flowId
- Búsqueda por reactId en metadata
- Decisión UPDATE vs CREATE
- IDs de flows creados/actualizados

**Archivo modificado:** `platform-backend/src/controllers/flow.controller.ts`

### 2. **Logging Detallado en Frontend** ✅

Agregado logging en `buildGraphPayload` y `persistGraph` para:

- Nodos a enviar
- Detección de duplicados locales (filtro)
- Respuesta del backend
- Mapeo de reactId → flowId

**Archivo modificado:** `platform-frontend/src/views/FlowBuilder/FlowBuilder.tsx`

### 3. **Filtro de Deduplicación en Frontend** ✅

Implementado deduplicador que:

- Detecta si hay nodos duplicados en estado local
- Alerta si encuentra duplicados
- Solo envía nodos únicos al backend

```typescript
const nodeIds = new Set<string>();
const uniqueNodes: FlowBuilderNode[] = [];
for (const node of referenceNodes) {
  if (!nodeIds.has(node.id)) {
    uniqueNodes.push(node);
    nodeIds.add(node.id);
  } else {
    console.warn(`⚠️  Duplicado detectado localmente: id="${node.id}"`);
  }
}
```

### 4. **Búsqueda Mejorada en Backend** ✅

Implementada búsqueda por `reactId` en metadata para:

- Evitar crear duplicados
- Actualizar flows existentes correctamente
- Mantener relaciones intactas

```typescript
// Busca por flowId si existe
if (flowId) {
  /* UPDATE */
}
// Si no, busca por reactId en metadata
else if (nodeId) {
  // Recorre flows existentes
  // Compara metadata.builder.reactId === nodeId
  // Si encuentra → UPDATE
}
```

### 5. **Deduplicación en getFlowGraph** ✅

Implementada deduplicación en respuesta:

- Agrupa flows por reactId
- Mantiene solo el más reciente (ID más alto)
- Devuelve flows únicos al frontend

```typescript
const reactIdToFlow = new Map<string, (typeof flows)[0]>();
for (const flow of flows) {
  const reactId = builderMeta?.reactId ?? `flow-${flow.id}`;
  const existing = reactIdToFlow.get(reactId);
  // Mantener el flow con ID más alto (más reciente)
  if (!existing || flow.id > existing.id) {
    reactIdToFlow.set(reactId, flow);
  }
}
```

---

## 📊 Flujo Actual de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  1. Usuario crea/edita nodo                                │
│  2. buildGraphPayload() → Deduplicación local + Logging    │
│  3. persistGraph() → saveFlowGraph() + Logging             │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ [payload: { botId, nodes[], edges[] }]
              ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Express)                        │
│  1. saveFlowGraph() recibe payload                         │
│  2. Por cada nodo:                                          │
│     - Busca por data.flowId (si existe)                    │
│     - Si no encuentra, busca por reactId en metadata       │
│     - Si encuentra → UPDATE                                 │
│     - Si no encuentra → CREATE                             │
│  3. Devuelve { reactId → flowId } mappings                 │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ [response: { nodes: [{reactId, flowId}] }]
              ↓
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│  1. persistGraph() recibe response                         │
│  2. Actualiza estado local con flowId recibido            │
│  3. Siguiente guardado usará los flowId correctos         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Cómo Verificar

### Test 1: Primer Guardado

```bash
1. Abre http://localhost:5173/dashboard/bots
2. DevTools → Console (F12)
3. Crea nodo "Test"
4. Haz clic Guardar
5. Busca en Console:
   ✓ [buildGraphPayload] ENVIANDO NODOS
   ✓ [persistGraph] Guardando payload
   ✓ [persistGraph] ✓ Flujo guardado exitosamente
6. Verifica en BD: 1 flow con reactId=XX
```

### Test 2: Segundo Guardado (UPDATE)

```bash
1. Edita el nodo creado
2. Cambiar label/message
3. Haz clic Guardar
4. Busca en Backend Console:
   ✓ [saveFlowGraph] UPDATING existing flow id=1
   ✓ [saveFlowGraph] ✓ UPDATED flow id=1
5. Verifica en BD: Sigue siendo 1 flow, updated_at cambió
```

### Test 3: Verificar Sin Duplicados

```bash
mysql> SELECT JSON_EXTRACT(metadata, '$.builder.reactId') as reactId,
       COUNT(*) as cantidad
FROM flows WHERE bot_id = 1
GROUP BY JSON_EXTRACT(metadata, '$.builder.reactId')
HAVING COUNT(*) > 1;

Resultado esperado: (sin filas = sin duplicados)
```

---

## 📈 Análisis del Problema

### Antes (INCORRECTO):

```
Nodo recibido: { id: "flow-1", data: { label: "Test" } }
Backend: const flowId = data.flowId  // null
if (flowId) { UPDATE }
else { CREATE } // ← Siempre CREATE

Resultado: Cada guardado crea nuevo flow
           - Guardado 1 → flowId=1
           - Guardado 2 → flowId=2
           - Guardado 3 → flowId=3
```

### Después (CORRECTO):

```
Nodo recibido: { id: "flow-1", data: { label: "Test" } }
Backend: const flowId = data.flowId  // null
        if (!flowId) buscar por reactId en metadata
        Encuentra flow donde metadata.builder.reactId == "flow-1"
        UPDATE flow con id=1

Resultado: Solo 1 flow actualizado
           - Guardado 1 → flowId=1
           - Guardado 2 → flowId=1 (ACTUALIZADO)
           - Guardado 3 → flowId=1 (ACTUALIZADO)
```

---

## 🔧 Compilación

### Backend

```bash
cd c:\wppconnect2\platform-backend
npm run build
✓ Build exitoso
```

### Frontend

```bash
cd c:\wppconnect2\platform-frontend
npm run build
✓ Build exitoso
```

---

## 📁 Archivos Modificados

| Archivo                                                   | Cambios                                 |
| --------------------------------------------------------- | --------------------------------------- |
| `platform-backend/src/controllers/flow.controller.ts`     | Búsqueda por reactId, logging detallado |
| `platform-frontend/src/views/FlowBuilder/FlowBuilder.tsx` | Logging, deduplicación local, filtro    |

---

## ✨ Características Nuevas

1. **Console Logging Extenso**: Rastrear cada paso del guardado
2. **Deduplicación Local**: Filtrar duplicados antes de enviar
3. **Búsqueda Mejorada**: Buscar por reactId en metadata
4. **UPDATE Automático**: No crea duplicados, actualiza flows existentes
5. **Respuesta Mejorada**: Devuelve flowId para sincronizar estado

---

## 🎯 Próximos Pasos (Recomendado)

1. **Hacer debug con los logs**

   - Seguir la guía en `GUIA_DEBUG_DUPLICACION.md`
   - Verificar que funcionan UPDATE en lugar de CREATE

2. **Si sigue habiendo duplicados:**

   - Ejecutar scripts SQL de diagnóstico
   - Revisar si `metadata.builder.reactId` se está guardando
   - Verificar que `extractBuilderMetadata()` funciona correctamente

3. **Limpiar BD** (después de verificar que funciona)
   - Ejecutar script SQL de limpieza
   - Eliminar flows duplicados manteniendo el más reciente

---

## 📞 Soporte

Si necesitas ayuda:

1. Revisa `GUIA_DEBUG_DUPLICACION.md` para debugging
2. Ejecuta los scripts SQL en `DEBUG_DUPLICACION.md`
3. Comparte los logs de Console y Backend
