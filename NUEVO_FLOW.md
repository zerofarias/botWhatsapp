# Plan Detallado: Nuevo Flow Builder

> Objetivo: replicar la experiencia avanzada del builder tipo “brocoly” para nuestros flujos de WhatsApp, extendiendo la plataforma actual en etapas claras y verificables.

---

## Visión General

El Flow Builder debe permitir diseñar bots conversacionales complejos con los siguientes pilares:

1. **Nodos (Bloques) enriquecidos**: cada bloque tiene UI clara, soporte para captura de variables, multimedia y acciones avanzadas.
2. **Ramificación condicional**: nodos “Condicional” con múltiples salidas visuales, basados en variables almacenadas.
3. **Toolbar y ergonomía**: acciones globales (Crear Bloque, Guardar, Buscar por ID, Probar, Cargar media, Permisos, Generar QR).
4. **Persistencia robusta**: todo se serializa como grafo (`GET/POST /flows/graph`), asociando cada bloque a un `botId`.
5. **Experiencia tipo “brocoly”**: tarjetas con íconos, IDs visibles, conexión visual de salidas, edición contextual a la derecha.
6. **Contexto conversacional impecable**: el runtime debe saber siempre en qué bot y en qué nodo está cada conversación; cuando el usuario responde “1” se debe resolver contra el bloque actual para avanzar de forma determinista.

---

## Etapa 0 · Estado actual y brecha

- **Frontend**: `FlowBuilder.tsx` usa ReactFlow, persiste nodos/edges vía `/flows/graph`, pero los nodos TEXT no capturan variables ni tienen opciones “esperar respuesta”. Los condicionales no exponen múltiples salidas.
- **Backend**: Prisma guarda `Flow.metadata.builder.*`, pero `flow.type` se alineó a `NodeType`. Falta metadata para:
  - Variables capturadas (`waitingForInput`, `variableName`, tipo, modelos audio/imagen).
  - Condiciones (lista de reglas por nodo y relación con edges).
- **UX**: sin toolbar superior ni herramientas de gestión (buscar bloque, duplicar, acciones globales).

Brecha frente al objetivo:

1. No hay modelo de variables/condiciones persistido.
2. La UI no soporta puertos dinámicos ni conexión condicional.
3. No existe el panel superior (Volver, Probar, Cargar media, +Bloque, Permisos, Generar QR, Guardar).

---

### Avances recientes (2025-02-09)

- [x] START: reintroducimos la conexion inicial generando un edge directo cuando se enlaza el nodo de inicio; tambien se limpia cualquier edge previo del START para asegurar un unico camino de salida.
- [x] Persistencia: el fallback de handleConnect ahora llama saveFlowGraph con los nuevos edges, por lo que la relacion flowConnection queda guardada sin acciones manuales.
- [x] Captura de variables: NodeEditor/TextNodeForm obligan a declarar `flow_variable`, muestran la previsualizacion estilo Brocoly y normalizan `responseVariableName`.
- [x] Runtime (parcial): `processMessageAndAdvanceFlow` guarda la respuesta entrante en `conversation.context.variables[waitingVariable]` y libera `waitingForInput`.
- [ ] Contexto: falta alinear `node-execution.service.ts` y `saveFlowGraph` para que el grafo provea el siguiente nodo cuando una captura termina.

---

---

## Etapa 1 · Fundamentos de Captura de Variables

### 1.1 Modelo de Datos

- **Frontend types**: extender `TextNodeData` con:
  - `waitForResponse: boolean`
  - `responseVariableName: string`
  - `responseVariableType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON'`
  - `audioModel?: string`
  - `imageModel?: string`
- **Backend metadata**: en `saveFlowGraph`, serializar estos campos dentro de `metadata.builder`.
- **Runtime**: `ConversationContext` ya tiene `waitingForInput` / `waitingVariable`; integrar para que `TextNodeData.waitForResponse` actualice el contexto.

