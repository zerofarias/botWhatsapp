# 🚀 Checklist de Validación - Duplicación de Nodos

## ✅ Fase 1: Verificar Compilación

- [ ] Backend compiló sin errores: `npm run build`
- [ ] Frontend compiló sin errores: `npm run build`
- [ ] Ambos servidores están corriendo:
  - [ ] Backend: http://localhost:4000
  - [ ] Frontend: http://localhost:5173

---

## ✅ Fase 2: Revisar Archivos Modificados

### Backend

```bash
cd c:\wppconnect2\platform-backend\dist\controllers
ls flow.controller.js  # Debe existir
```

Verificar que contiene:

- [ ] `[saveFlowGraph] NODOS RECIBIDOS DEL FRONTEND:`
- [ ] `[saveFlowGraph] Searching for reactId="`
- [ ] `[saveFlowGraph] UPDATING existing flow`
- [ ] `[saveFlowGraph] CREATING new flow`

### Frontend

```bash
cd c:\wppconnect2\platform-frontend\dist\assets
ls index-*.js  # Debe tener logging
```

Verificar que contiene:

- [ ] `[buildGraphPayload]` logs
- [ ] `[persistGraph]` logs
- [ ] Deduplicación local

---

## ✅ Fase 3: Test Básico - Primer Guardado

### Preparación

1. [ ] Abre http://localhost:5173/dashboard/bots
2. [ ] Abre DevTools: `F12` → Pestaña **Console**
3. [ ] Asegúrate que el filtro de logs esté en "All" (no "Errors")

### Test

1. [ ] Crea un nuevo nodo haciendo clic en "+ Bloque"
2. [ ] Configura:
   - [ ] Tipo: START
   - [ ] Label: "Nodo Test 1"
3. [ ] Haz clic en "Guardar" (arriba a la derecha)

### Validación - Console Browser

Deberías ver (en orden):

```
✓ [buildGraphPayload] ENVIANDO NODOS AL BACKEND:
✓ [persistGraph] Guardando payload: { botId: 1, nodes: 1, edges: 0 }
✓ [persistGraph] RESPUESTA DEL BACKEND:
✓ [persistGraph] ✓ Flujo guardado exitosamente
```

**Si ves algo diferente → ⚠️ Problema**

- [ ] ✓ Backend logs visibles
- [ ] ✓ No hay errores en Console

### Validación - Backend Console (Terminal)

En la terminal donde corre el backend, deberías ver:

```
[saveFlowGraph] NODOS RECIBIDOS DEL FRONTEND:
[saveFlowGraph] Node "XXXX-XXXX": flowId=null, found by flowId=false
[saveFlowGraph] Searching for reactId="XXXX-XXXX" among...
[saveFlowGraph] ✗ NO MATCH FOUND for reactId="XXXX-XXXX" - will CREATE new
[saveFlowGraph] CREATING new flow for node="XXXX-XXXX"
[saveFlowGraph] ✓ CREATED new flow id=1
```

- [ ] ✓ Dice "CREATED new flow" (esperado en primer guardado)
- [ ] ✓ Le asignó flowId

### Validación - Base de Datos

```bash
mysql -u root -p wppconnect_platform
```

Ejecuta:

```sql
SELECT id, name, type,
       JSON_EXTRACT(metadata, '$.builder.reactId') as reactId,
       created_at, updated_at
FROM flows WHERE bot_id = 1
ORDER BY id DESC;
```

Resultado esperado:

```
id | name         | type  | reactId | created_at | updated_at
1  | Nodo Test 1  | START | UUID-1  | 2025-10-31 | 2025-10-31
```

- [ ] ✓ Existe 1 flow
- [ ] ✓ Tiene reactId con UUID
- [ ] ✓ No hay duplicados

---

## ✅ Fase 4: Test Crítico - Segundo Guardado (UPDATE)

### Preparación

1. [ ] El nodo creado en Fase 3 está visible en el canvas
2. [ ] Abre nuevamente DevTools (F12)
3. [ ] Limpia Console anterior (si quieres): `console.clear()`

### Test

1. [ ] Haz clic en el nodo "Nodo Test 1" para editarlo
2. [ ] Cambia el label a "Nodo Test 1 - MODIFICADO"
3. [ ] Haz clic en "Guardar"

### Validación - Console Browser

Deberías ver:

```
✓ [buildGraphPayload] ENVIANDO NODOS AL BACKEND:
✓ [persistGraph] Guardando payload: { botId: 1, nodes: 1, edges: 0 }
✓ [persistGraph] ✓ Flujo guardado exitosamente
```

- [ ] ✓ Sin errores

### Validación - Backend Console (CRÍTICO)

En la terminal debe verse:

```
[saveFlowGraph] NODOS RECIBIDOS DEL FRONTEND:
[saveFlowGraph] Node "XXXX-XXXX": flowId=null, found by flowId=false
[saveFlowGraph] Searching for reactId="XXXX-XXXX" among 1 existing flows
  Candidate id=1: reactId="XXXX-XXXX"
  ✓ FOUND MATCH! Using existing flow id=1
[saveFlowGraph] UPDATING existing flow id=1 for node="XXXX-XXXX"
[saveFlowGraph] ✓ UPDATED flow id=1
```

**CRÍTICO:**

- [ ] ✓ Dice "✓ FOUND MATCH" (búsqueda funcionó)
- [ ] ✓ Dice "UPDATING" (actualiza en lugar de crear)
- [ ] ✓ flowId=1 (mismo de antes, no crea nuevo)

**❌ Si dice:**

```
[saveFlowGraph] ✗ NO MATCH FOUND for reactId="XXXX-XXXX" - will CREATE new
[saveFlowGraph] CREATING new flow for node="XXXX-XXXX"
```

