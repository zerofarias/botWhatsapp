# 🐛 Guía Completa de Debug - Duplicación de Nodos

## 🔧 Sistema de Logging Implementado

Se ha implementado un sistema completo de logging en 3 niveles:

### 1. **Frontend Console** (DevTools)

```
[buildGraphPayload] ENVIANDO NODOS AL BACKEND:
  [0] id="flow-1" type="START" flowId=undefined
  [1] id="flow-2" type="TEXT" flowId=undefined

[persistGraph] Guardando payload: { botId: 1, nodes: 2, edges: 0 }
[persistGraph] RESPUESTA DEL BACKEND: { success: true, nodes: 2 }
[persistGraph] Node mappings recibidos:
  reactId="flow-1" → flowId=1
  reactId="flow-2" → flowId=2
```

### 2. **Backend Console** (Terminal)

```
[saveFlowGraph] NODOS RECIBIDOS DEL FRONTEND:
  [0] id="flow-1" type="START" flowId=undefined
  [1] id="flow-2" type="TEXT" flowId=undefined

[saveFlowGraph] Node "flow-1": flowId=null, found by flowId=false
[saveFlowGraph] Searching for reactId="flow-1" among 2 existing flows
  Candidate id=1: reactId="flow-1"
  ✓ FOUND MATCH! Using existing flow id=1
[saveFlowGraph] UPDATING existing flow id=1 for node="flow-1"
[saveFlowGraph] ✓ UPDATED flow id=1

[saveFlowGraph] Node "flow-2": flowId=null, found by flowId=false
[saveFlowGraph] Searching for reactId="flow-2" among 2 existing flows
  Candidate id=2: reactId="flow-2"
  ✓ FOUND MATCH! Using existing flow id=2
[saveFlowGraph] UPDATING existing flow id=2 for node="flow-2"
[saveFlowGraph] ✓ UPDATED flow id=2
```

### 3. **Base de Datos** (MySQL)

```sql
-- Ver todos los flows con su reactId
SELECT id, name, type, created_at, updated_at,
       JSON_EXTRACT(metadata, '$.builder.reactId') as reactId
FROM flows WHERE bot_id = 1
ORDER BY id;

-- Encontrar duplicados
SELECT JSON_EXTRACT(metadata, '$.builder.reactId') as reactId,
       COUNT(*) as cantidad, GROUP_CONCAT(id) as ids
FROM flows WHERE bot_id = 1
GROUP BY JSON_EXTRACT(metadata, '$.builder.reactId')
HAVING COUNT(*) > 1;
```

---

## 🚀 Cómo Hacer Debug

### Paso 1: Abrir la Consola del Navegador

1. Abre `http://localhost:5173/dashboard/bots`
2. Presiona `F12` (o Ctrl+Shift+I)
3. Ve a la pestaña **Console**

### Paso 2: Crear/Editar un Nodo y Guardar

1. Crea un nuevo nodo (ej: "Inicio")
2. Haz clic en **Guardar**
3. Observa los logs en la consola del navegador

**Verás logs tipo:**

```
[buildGraphPayload] ENVIANDO NODOS AL BACKEND:
  [0] id="flow-1" type="START" flowId=undefined
[persistGraph] Guardando payload: { botId: 1, nodes: 1, edges: 0 }
```

### Paso 3: Revisar Backend Console

En la terminal donde corre el backend, verás:

```
[saveFlowGraph] NODOS RECIBIDOS DEL FRONTEND:
[saveFlowGraph] Node "flow-1": flowId=null, found by flowId=false
[saveFlowGraph] CREATING new flow for node="flow-1"
```

### Paso 4: Verificar BD

Ejecuta en MySQL Workbench o CLI:

```sql
SELECT id, name, type,
       JSON_EXTRACT(metadata, '$.builder.reactId') as reactId,
       created_at, updated_at
FROM flows
WHERE bot_id = 1
ORDER BY JSON_EXTRACT(metadata, '$.builder.reactId'), id;
```

**Resultado esperado (primer guardado):**

```
id | name   | type | reactId  | created_at | updated_at
1  | Inicio | START| flow-1   | 2025-10-31 | 2025-10-31
```

**Resultado esperado (segundo guardado - UPDATE):**

```
id | name   | type | reactId  | created_at | updated_at
1  | Inicio | START| flow-1   | 2025-10-31 | 2025-10-31 ← ACTUALIZADO (no crea nuevo)
```

**Resultado CON DUPLICADOS (PROBLEMA):**

```
id | name   | type | reactId  | created_at | updated_at
1  | Inicio | START| flow-1   | 2025-10-31 | 2025-10-31
2  | Inicio | START| flow-1   | 2025-10-31 | 2025-10-31 ← DUPLICADO
3  | Inicio | START| flow-1   | 2025-10-31 | 2025-10-31 ← TRIPLICADO
```

---

## 🔍 Logs Clave a Buscar

### ✅ FUNCIONANDO CORRECTAMENTE:

```
[saveFlowGraph] UPDATING existing flow id=1
[saveFlowGraph] ✓ UPDATED flow id=1
```

### ❌ PROBLEMA - CREANDO DUPLICADOS:

```
[saveFlowGraph] CREATING new flow for node="flow-1"
[saveFlowGraph] ✓ CREATED new flow id=2
[saveFlowGraph] CREATING new flow for node="flow-1"
[saveFlowGraph] ✓ CREATED new flow id=3
```