### 1.2 UI del Nodo Texto

- Toggle “Esperar respuesta”.
- Campos condicionales (nombre variable, tipo, modelos).
- Componente de preview similar al card de WhatsApp (ícono, mensaje, footer con “Espera… `flow_consultaCP`”).

### 1.3 Persistencia y Evaluación

- Al guardar el grafo, nodos con `waitForResponse` generan metadata.
- `message.service` o `node-execution.service` deben:
  - Pausar la conversación (`waitingForInput`).
  - Guardar la respuesta entrante en `context.variables[variableName]`.
  - Reactivar el flow, manteniendo `conversation.currentFlowNodeId` en sincronía para saber exactamente qué nodo del bot atiende el usuario antes de procesar cada entrada.

Deliverables de la etapa:

- Tipos actualizados.
- UI + NodeEditor soportando el toggle.
- Persistencia + runtime mínimo que guarda y consume la variable.

### 1.4 Plan de ejecucion inmediato

- [x] Tipos: alinear TextNodeData (frontend) y NodeType/DTOs (backend) con los campos de captura de variables y modelos. ✅ Validado: los tipos ya estaban listos y ahora normalizamos el guardado (`responseVariableName/saveResponseToVariable`) al actualizar el nodo.
- [x] UI/TextNodeForm: validar que `variableName` sea obligatorio cuando `waitForResponse` esta activo y agregar la tira “Esperar respuesta → flow\_<variable>” inspirada en Brocoly.
- [ ] Persistencia: confirmar que `saveFlowGraph` guarda `waitForResponse`, `responseVariableName`, `responseVariableType`, `audioModel` e `imageModel` dentro de `metadata.builder`.
- [x] Runtime: actualizar `message.service.ts` + `node-execution.service.ts` para establecer `conversation.currentFlowNodeId`, guardar la respuesta entrante en `context.variables[variableName]` y reanudar el grafo con esa variable disponible. (`processMessageAndAdvanceFlow` guarda la respuesta y el nuevo `executeNode` avanza usando `flow_connections` cuando ya se capturó la variable).
- [ ] QA manual: documentar en PLAN-FRONTEND.md el caso mensaje -> espera -> usuario responde -> variable persiste -> condicional usa variable.

---

## Etapa 2 · Condicionales con múltiples salidas

### 2.1 Modelo

- `ConditionalNodeData` debe incluir:
  - `sourceVariable: string`
  - `evaluations: Array<{ id: string; operator: 'EQUALS' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX'; value: string; label: string }>`
- `metadata.builder.conditions` almacenará esta lista. Cada evaluación tendrá un `id` para mapear edges.

### 2.2 UI/UX

- En el card condicional mostrar variable + filas con la etiqueta de cada condición.
- Cada fila será un puerto de salida con label (Ej: “Es igual a 1”).
- NodeEditor: form repetible (dropdown operador, input valor, label editable).
- Botón “Otro…” para salida default (sin condición).

### 2.3 ReactFlow

- Al sincronizar edges, generar puertos dinámicos:
  - `edge.data.conditionId = evaluation.id`.
  - Render custom handles (arriba/abajo) para cada condición.
- Visual: similar al screenshot, cada salida con su círculo y label.

### 2.4 Runtime

- `node-execution.service` debe evaluar `sourceVariable` contra cada condición en orden. Si no coincide, caer en “Otro” (si existe) o fallback.

Deliverables:

- Tipos + metadata.
- NodeEditor condicional con UI repetible.
- ReactFlow custom handles.
- Evaluación en backend.

### 2.5 Estado al 09/02

