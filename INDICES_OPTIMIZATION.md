# 📊 Índices para Optimización Backend

## Problema Identificado

El backend está lento porque en cada mensaje se ejecuta `listFlowTree()` que carga el árbol completo de flujos. Esto causa 15-20 segundos de latencia.

## Solución: Agregar Índices a Prisma

Actualizar `platform-backend/prisma/schema.prisma` con los siguientes índices:

### 1. **Message Table Indices**

```prisma
model Message {
  // ... existing fields ...

  // Optimize message queries
  @@index([conversationId, createdAt], map: "idx_messages_conv_date")
  @@index([senderType, createdAt], map: "idx_messages_sender_date")
  @@index([externalId], map: "idx_messages_external_id")
}
```

### 2. **Conversation Table Indices**

```prisma
model Conversation {
  // ... existing fields ...

  // Optimize conversation queries
  @@index([userPhone], map: "idx_conversations_phone")
  @@index([assignedToId, status], map: "idx_conversations_assigned_status")
  @@index([areaId], map: "idx_conversations_area")
  @@index([status, updatedAt], map: "idx_conversations_status_updated")
}
```

### 3. **Flow Table Indices**

```prisma
model Flow {
  // ... existing fields ...

  @@index([createdBy], map: "idx_flows_created_by")
  @@index([areaId], map: "idx_flows_area")
  @@index([active], map: "idx_flows_active")
}
```

### 4. **FlowNode Table Indices**

```prisma
model FlowNode {
  // ... existing fields ...

  @@index([flowId], map: "idx_flow_nodes_flow_id")
  @@index([flowId, order], map: "idx_flow_nodes_flow_order")
}
```

## Expected Performance Improvement

```
ANTES (sin índices):
- getNextNodeAndContext() → ~2000ms (full table scan)
- listFlowTree() → ~1500ms (full table scan)
- Total per message → 15-20 seconds

DESPUÉS (con índices):
- getNextNodeAndContext() → ~200ms (index scan)
- listFlowTree() → ~100ms (index scan)
- Total per message → <2 seconds
```

## Migration Steps

1. Update schema.prisma with indices above
2. Run: `npx prisma migrate dev --name add_performance_indices`
3. Test query performance in database
4. Update flow.service.ts cache invalidation

## Implementation

These indices will be added when creating the database migration in Phase 3.
