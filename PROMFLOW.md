# Prompt · Flow Builder (PROMFLOW)

## Contexto

El Flow Builder está enviando `saveFlowGraph` en cada acción (drag, connect, editar, duplicar, etc.) y **no propaga el `flowId`** que regresa el backend. Esto provoca:

- Se crean filas duplicadas en `flows` porque cada request llega sin `flowId`.
- El builder queda “en autosave” y genera cientos de registros aun cuando el usuario solo está editando.
- La toolbar flotante se posiciona en medio del lienzo, rompiendo la UX.

## Objetivo del cambio

1. Quitar el autosave y permitir guardado **solo** al presionar “Guardar”.
2. Mantener los `flowId` existentes para que cada nodo actualice su fila en DB.
3. Reubicar la toolbar fijo arriba para que no empuje el canvas.

## Estrategia Técnica

1. **Frontend**
   - `normalizeNodeFromServer` debe hidratar `data.flowId` y `parentId`.
   - Mantener `hasPendingChanges` y `isSaving`. Todas las operaciones (add node, update, connect, delete) solo modifican estado local y marcan dirty.
   - `persistGraph` se invoca únicamente desde el botón Guardar; después de `saveFlowGraph` sincroniza los `flowId` usando el payload `nodes` de la respuesta.
   - Ajustar CSS (`flow-toolbar`) para que sea sticky en top y no modifique el layout del flujo.
2. **Backend**
   - `saveFlowGraph` ya diferencia create/update en base a `data.flowId`; no tocar lógica salvo que falte algún campo requerido.
   - Mantener `metadata.builder.reactId` para que `getFlowGraph` pueda mapear ReactFlow IDs.
3. **Validación**
   - Construir (`npm run build`) para asegurarnos de que Front + Back compilan.
   - Probar manualmente el builder: mover nodos, crear un nuevo nodo, conectar, y verificar que solo se produzca un POST al pulsar Guardar y que los IDs se reciclen.

## Resultado Esperado

- Tabla `flows` contiene una sola fila por nodo ReactFlow.
- Botón Guardar queda habilitado cuando hay cambios pendientes y la toolbar se muestra fija arriba del lienzo.
- No más autosave silencioso ni múltiples POST durante la edición.