- [x] Persistencia: `saveFlowGraph` serializa `sourceVariable`, `evaluations[]`, `defaultConditionId`/`defaultTargetId` y guarda edges `cond:<id>` para mapear cada salida.
- [x] Runtime: `node-execution.service.ts` evalúa `context.variables[sourceVariable]`, soporta operadores (`=`, `!=`, `>`, `regex`, etc.) y cae al default si ninguna coincidencia aplica.
- [x] UI/Handles: el nodo condicional ahora es un custom node con handles etiquetados por evaluación y salida “Otro”, por lo que las conexiones se hacen visualmente como en Brocoly.
- [ ] QA manual: armar flujo TEXT (captura) → CONDICIONAL con múltiples salidas y validar desde la consola/WhatsApp que cada respuesta cae en la rama correcta.

---

## Etapa 3 · Toolbar y acciones globales

### 3.1 Toolbar

- Botones y acciones:
  - `Volver`: navegar al listado de bots.
  - `Probar`: abrir modal de test (ejecutar flow con inputs).
  - `Cargar media`: abre uploader (imágenes, audios).
  - `+ Bloque`: crea nodo según tipo seleccionado.
  - `Permisos`: configura colaboradores (opcional, scope futuro).
  - `Generar QR`: crea QR para iniciar conversación.
  - `Guardar`: forza `saveFlowGraph`.
- Buscar bloque por número: input que enfoque el nodo (scroll/zoom).

### 3.2 UX ajustes

- Mostrar ID/ReactId visible en cada card (como Brocoly: número en verde).
- Floating actions (duplicar, eliminar) en cada card.
- Mejora de la retícula (grid, zoom, minimapa adaptado).

Deliverables:

- Componente `FlowToolbar`.
- Hook para centrado/búsqueda por ID.
- Acciones conectadas con API existentes (media upload, etc.).

---

## Etapa 4 · Extensiones Multicanal

(Etapa futura, dependerá del roadmap)

1. **Integraciones IA**: configurar prompts por nodo, modelos específicos, fallback a agentes humanos.
2. **Bloque “Obtener variables de otro bot”**: reusar datos cross-bot.
3. **Permisos por bloque**: control granular para equipos.
4. **Comprobador de errores**: validación de flow antes de guardar (nodos sin salida, loops, etc.).

---

## Dependencias Técnicas

- **Prisma / DB**
  - `flow.metadata` almacena JSON, por lo que no se requieren migraciones adicionales. Sólo hay que documentar el esquema de `builder`.
  - Asegurarse de ejecutar `npx prisma generate` cada vez que se actualicen tipos.
- **Backend**
  - `saveFlowGraph` debe mapear todos los nuevos campos.
  - `node-execution.service` se amplía para manejar variables, condiciones y rutas específicas.
- **Frontend**
  - `FlowBuilder.tsx`, `types.ts`, `NodeEditor`, componentes específicos (por tipo).
  - ReactFlow: custom handles y estilos.

---

## Plan de Implementación (Resumen)

1. **Variables en textos** (Etapa 1)
   - Tipos + metadata + runtime.
   - UI en NodeEditor.
2. **Condicionales avanzados** (Etapa 2)
   - Modelo de condiciones, handles múltiples, evaluación backend.
3. **Toolbar + UX** (Etapa 3)
   - Acciones globales, búsqueda, UI polishing.
4. **Extras multicanal** (Etapa 4)
   - IA, cross-bot, permisos, validaciones.

Cada etapa debe incluir:

- Cambios en tipos (`types.ts`, `node-type.ts`, `controller.types.ts`).
- Ajustes en backend (controladores/servicios).
- UI (NodeEditor + FlowBuilder).
- Pruebas manuales y documentación en README/PLAN-FRONTEND.

---

## Próximos Pasos Inmediatos

1. Validar con el equipo si el alcance de Etapa 1 y 2 cubre las necesidades urgentes.
2. Crear tickets/historias por etapa (subdivididas en tasks técnicas).
3. Sincronizar con diseño para mockups del nuevo NodeEditor/Toolbar.
4. Definir pruebas de aceptación (captura de variable, evaluación condicional, guardado correcto).

---

Este documento debe acompañar la implementación para ir marcando el progreso por etapas y mantener alineado al equipo de frontend, backend y diseño.