### ⚠️ BÚSQUEDA FALLIDA:

```
[saveFlowGraph] Searching for reactId="flow-1" among 2 existing flows
  ✗ NO MATCH FOUND for reactId="flow-1" - will CREATE new
```

---

## 📊 Script SQL de Diagnóstico Completo

```sql
-- 1. Ver todos los flows
SELECT 'Todos los flows' as resultado;
SELECT id, name, type,
       JSON_EXTRACT(metadata, '$.builder.reactId') as reactId,
       created_at, updated_at
FROM flows WHERE bot_id = 1
ORDER BY JSON_EXTRACT(metadata, '$.builder.reactId'), id;

-- 2. Detectar duplicados
SELECT 'Nodos duplicados' as resultado;
SELECT JSON_EXTRACT(metadata, '$.builder.reactId') as reactId,
       COUNT(*) as cantidad,
       GROUP_CONCAT(id SEPARATOR ',') as ids
FROM flows WHERE bot_id = 1
GROUP BY JSON_EXTRACT(metadata, '$.builder.reactId')
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- 3. Ver conexiones
SELECT 'Conexiones (edges)' as resultado;
SELECT fc.id, fc.from_id, f1.name as from_name,
       fc.to_id, f2.name as to_name, fc.trigger
FROM flow_connections fc
LEFT JOIN flows f1 ON fc.from_id = f1.id
LEFT JOIN flows f2 ON fc.to_id = f2.id
WHERE f1.bot_id = 1 OR f2.bot_id = 1
ORDER BY fc.id;

-- 4. Total de nodos por bot
SELECT 'Resumen por bot' as resultado;
SELECT bot_id, COUNT(*) as total_flows,
       COUNT(DISTINCT JSON_EXTRACT(metadata, '$.builder.reactId')) as unique_reactIds,
       COUNT(*) - COUNT(DISTINCT JSON_EXTRACT(metadata, '$.builder.reactId')) as duplicados
FROM flows
GROUP BY bot_id;
```

---

## 🧹 Limpiar Duplicados (SI ES NECESARIO)

**⚠️ IMPORTANTE: Haz BACKUP primero**

```sql
-- PASO 1: BACKUP
CREATE TABLE flows_backup_2025_10_31 AS
SELECT * FROM flows WHERE bot_id = 1;

-- PASO 2: Verificar duplicados
SELECT JSON_EXTRACT(metadata, '$.builder.reactId') as reactId,
       COUNT(*) as cantidad, GROUP_CONCAT(id) as ids
FROM flows WHERE bot_id = 1
GROUP BY JSON_EXTRACT(metadata, '$.builder.reactId')
HAVING COUNT(*) > 1;

-- PASO 3: ELIMINAR duplicados (mantiene el más reciente)
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

-- PASO 4: Verificar que se eliminaron
SELECT JSON_EXTRACT(metadata, '$.builder.reactId') as reactId,
       COUNT(*) as cantidad
FROM flows WHERE bot_id = 1
GROUP BY JSON_EXTRACT(metadata, '$.builder.reactId')
HAVING COUNT(*) > 1;
-- (Debe devolver 0 resultados)
```

---

## 📝 Checklist de Debug

- [ ] Abre DevTools (F12)
- [ ] Ve a Console
- [ ] Crea un nodo "Test"
- [ ] Haz clic en Guardar
- [ ] Mira los logs `[buildGraphPayload]` y `[persistGraph]`
- [ ] Busca si dice "UPDATING" o "CREATING"
- [ ] Revisa la terminal del backend
- [ ] Busca si dice "FOUND MATCH" o "will CREATE new"
- [ ] Ejecuta el script SQL para ver los flows en BD
- [ ] Verifica que NO haya duplicados

## 🎯 Resultado Esperado

**Primer guardado:**

- Console: `[persistGraph] ✓ Flujo guardado exitosamente`
- Backend: `✓ CREATED new flow id=1`
- BD: 1 flow con reactId="flow-1"

**Segundo guardado (editar):**

- Console: `[persistGraph] ✓ Flujo guardado exitosamente`
- Backend: `✓ UPDATED flow id=1` (no CREATE)
- BD: 1 flow con reactId="flow-1" (no duplicados)

Si ves CREATE en el segundo guardado → **hay un problema en la lógica de búsqueda**

---

## 🆘 Si Sigue Creando Duplicados

1. Ejecuta el script SQL de diagnóstico
2. Revisa los logs del backend
3. Busca: ¿dice "✓ FOUND MATCH"? o "✗ NO MATCH FOUND"?
4. Si es "NO MATCH FOUND" → la búsqueda por reactId no funciona
5. Posibles causas:
   - `metadata.builder.reactId` no está siendo guardado correctamente
   - El `nodeId` que llega del frontend es diferente del guardado
   - Problema en `extractBuilderMetadata()`

Para confirmar, ejecuta:

```sql
SELECT id,
       JSON_EXTRACT(metadata, '$.builder') as builder_completo,
       JSON_EXTRACT(metadata, '$.builder.reactId') as reactId
FROM flows WHERE bot_id = 1
LIMIT 1;
```

Si `reactId` está null o vacío → el metadata no se está guardando bien.
