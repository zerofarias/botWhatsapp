# Solución: Problema de Duplicación de Nodos en FlowBuilder

## 🐛 Problema Original

Al guardar un flujo, se creaban nodos duplicados y triplicados. En la BD aparecían múltiples flows con el mismo `reactId` pero diferentes IDs:

```sql
id | name      | type | metadata (builder.reactId)
1  | Inicio    | START| "0395518a-9b37-481b-b73a..."
3  | Inicio    | START| "flow-1"
6  | Inicio    | START| "flow-3"
...
```

## 🔍 Causa Raíz

En el controller `saveFlowGraph`:

```typescript
// ANTES (INCORRECTO)
const flowId = typeof data.flowId === 'number' ? data.flowId : null;

if (flowId) {
  // UPDATE
} else {
  // CREATE nuevo - SIEMPRE CREA NUEVO
}
```

**El problema**: El frontend envía `id` (reactId) pero el backend buscaba `data.flowId` que nunca existe. Como siempre es `null`, **siempre hace CREATE en lugar de UPDATE**.

### Flujo Incorrecto:

1. Primera vez: crear flow con reactId="flow-1" → flowId=1
2. Segunda edición: frontend envía id="flow-1", backend no lo encuentra
3. Backend hace CREATE → nuevo flow con flowId=2
4. Tercera edición: CREATE nuevamente → flowId=3
5. **Resultado**: 3 flows duplicados con el mismo reactId

## ✅ Solución Implementada

### 1. **Búsqueda por ReactId en saveFlowGraph**

```typescript
// Primero intentar buscar por flowId si existe
let existing = flowId ? await client.flow.findFirst({...}) : null;

// Si no encuentra por flowId, buscar por reactId en metadata
if (!existing && nodeId) {
  const candidates: Array<{...}> = await client.flow.findMany({...});

  for (const candidate of candidates) {
    const builderMeta = extractBuilderMetadata(candidate.metadata ?? null);
    if (builderMeta?.reactId === nodeId) {
      existing = { id: candidate.id, botId: candidate.botId };
      break;
    }
  }
}

if (existing) {
  // ACTUALIZAR flow existente
  const updated = await client.flow.update({
    where: { id: existing.id },
    data: { name, message, type, metadata, ... }
  });
} else {
  // CREAR nuevo flow solo si no existe
  const created = await client.flow.create({...});
}
```

**Lógica**:

1. Busca por `data.flowId` (si lo envía el frontend)
2. Si no encuentra, busca comparando `metadata.builder.reactId === nodeId`
3. Si encuentra un flow existente: **UPDATE** (preserva el ID)
4. Si no existe: **CREATE** (nuevo flow)

### 2. **Deduplicación en getFlowGraph**

Agregué lógica para filtrar duplicados antes de devolver al frontend:

```typescript
// Deduplicar flows por reactId
const reactIdToFlow = new Map<string, (typeof flows)[0]>();

for (const flow of flows) {
  const builderMeta = extractBuilderMetadata(flow.metadata ?? null);
  const reactId = builderMeta?.reactId ?? `flow-${flow.id}`;

  const existing = reactIdToFlow.get(reactId);
  // Mantener el flow con ID más alto (más reciente)
  if (!existing || flow.id > existing.id) {
    reactIdToFlow.set(reactId, flow);
  }
}

const uniqueFlows = Array.from(reactIdToFlow.values());
```

**Lógica**:

1. Agrupa flows por `reactId`
2. Para cada reactId, mantiene solo el flow con ID más alto (más reciente)
3. Devuelve solo los flows únicos al frontend

---

## 📝 Cambios en el Código

### Archivo: `platform-backend/src/controllers/flow.controller.ts`

#### Cambio 1: saveFlowGraph (líneas ~1045-1120)

- ✅ Agregó búsqueda por reactId en metadata
- ✅ Implementó lógica UPDATE vs CREATE basada en búsqueda
- ✅ Tipo explícito: `Array<{...}>`

#### Cambio 2: getFlowGraph (líneas ~1322-1365)

- ✅ Agregó deduplicación por reactId
- ✅ Mantiene solo el flow más reciente para cada reactId
- ✅ Usa `reactIdToFlow` Map para tracking

---

## 🧪 Cómo Funciona Ahora

### Guardado (Primer guardado):

