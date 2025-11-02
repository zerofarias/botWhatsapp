# Script de Debug - Análisis de Duplicación de Nodos

## 1. Ver todos los flows del bot 1

```sql
SELECT
  id,
  name,
  type,
  message,
  created_at,
  updated_at,
  JSON_EXTRACT(metadata, '$.builder.reactId') as reactId,
  JSON_EXTRACT(metadata, '$.builder.type') as builder_type
FROM flows
WHERE bot_id = 1
ORDER BY JSON_EXTRACT(metadata, '$.builder.reactId'), id;
```

## 2. Encontrar reactIds duplicados

```sql
SELECT
  JSON_EXTRACT(metadata, '$.builder.reactId') as reactId,
  COUNT(*) as cantidad,
  GROUP_CONCAT(id SEPARATOR ',') as flowIds
FROM flows
WHERE bot_id = 1
GROUP BY JSON_EXTRACT(metadata, '$.builder.reactId')
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;
```

## 3. Ver detalles de un reactId específico

```sql
SELECT
  id,
  name,
  type,
  created_at,
  updated_at,
  JSON_EXTRACT(metadata, '$.builder.reactId') as reactId
FROM flows
WHERE bot_id = 1
  AND JSON_EXTRACT(metadata, '$.builder.reactId') = 'flow-1'
ORDER BY id DESC;
```

## 4. Ver metadata completa (para entender estructura)

```sql
SELECT
  id,
  name,
  JSON_PRETTY(metadata) as metadata_formatted
FROM flows
WHERE bot_id = 1
LIMIT 1;
```

## 5. Ver flow_connections para verificar referencias

```sql
SELECT
  fc.id,
  fc.from_id,
  f1.name as from_name,
  fc.to_id,
  f2.name as to_name,
  fc.trigger
FROM flow_connections fc
LEFT JOIN flows f1 ON fc.from_id = f1.id
LEFT JOIN flows f2 ON fc.to_id = f2.id
WHERE f1.bot_id = 1 OR f2.bot_id = 1
ORDER BY fc.id;
```

## 6. Verificar si hay flows "huérfanos" (sin conexiones)

```sql
SELECT
  id,
  name,
  type,
  created_at,
  JSON_EXTRACT(metadata, '$.builder.reactId') as reactId
FROM flows f
WHERE bot_id = 1
  AND id NOT IN (SELECT from_id FROM flow_connections WHERE from_id IN (SELECT id FROM flows WHERE bot_id = 1))
  AND id NOT IN (SELECT to_id FROM flow_connections WHERE to_id IN (SELECT id FROM flows WHERE bot_id = 1))
ORDER BY id DESC;
```

## 7. Limpiar duplicados manualmente (PELIGROSO - BACKUP PRIMERO!)

```sql
-- Primero, BACKUP
CREATE TABLE flows_backup AS SELECT * FROM flows WHERE bot_id = 1;

-- Después, eliminar duplicados manteniendo el más reciente
DELETE FROM flows
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY JSON_EXTRACT(metadata, '$.builder.reactId') ORDER BY id DESC) as rn
    FROM flows
    WHERE bot_id = 1
  ) t
  WHERE rn > 1
);
```

---

## Cómo Usar

1. Copia los comandos SQL que necesites
2. Ejecuta en MySQL Workbench o CLI
3. Analiza los resultados
4. Si quieres limpiar duplicados:
   - Primero BACKUP
   - Luego ejecuta el script 7 (DELETE)
   - Verifica con el script 2 que no hay más duplicados
