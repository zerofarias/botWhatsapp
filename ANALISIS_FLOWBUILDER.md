# Análisis Completo: FlowBuilder, API y Base de Datos

## 📋 Tabla de Contenidos

1. [FlowBuilder Frontend](#flowbuilder-frontend)
2. [API REST](#api-rest)
3. [Base de Datos](#base-de-datos)
4. [Flujo de Datos](#flujo-de-datos)
5. [Problemas Identificados](#problemas-identificados)
6. [Recomendaciones](#recomendaciones)

---

## 🎨 FlowBuilder Frontend

### Ubicación

- **Componente Principal**: `platform-frontend/src/views/FlowBuilder/FlowBuilder.tsx` (1389 líneas)
- **Toolbar**: `platform-frontend/src/components/flow-builder/FlowToolbar.tsx`
- **Editor de Nodos**: `platform-frontend/src/views/FlowBuilder/NodeEditor.tsx`
- **Tipos**: `platform-frontend/src/views/FlowBuilder/types.ts`
- **Estilos**: `platform-frontend/src/views/FlowBuilder/flow-builder.css`
- **API Cliente**: `platform-frontend/src/api/flows.ts`

### Funcionalidades Principales

#### 1. **Renderización de Nodos y Edges**

- Usa **ReactFlow** como librería base para el editor visual
- Soporta múltiples tipos de nodos:
  - `START`: Nodo inicial
  - `TEXT`: Mensajes de texto con opciones
  - `CONDITIONAL`: Nodos con evaluaciones condicionales
  - `DELAY`: Retraso de tiempo
  - `SCHEDULE`: Evaluación de horarios
  - `REDIRECT_BOT`: Transferencia a otro bot
  - `REDIRECT_AGENT`: Asignación a operador humano
  - `AI`: Integración con modelos de IA
  - `SET_VARIABLE`: Guardar variables en contexto
  - `END`: Finalización del flujo

#### 2. **Funciones Principales del Componente**

```typescript
// Cargar nodos y edges desde el backend
const loadNodesAndEdges = async () => {
  const graph = await getFlowGraph(botId);
  // Procesa nodes y edges desde response
};

// Agregar nuevo nodo
const addNode = (type: FlowNodeType) => {
  // Crea nodo con posición default y tipo seleccionado
};

// Guardar el grafo completo
const persistGraph = async () => {
  const payload: FlowGraphPayload = {
    botId,
    nodes: serializarNodos(),
    edges: serializarEdges(),
    deleteMissing: true,
  };
  await saveFlowGraph(payload);
};

// Actualizar nodo individual
const handleNodeUpdate = (node: FlowBuilderNode) => {
  // Modifica nodo en estado local
};

// Manejo de conexiones
const handleConnect = (connection: Connection) => {
  // Crea arista entre dos nodos
};
```

#### 3. **Normalización de Datos**

El FlowBuilder realiza **sanitización y normalización** de datos antes de persistir:

```typescript
// Sanitizar opciones de nodos TEXT
function sanitizeOptions(options?: FlowOption[]): FlowOption[] {
  - Valida IDs (genera UUID si no existen)
  - Limpia labels y triggers
  - Auto-genera trigger desde label si no existe
  - Valida targetId
}

// Normalizar nodos desde servidor
function normalizeNodeFromServer(node: SerializedNode): FlowBuilderNode {
  - Convierte tipos legacy (MENU → TEXT)
  - Genera estructuras discriminadas por tipo
  - Normaliza posiciones y configuraciones
  - Sanitiza settings de botones y listas
}

// Normalizar posiciones
function normalizePosition(position?: { x: number; y: number }): XYPosition {
  - Valida coordenadas finitas
  - Usa posición default si es inválida
}
```

#### 4. **Estado Interno**

```typescript
const [nodes, setNodes] = useState<FlowBuilderNode[]>([]);
const [edges, setEdges] = useEdgesState<FlowBuilderEdge>([]);
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
const [selectedNodeType, setSelectedNodeType] = useState<FlowNodeType>('TEXT');
const [loading, setLoading] = useState(false);
const [hasPendingChanges, setHasPendingChanges] = useState(false);
```

#### 5. **Efectos y Hooks**

- **useEffect**: Carga nodos/edges cuando cambia botId
- **useCallback**: Optimiza handleConnect, handleNodesDelete, etc.
- **useMemo**: Memoriza nodos renderizados después de procesar
- **useRef**: Referencia a ReactFlowInstance y nodos

---

## 🔌 API REST

### Ubicación Backend

- **Routes**: `platform-backend/src/routes/flows.ts`
- **Controllers**: `platform-backend/src/controllers/flow.controller.ts` (1444 líneas)
- **Client API**: `platform-frontend/src/api/flows.ts`

### Endpoints Principales

#### 1. **GET /flows/graph** - Recuperar Grafo Completo

```
Parámetro Query:
  - botId: number (requerido)

Validaciones:
  - Usuario autenticado
  - botId válido

Flujo:
  1. Obtiene todos los flows del usuario filtrados por botId
  2. Extrae metadata de cada flow (builder metadata)
  3. Construye array de nodos (nodes)
     - id: reactId (desde metadata o generado)
     - type: tipo del nodo
     - position: posición en canvas
     - data: información del nodo (label, message, options, evaluations, etc.)
  4. Obtiene conexiones (FlowConnection) entre flows
  5. Mapea conexiones a edges de ReactFlow
     - source: id del nodo origen
     - target: id del nodo destino
     - label: trigger de la conexión
  6. Devuelve { nodes, edges }

Respuesta Éxitosa (200):
{
  "nodes": [
    {
      "id": "flow-123",
      "type": "TEXT",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Bienvenida",
        "message": "Hola, ¿cómo puedo ayudarte?",
        "options": [
          {
            "id": "opt-1",
            "label": "Ventas",
            "trigger": "ventas",
            "targetId": "flow-456"
          }
        ],
        "evaluations": [
          {
            "id": "cond-1",
            "label": "Cliente VIP",
            "operator": "REGEX",
            "value": "\\b(vip|premium)\\b",
            "targetId": "flow-789"
          }
        ]
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "flow-123",
      "target": "flow-456",
      "label": "ventas",
      "data": {}
    }
  ]
}

Errores:
  - 401: No autenticado
  - 400: Error en procesamiento
```

#### 2. **POST /flows/save-graph** - Guardar Grafo Completo

```
Body Request:
{
  "botId": number,
  "nodes": [
    {
      "id": string (reactId),
      "type": string (tipo del nodo),
      "position": { x: number, y: number },
      "data": {
        "type": "TEXT|CONDITIONAL|START|...",
        "label": string,
        "message": string,
        "options": [
          {
            "id": string,
            "label": string,
            "trigger": string,
            "targetId": string
          }
        ],
        "evaluations": [
          {
            "id": string,
            "label": string,
            "operator": "EQUALS|CONTAINS|REGEX",
            "value": string,
            "targetId": string
          }
        ]
      }
    }
  ],
  "edges": [
    {
      "source": string (reactId),
      "target": string (reactId),
      "label": string (trigger)
    }
  ],
  "deleteMissing": boolean (opcional)
}

Validaciones:
  - Usuario autenticado
  - botId requerido y válido
  - Mínimo 1 nodo
  - Todos los nodos deben tener id, type y data

Procesamiento (persistGraph):
  1. Normaliza cada nodo del payload
     - Sanitiza options y conditions
     - Extrae configuraciones (buttonSettings, listSettings)
     - Construye metadata del builder
     - Genera o valida IDs únicos

  2. Crea/actualiza flows en BD
     - Si existe el flow (por reactId): UPDATE
     - Si no existe: CREATE
     - Guarda metadata completa en campo metadata (JSON)

  3. Crea/valida FlowConnections
     - Para cada edge: conecta fromId → toId
     - Valida que ambos flows existan
     - Guarda trigger en la conexión

  4. Si deleteMissing=true:
     - Elimina flows que no estén en el payload
     - Elimina conexiones no referenciadas

Respuesta Éxitosa (200):
{
  "success": true,
  "graph": {
    "nodes": [ /* idem getFlowGraph */ ],
    "edges": [ /* idem getFlowGraph */ ]
  },
  "saved": number (cantidad de nodos guardados)
}

Errores:
  - 401: No autenticado
  - 400: Payload inválido o botId no existe
  - 500: Error en BD o transacción
```

### Información Adicional de Endpoints

#### 3. **GET /flows/:id** - Obtener nodo individual

```
Devuelve un flow específico por ID
Incluye metadata completa y relaciones
```

#### 4. **POST /flows** - Crear nodo individual

```
Puede usarse para crear nodos individuales
Pero la API unificada preferida es /flows/save-graph
```

#### 5. **DELETE /flows/:id** - Eliminar nodo individual

```
Elimina un flow por ID
También elimina conexiones asociadas
```

---

## 🗄️ Base de Datos (Prisma/MySQL)

### Modelo Relacional

#### **Tabla: flows**

```sql
CREATE TABLE flows (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(32),              -- START, TEXT, CONDITIONAL, etc.
  trigger VARCHAR(255),          -- Palabra clave para activar
  message LONGTEXT,              -- Contenido del mensaje
  parent_id INT,                 -- Jerarquía de flujos
  area_id INT,                   -- Área responsable
  order_index INT DEFAULT 0,     -- Orden de visualización
  metadata JSON,                 -- Configuración completa del nodo
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL,       -- Usuario que creó
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  bot_id INT NOT NULL,           -- Bot propietario

  FOREIGN KEY (parent_id) REFERENCES flows(id),
  FOREIGN KEY (area_id) REFERENCES areas(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (bot_id) REFERENCES bots(id),

  INDEX idx_flows_parent (parent_id),
  INDEX idx_flows_area (area_id),
  INDEX idx_flows_trigger (trigger),
  INDEX idx_flows_bot (bot_id),
  INDEX flows_created_by_fkey (created_by)
);
```

**Estructura del campo metadata (JSON):**

```json
{
  "builder": {
    "reactId": "flow-abc123",
    "position": { "x": 100, "y": 200 },
    "type": "TEXT",
    "width": 300,
    "height": 150,
    "options": [
      {
        "id": "opt-1",
        "label": "Opción 1",
        "trigger": "option1",
        "targetId": "flow-def456"
      }
    ],
    "conditions": [
      {
        "id": "cond-1",
        "label": "Si contiene 'ERROR'",
        "match": "ERROR",
        "matchMode": "CONTAINS",
        "operator": "CONTAINS",
        "targetId": "flow-ghi789"
      }
    ],
    "sourceVariable": "userData.status",
    "defaultLabel": "Otro...",
    "defaultTargetId": "flow-jkl012",
    "defaultConditionId": "cond-default",
    "messageType": "TEXT|BUTTONS|LIST",
    "buttonTitle": "Opciones",
    "buttonFooter": "Selecciona una",
    "listButtonText": "Seleccionar",
    "listTitle": "Menú",
    "listDescription": "Elige tu opción",
    "waitForResponse": true,
    "responseVariableName": "userChoice",
    "responseVariableType": "STRING",
    "audioModel": "google",
    "imageModel": "stable-diffusion",
    "saveResponseToVariable": "userChoice"
  }
}
```

#### **Tabla: flow_connections**

```sql
CREATE TABLE flow_connections (
  id INT PRIMARY KEY AUTO_INCREMENT,
  from_id INT NOT NULL,          -- Flow origen
  to_id INT NOT NULL,            -- Flow destino
  trigger VARCHAR(255),          -- Palabra clave que activa la conexión

  FOREIGN KEY (from_id) REFERENCES flows(id),
  FOREIGN KEY (to_id) REFERENCES flows(id),

  UNIQUE ux_flow_connections_pair (from_id, to_id),
  INDEX flow_connections_to_id_fkey (to_id)
);
```

#### **Tabla: bots**

```sql
CREATE TABLE bots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  initial_flow_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (initial_flow_id) REFERENCES flows(id),
  INDEX idx_bots_is_default (is_default)
);
```

#### **Tabla: conversations** (Relacionada)

```sql
CREATE TABLE conversations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_phone VARCHAR(20),
  contact_name VARCHAR(255),
  contact_id INT,
  area_id INT,
  assigned_to INT,               -- Operador asignado
  status ENUM('pending','active','paused','closed'),
  bot_active BOOLEAN DEFAULT TRUE, -- Si el bot está activo
  current_flow_node_id INT,      -- Nodo actual del flujo
  context LONGTEXT,              -- Estado del contexto conversacional
  bot_id INT,

  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  FOREIGN KEY (area_id) REFERENCES areas(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (bot_id) REFERENCES bots(id),

  INDEX idx_conversations_user_phone (user_phone),
  INDEX idx_conversations_status (status),
  INDEX idx_conversations_bot (bot_id)
};
```

---

## 🔄 Flujo de Datos (Completo)

### Ciclo 1: Carga del FlowBuilder

```
1. Usuario navega a /dashboard/bots/:botId
   ↓
2. FlowBuilder.tsx monta y dispara useEffect
   ↓
3. Llama: getFlowGraph(botId)
   ↓
4. API Frontend: GET /flows/graph?botId=123
   ↓
5. Backend: getFlowGraph controller
   - Obtiene flows: SELECT * FROM flows WHERE created_by=? AND bot_id=?
   - Obtiene conexiones: SELECT * FROM flow_connections WHERE from_id IN (...)
   - Procesa metadata de cada flow
   - Mapea flows → nodes (con reactId desde metadata)
   - Mapea flow_connections → edges
   ↓
6. Devuelve { nodes: [...], edges: [...] }
   ↓
7. FlowBuilder normaliza y establece estado:
   - setNodes(normalizeNodesFromServer(nodes))
   - setEdges(edges)
   ↓
8. ReactFlow renderiza el canvas con nodos y conexiones
```

### Ciclo 2: Editar un Nodo

```
1. Usuario hace click en un nodo
   ↓
2. onNodeClick dispara: setSelectedNodeId(node.id)
   ↓
3. NodeEditor aparece a la derecha (si selectedNode existe)
   ↓
4. Usuario modifica campos (label, message, options, etc.)
   ↓
5. onNodeChange handler actualiza estado:
   - const updatedNode = { ...selectedNode, data: { ...newData } }
   - setNodes([...nodes.filter(n => n.id !== id), updatedNode])
   ↓
6. Usuario hace click en "Guardar"
   ↓
7. handleNodeUpdate(updatedNode):
   - Actualiza en estado local
   - Marca hasPendingChanges = true
   - El nodo se muestra con indicador visual de cambio pendiente
```

### Ciclo 3: Crear Conexión

```
1. Usuario arrastra desde nodo A a nodo B
   ↓
2. ReactFlow dispara onConnect(connection)
   ↓
3. handleConnect valida:
   - Verifica que source y target existan
   - Verifica que no sea self-loop
   - Crea edge object: { id: uuid, source, target }
   ↓
4. setEdges([...edges, newEdge])
   ↓
5. hasPendingChanges = true
```

### Ciclo 4: Guardar Todo el Grafo

```
1. Usuario hace click en "Guardar" en FlowToolbar
   ↓
2. persistGraph() ejecuta:

   a) Serializa nodos:
      - Para cada nodo en state
      - Construye SerializedNode con id, type, position, data
      - Incluye todas las propiedades de data (options, evaluations, etc.)
      - Resultado: SerializedNode[]

   b) Serializa edges:
      - Para cada edge en state
      - Mapea a objeto { source, target, label }
      - Resultado: SerializedEdge[]

   c) Construye payload:
      {
        botId: selectedBotId,
        nodes: SerializedNode[],
        edges: SerializedEdge[],
        deleteMissing: true
      }

   ↓
3. POST /flows/save-graph con payload
   ↓
4. Backend saveFlowGraph controller:

   a) Valida usuario y botId

   b) Por cada nodo en payload:
      - Normaliza datos (sanitiza options, conditions, etc.)
      - Busca flow existente por metadata.builder.reactId
      - Si existe: UPDATE flows SET ...
      - Si no existe: CREATE flows
      - Guarda metadata completa en JSON
      - Registra flowId en nodeIdToFlowId map

   c) Por cada edge en payload:
      - Obtiene fromId y toId del map
      - Busca FlowConnection existente
      - Si existe: UPDATE
      - Si no existe: CREATE
      - Guarda trigger del edge

   d) Si deleteMissing:
      - Identifica flows en BD que NO están en payload
      - Elimina esos flows de la BD
      - Elimina connections asociadas

   ↓
5. Devuelve { success: true, graph: { nodes, edges }, saved: X }
   ↓
6. Frontend actualiza estado:
   - setHasPendingChanges(false)
   - Actualiza nodos/edges con respuesta
   - Muestra mensaje de éxito
```

---

## ⚠️ Problemas Identificados

### 1. **Duplicación de Nodos (Resolverflo.md)**

**Estado**: Documentado pero no completamente resuelto

**Síntoma**: Al recargar un flujo, los nodos aparecen duplicados en el frontend.

**Causa Potencial**:

- Backend está devolviendo nodos duplicados en getFlowGraph
- O frontend está procesando response sin filtrar duplicados
- Map `nodeIdToFlowId` en saveFlowGraph podría estar procesando dos veces algunos nodos

**Impacto**: UI confusa, usuario no sabe qué es el nodo real

---

### 2. **Edges START → TEXT No Persisten**

**Estado**: Problema activo

**Síntoma**:

- El payload enviado contiene la conexión START → TEXT
- Tras recargar, la conexión desaparece
- Solo persisten edges de opciones en nodos TEXT

**Causa Analizada**:

```typescript
// Backend solo devuelve edges DE FlowConnections
const edges = connections.map((conn): SerializedEdgeResponse | null => {
  const sourceId = flowIdToReactId.get(conn.fromId);
  const targetId = flowIdToReactId.get(conn.toId);
  if (!sourceId || !targetId) return null; // ← PROBLEMA
  return { id, source: sourceId, target: targetId, label, data };
});
```

Si el mapeo no tiene el `flowId` (caso del START que podría no estar en la BD), devuelve `null` y se filtra.

**Impacto**: Flujo conversacional se rompe, usuario no ve la conexión inicial

---

### 3. **Falta de Validación de Tipos Discriminados**

**Estado**: Parcialmente implementado

**Problema**:

- Los tipos de nodos son strings, no truly discriminated unions en BD
- Puede haber incosistencia entre flow.type y metadata.builder.type
- Frontend normaliza pero backend podría guardar inconsistencias

**Impacto**: Datos inconsistentes tras guardar/recargar

---

### 4. **Transacción Grande Puede Fallar Silenciosamente**

**Estado**: Parcialmente solucionado

**Código**:

```typescript
if (shouldUseTransaction && nodeCount <= flowGraphTransactionNodeLimit) {
  await prisma.$transaction(persistGraph);
} else {
  // Persiste sin transacción si es muy grande
  await persistGraph(prisma);
}
```

**Problema**:

- Si no usa transacción y falla a mitad, queda datos inconsistentes
- No hay rollback automático
- Usuario cree que guardó pero solo guardó parcialmente

---

### 5. **Falta de Versionado de Flujos**

**Estado**: No implementado

**Problema**:

- Si usuario realiza cambios, no hay forma de revertir a versión anterior
- Auditoría limitada (solo created_at, no historial de cambios)
- Riesgo de perder flujos complejos por error

---

### 6. **Contexto Conversacional No Sincronizado**

**Estado**: Estructura definida pero uso incompleto

```typescript
// En Conversation table:
context: String? @map("context") @db.LongText
currentFlowNodeId: Int?
```

**Problema**:

- El contexto se guarda pero no hay mécanica clara de cómo se actualiza durante conversación
- No hay serialización de estado de variables
- Transición de nodos podría no actualizar correctamente

**Impacto**: Flujos complejos con condiciones fallaran en runtime

---

### 7. **No Hay Validación de Ciclos en Grafo**

**Estado**: No implementado

**Problema**:

- Usuario puede crear loop infinito A → B → C → A
- En runtime causará loop infinito en el bot

---

### 8. **Metadatos JSON sin Esquema Fuerte**

**Estado**: Flexible pero arriesgado

```prisma
metadata Json? @db.Json  // Sin validación de esquema
```

**Problema**:

- Cualquier contenido puede guardarse en metadata
- Backend valida pero es permisivo
- Frontend podría corromper estructura

---

## ✅ Recomendaciones

### Corto Plazo (1-2 días)

#### 1. **Resolver Duplicación de Nodos**

```typescript
// En getFlowGraph backend:
const uniqueFlows = new Map<number, Flow>();
for (const flow of flows) {
  if (!uniqueFlows.has(flow.id)) {
    uniqueFlows.set(flow.id, flow);
  }
}
// Procesar solo uniqueFlows.values()
```

#### 2. **Persistir Todos los Edges**

```typescript
// Agregar lógica para edges sin FlowConnection explícita
// Generar edges desde metadata.builder.options.targetId
const derivedEdges = new Map<string, boolean>();
for (const node of nodes) {
  if (node.data.options) {
    for (const opt of node.data.options) {
      if (opt.targetId) {
        derivedEdges.set(`${node.id}→${opt.targetId}`, true);
      }
    }
  }
}
```

#### 3. **Validar Integridad de Datos**

```typescript
export async function validateFlowIntegrity(botId: number) {
  const flows = await prisma.flow.findMany({ where: { botId } });
  const issues: string[] = [];

  for (const flow of flows) {
    // Validar metadata.builder.reactId existe
    // Validar todos los targetIds resuelven a flows válidos
    // Validar no hay ciclos
  }

  return issues;
}
```

### Mediano Plazo (1 semana)

#### 4. **Implementar Versionado**

```prisma
model FlowVersion {
  id Int @id @default(autoincrement())
  flowId Int
  version Int
  data Json
  createdAt DateTime @default(now())
  flow Flow @relation(fields: [flowId], references: [id])
}
```

#### 5. **Añadir Validación de Ciclos**

```typescript
function detectCycles(nodes: Node[], edges: Edge[]): boolean {
  // Usar algoritmo DFS o topological sort
  // Retornar true si hay ciclos
}
```

#### 6. **Mejorar Auditoría**

```prisma
model FlowAudit {
  id Int @id @default(autoincrement())
  flowId Int
  userId Int
  action String  // "CREATE", "UPDATE", "DELETE"
  changes Json
  createdAt DateTime @default(now())
}
```

### Largo Plazo (2 semanas)

#### 7. **Validación de Esquema JSON**

```typescript
import Zod from 'zod';

const FlowMetadataSchema = z.object({
  builder: z.object({
    reactId: z.string(),
    position: z.object({ x: z.number(), y: z.number() }),
    type: z.enum(['TEXT', 'CONDITIONAL', 'START' /* ... */]),
    options: z.array(/* ... */),
  }),
});

// Validar antes de guardar
const validMetadata = FlowMetadataSchema.parse(metadata);
```

#### 8. **Suscripción en Tiempo Real**

```typescript
// WebSocket para sincronización en tiempo real
io.on('flow:updated', (botId, graph) => {
  // Notificar a todos los usuarios viendo ese bot
  // Sincronizar cambios sin necesidad de recargar
});
```

#### 9. **Simulador de Flujo**

```typescript
// Endpoint para simular un flujo
POST /flows/simulate
{
  "botId": 1,
  "startFlowId": 5,
  "userMessage": "Hola",
  "context": { /* estado actual */ }
}

Respuesta:
{
  "nextFlowId": 7,
  "botMessage": "¿En qué puedo ayudarte?",
  "updatedContext": { /* nuevo estado */ }
}
```

---

## 📊 Resumen de Capas

| Capa            | Responsabilidad                           | Tecnología                     | Archivos                               |
| --------------- | ----------------------------------------- | ------------------------------ | -------------------------------------- |
| **UI**          | Renderización visual, interacción usuario | React + ReactFlow + TypeScript | FlowBuilder.tsx, FlowToolbar.tsx       |
| **Cliente API** | Comunicación con backend                  | Axios                          | api/flows.ts                           |
| **Backend API** | Lógica de negocio, persistencia           | Express + Prisma               | controllers/flow.controller.ts         |
| **BD**          | Almacenamiento persistente                | MySQL                          | flows, flow_connections, conversations |

---

## 🎯 Conclusión

El FlowBuilder es un sistema robusto y bien estructurado, pero con algunos **problemas críticos** en:

1. Serialización/deserialización de grafo (duplicados, edges perdidos)
2. Falta de validación de integridad
3. Ausencia de versionado

Las **recomendaciones de corto plazo** (1-2 días) resolverían los problemas más críticos, mientras que las de **mediano/largo plazo** mejorarían la robustez y experiencia general.