```
Frontend envía:
{
  botId: 1,
  nodes: [
    { id: "flow-1", type: "START", data: {...} }
  ]
}

Backend:
1. Busca flowId en data → null
2. Busca metadata.builder.reactId === "flow-1" → NOT FOUND
3. CREATE new flow con reactId="flow-1", flowId=1
4. Frontend recibe: { reactId: "flow-1", flowId: 1 }
```

### Guardado (Segundo guardado - ACTUALIZACIÓN):

```
Frontend envía:
{
  botId: 1,
  nodes: [
    {
      id: "flow-1",           ← mismo reactId
      type: "START",
      data: { label: "Inicio modificado" }
    }
  ]
}

Backend:
1. Busca flowId en data → null
2. Busca metadata.builder.reactId === "flow-1" → FOUND (flowId=1)
3. UPDATE flow donde id=1 con nuevos datos
4. Frontend recibe: { reactId: "flow-1", flowId: 1 }  ← mismo ID
```

**Resultado**: No hay duplicados, solo una actualización

---

## 🔧 Carga (getFlowGraph):

```
Si en BD existen flows duplicados (por error previo):
id | reactId  | builder.reactId
1  | (null)   | "flow-1"
2  | (null)   | "flow-1"  ← duplicado
3  | (null)   | "flow-1"  ← triplicado

getFlowGraph devuelve:
- Agrupa por reactId="flow-1"
- Mantiene el de id=3 (más reciente)
- Devuelve solo 1 nodo

Frontend ve un único nodo "flow-1"
```

---

## 🚀 Próximos Pasos (Recomendado)

### 1. **Limpiar BD de Duplicados** (Opcional pero recomendado)

```sql
-- Encontrar duplicados
SELECT metadata->'$.builder.reactId' AS reactId, COUNT(*)
FROM flows
WHERE bot_id = 1
GROUP BY metadata->'$.builder.reactId'
HAVING COUNT(*) > 1;

-- Eliminar duplicados, manteniendo el más reciente
DELETE FROM flows
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY JSON_EXTRACT(metadata, '$.builder.reactId') ORDER BY id DESC) as rn
    FROM flows
    WHERE bot_id = 1
  ) t
  WHERE rn > 1
);
```

### 2. **Añadir Índice para Búsqueda Más Rápida**

```sql
ALTER TABLE flows ADD INDEX idx_metadata_reactid (
  (JSON_EXTRACT(metadata, '$.builder.reactId'))
);
```

### 3. **Validación en Frontend**

Frontend ya recibe `flowId` en la respuesta de `saveFlowGraph`. Debería actualizar nodos locales:

```typescript
if (response?.nodes) {
  const idToFlowId = new Map(
    response.nodes.map(({ reactId, flowId }) => [reactId, flowId])
  );
  // Actualizar nodos con flowId recibido
}
```

---

## ✅ Validación

Para validar que funciona:

1. **Abrir FlowBuilder** en `http://localhost:5173/dashboard/bots`
2. **Crear un nodo** → Guardar → Verificar BD
3. **Editar el nodo** → Cambiar label/message → Guardar
4. **Verificar BD**: Debe haber solo 1 nodo con ese reactId
5. **Recargar** → Verificar que no hay duplicados en el canvas

---

## 📊 Resumen de la Fix

| Aspecto                          | Antes                                  | Después                                 |
| -------------------------------- | -------------------------------------- | --------------------------------------- |
| **Búsqueda de flows existentes** | Solo por `data.flowId`                 | Por flowId O reactId en metadata        |
| **Acción al guardar**            | Siempre CREATE                         | UPDATE si existe, CREATE si no          |
| **Duplicados en getFlowGraph**   | Devuelve todos (incluyendo duplicados) | Deduplica por reactId                   |
| **Resultado**                    | Multiplicación de nodos                | Un solo nodo, actualizado correctamente |

---

## 🎯 Conclusión

El problema estaba en la **falta de sincronización entre lo que el frontend envía (reactId) y lo que el backend buscaba (flowId)**.

Ahora:

- ✅ Backend busca por reactId en metadata
- ✅ Detecta flows existentes correctamente
- ✅ Hace UPDATE en lugar de CREATE
- ✅ getFlowGraph deduplica automáticamente
- ✅ No hay más nodos duplicados