→ **Problema en la búsqueda por reactId**

### Validación - Base de Datos

```sql
SELECT id, name, type,
       JSON_EXTRACT(metadata, '$.builder.reactId') as reactId,
       created_at, updated_at
FROM flows WHERE bot_id = 1
ORDER BY id DESC;
```

Resultado esperado:

```
id | name                        | type  | reactId | created_at | updated_at
1  | Nodo Test 1 - MODIFICADO    | START | UUID-1  | 2025-10-31 | 2025-10-31 ← ACTUALIZADO
```

- [ ] ✓ Sigue siendo 1 flow (no 2)
- [ ] ✓ `name` cambió
- [ ] ✓ `updated_at` cambió
- [ ] ✓ `id` sigue siendo 1 (no creó nuevo)

---

## ✅ Fase 5: Test Avanzado - Múltiples Nodos

### Test

1. [ ] Crea 2 nodos más:
   - [ ] "Nodo Test 2"
   - [ ] "Nodo Test 3"
2. [ ] Crea conexiones: Test 1 → Test 2 → Test 3
3. [ ] Guarda
4. [ ] Cierra y reabre FlowBuilder

### Validación - Console

- [ ] ✓ Al reabrir, los 3 nodos cargan sin duplicados

### Validación - BD

```sql
SELECT COUNT(DISTINCT JSON_EXTRACT(metadata, '$.builder.reactId')) as unique_nodes,
       COUNT(*) as total_flows,
       COUNT(*) - COUNT(DISTINCT JSON_EXTRACT(metadata, '$.builder.reactId')) as duplicados
FROM flows WHERE bot_id = 1;
```

Resultado esperado:

```
unique_nodes | total_flows | duplicados
3            | 3           | 0
```

- [ ] ✓ unique_nodes = 3
- [ ] ✓ duplicados = 0

---

## ✅ Fase 6: Diagnóstico - Si hay Duplicados

Si aún ves duplicados, ejecuta este diagnóstico:

### Paso 1: Revisar Backend Logs

```
Buscar: [saveFlowGraph] UPDATING vs [saveFlowGraph] CREATING

Si siempre dice CREATING:
  → La búsqueda por reactId NO está funcionando
```

### Paso 2: Verificar Metadata

```sql
SELECT id,
       JSON_PRETTY(JSON_EXTRACT(metadata, '$.builder')) as builder_metadata
FROM flows WHERE bot_id = 1
LIMIT 1;
```

**Buscar que tenga:**

```json
{
  "reactId": "XXXXXX-XXXX-...",
  "position": {...},
  "type": "START",
  ...
}
```

Si `reactId` es null → **el metadata no se guarda correctamente**

### Paso 3: Rastrear reactId

```sql
SELECT id,
       JSON_EXTRACT(metadata, '$.builder.reactId') as reactId,
       COUNT(*) as cantidad
FROM flows WHERE bot_id = 1
GROUP BY JSON_EXTRACT(metadata, '$.builder.reactId')
ORDER BY cantidad DESC;
```

**Buscar:**

- [ ] Múltiples flows con mismo reactId → **DUPLICADOS**
- [ ] Algunos flows sin reactId (NULL) → **PROBLEMA DE GUARDADO**

### Paso 4: Comparar Frontend vs Backend

```
En frontend Console ve qué reactId está enviando:
[buildGraphPayload] ENVIANDO NODOS AL BACKEND:
  [0] id="XXXXXX-XXXX-XXXX"

En BD verifica si se guardó:
SELECT JSON_EXTRACT(metadata, '$.builder.reactId') as reactId
FROM flows ORDER BY id DESC LIMIT 1;
Debería ser: XXXXXX-XXXX-XXXX
```

Si no coinciden → **hay transformación en el backend**

---

## 📊 Tabla de Decisión

| Resultado                                 | Significado          | Acción                                      |
| ----------------------------------------- | -------------------- | ------------------------------------------- |
| Guardado 1: CREATED, Guardado 2: UPDATING | ✅ CORRECTO          | Funciona, limpiar BD de antiguos duplicados |
| Siempre CREATING                          | ❌ Búsqueda falla    | Revisar extractBuilderMetadata()            |
| CREATING + duplicados en BD               | ❌ Problema critical | Ejecutar diagnóstico Paso 1-4               |
| Primer CREATE ok, segundo UPDATE ok       | ✅ CORRECTO          | Todo bien                                   |

---

## 🧹 Limpieza Final (Después de Verificar)

Si todo funciona pero hay duplicados antiguos:

```bash
# 1. BACKUP
mysql -u root -p wppconnect_platform < backup_flows.sql

# 2. Ejecutar limpieza
mysql -u root -p wppconnect_platform <<EOF
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
EOF

# 3. Verificar
mysql -u root -p wppconnect_platform <<EOF
SELECT COUNT(*) as duplicados
FROM flows f1, flows f2
WHERE f1.bot_id = 1
  AND f1.id < f2.id
  AND JSON_EXTRACT(f1.metadata, '$.builder.reactId') = JSON_EXTRACT(f2.metadata, '$.builder.reactId');
EOF
```

Resultado esperado: `duplicados: 0`

---

## ✅ Confirmación Final

Una vez todo validado:

- [ ] Guardado 1: CREATE (esperado)
- [ ] Guardado 2+: UPDATE (esperado)
- [ ] Sin duplicados en BD
- [ ] Console limpia sin errores
- [ ] Múltiples nodos funcionan sin problemas
- [ ] Recargar FlowBuilder sin duplicar

**🎉 Sistema funcionando correctamente**
