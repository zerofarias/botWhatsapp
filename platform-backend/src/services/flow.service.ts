// Tipado estricto y flexible para el contexto conversacional
export interface ConversationContext {
  lastMessage: string;
  previousNode: number | null;
  updatedAt: string;
  flowTransition?: 'advanced' | 'no_change';
  variables?: {
    [key: string]: string | number | boolean | object | null;
  };
  /** Indica si el sistema espera una respuesta del usuario en el nodo actual */
  waitingForInput?: boolean;
  /** Nombre de la variable donde se almacenará la respuesta del usuario (si aplica) */
  waitingVariable?: string | null;
}
// --- Lógica de transición de flujo conversacional ---
interface GetNextNodeAndContextInput {
  currentNodeId: number | null;
  message: string;
  context: any;
  botId: number | null;
  conversationId: bigint | string | number;
}

interface GetNextNodeAndContextOutput {
  nextNodeId: number | null;
  newContext: any;
}

/**
 * Determina el siguiente nodo y contexto según el mensaje recibido y el estado actual.
 * Implementa la lógica real de transición de flujo.
 */
export async function getNextNodeAndContext(
  input: GetNextNodeAndContextInput
): Promise<GetNextNodeAndContextOutput> {
  // Buscar el nodo actual y sus hijos
  let currentNode: FlowNode | null = null;
  if (input.currentNodeId) {
    // Obtener el árbol completo de nodos para el área/bot
    // (puedes ajustar el filtro según tu modelo de negocio)
    const flowTree = await listFlowTree({
      createdBy: typeof input.botId === 'number' ? input.botId : 1,
      areaId: undefined,
      includeInactive: false,
    });
    // Buscar el nodo actual en el árbol
    currentNode =
      flowTree
        .flatMap(flattenFlowTree)
        .find((node) => node.id === Number(input.currentNodeId)) ?? null;
  }

  // Buscar hijos del nodo actual (posibles siguientes nodos)
  let nextNode: FlowNode | null = null;
  if (currentNode && currentNode.children && currentNode.children.length > 0) {
    nextNode =
      currentNode.children.find((child: FlowNode) => {
        // Si el trigger es vacío o null, acepta cualquier mensaje
        if (!child.trigger || child.trigger.trim() === '') {
          return true;
        }
        return (
          typeof child.trigger === 'string' &&
          child.trigger.toLowerCase() === input.message.toLowerCase()
        );
      }) ?? null;
  }

  // Si no hay coincidencia, mantener el nodo actual
  const nextNodeId = nextNode ? nextNode.id : input.currentNodeId;

  // Actualizar el contexto con el mensaje y el nodo anterior
  const prevContext: ConversationContext = input.context ?? {};
  const newContext: ConversationContext = {
    ...prevContext,
    lastMessage: input.message,
    previousNode: input.currentNodeId,
    updatedAt: new Date().toISOString(),
    flowTransition:
      nextNodeId !== input.currentNodeId ? 'advanced' : 'no_change',
    variables: {
      ...prevContext.variables,
      // Aquí puedes agregar lógica para modificar variables según el mensaje
      // Ejemplo: sumar, validar texto, guardar flags, etc.
    },
  };

  return {
    nextNodeId,
    newContext,
  };
}

// Utilidad para aplanar el árbol de nodos
function flattenFlowTree(node: FlowNode): FlowNode[] {
  return [node, ...node.children.flatMap(flattenFlowTree)];
}
import { Prisma } from '@prisma/client';
import type { NodeType } from '../types/node-type.js';
import { prisma } from '../config/prisma.js';

// Simple cache para árboles de flujos
const flowTreeCache = new Map<
  string,
  { tree: FlowNode[]; timestamp: number }
>();
const CACHE_TTL = 60000; // 60 segundos

// Función auxiliar para generar clave de cache
function getCacheKey(
  createdBy: number,
  areaId: number | null | undefined,
  includeInactive: boolean
): string {
  return `flow_tree_${createdBy}_${areaId ?? 'null'}_${includeInactive}`;
}

// Función para invalidar cache de un usuario (cuando se modifica un flujo)
export function invalidateFlowCache(createdBy: number, areaId?: number | null) {
  for (const key of flowTreeCache.keys()) {
    if (key.startsWith(`flow_tree_${createdBy}`)) {
      // Si se especifica areaId, solo invalidar ese
      if (
        areaId !== undefined &&
        !key.includes(`_${areaId}_`) &&
        !key.includes(`_null_`)
      ) {
        continue;
      }
      flowTreeCache.delete(key);
    }
  }
}

const flowSelect = {
  id: true,
  name: true,
  trigger: true,
  message: true,
  type: true,
  parentId: true,
  areaId: true,
  orderIndex: true,
  metadata: true,
  isActive: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FlowSelect;

export type FlowNode = Prisma.FlowGetPayload<{
  select: typeof flowSelect;
}> & { children: FlowNode[] };

type ListFlowsOptions = {
  createdBy: number;
  areaId?: number | null;
  includeInactive?: boolean;
};

type FlowInput = {
  id?: number;
  name: string;
  message: string;
  type: NodeType;
  trigger?: string | null;
  parentId?: number | null;
  areaId?: number | null;
  orderIndex?: number | null;
  metadata?: Prisma.InputJsonValue | typeof Prisma.JsonNull | null;
  isActive?: boolean;
};

export async function listFlowTree({
  createdBy,
  areaId,
  includeInactive = false,
}: ListFlowsOptions): Promise<FlowNode[]> {
  // Verificar cache primero
  const cacheKey = getCacheKey(createdBy, areaId, includeInactive);
  const cached = flowTreeCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[listFlowTree] Using cached tree for key: ${cacheKey}`);
    return cached.tree;
  }

  console.log(
    `[listFlowTree] Cache miss or expired for key: ${cacheKey}. Fetching from DB...`
  );

  const flows = await prisma.flow.findMany({
    where: {
      createdBy,
      areaId: areaId ?? undefined,
      isActive: includeInactive ? undefined : true,
    },
    select: flowSelect,
  });

  console.log('[DEBUG] Raw flows from DB:', JSON.stringify(flows, null, 2));

  const flowsById: { [key: number]: FlowNode } = {};

  // First pass: create all node objects and map them by ID
  for (const flow of flows) {
    flowsById[flow.id] = { ...flow, children: [] };
  }

  const roots: FlowNode[] = [];

  // Second pass: link children to parents
  for (const flow of flows) {
    if (flow.parentId && flowsById[flow.parentId]) {
      flowsById[flow.parentId].children.push(flowsById[flow.id]);
    } else {
      roots.push(flowsById[flow.id]);
    }
  }

  // Sort children by orderIndex
  for (const flowId in flowsById) {
    flowsById[flowId].children.sort(
      (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
    );
  }

  // Sort roots by orderIndex
  roots.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  // Guardar en cache
  flowTreeCache.set(cacheKey, { tree: roots, timestamp: Date.now() });
  console.log(`[listFlowTree] Cached tree for key: ${cacheKey}`);

  return roots;
}

export async function findFlowById(id: number) {
  return prisma.flow.findUnique({
    where: { id },
    select: flowSelect,
  });
}

export async function saveFlow(createdBy: number, input: FlowInput) {
  if (input.id) {
    return prisma.flow.update({
      where: {
        id: input.id,
        createdBy,
      },
      data: {
        name: input.name,
        message: input.message,
        type: input.type,
        trigger: input.trigger ?? null,
        parentId: input.parentId ?? null,
        areaId: input.areaId ?? null,
        orderIndex: input.orderIndex ?? 0,
        isActive: input.isActive ?? true,
        ...(input.metadata !== undefined
          ? { metadata: input.metadata ?? Prisma.JsonNull }
          : {}),
      },
      select: flowSelect,
    });
  }

  return prisma.flow.create({
    data: {
      name: input.name,
      message: input.message,
      type: input.type,
      trigger: input.trigger ?? null,
      parentId: input.parentId ?? null,
      areaId: input.areaId ?? null,
      orderIndex: input.orderIndex ?? 0,
      metadata: input.metadata ?? Prisma.JsonNull,
      isActive: input.isActive ?? true,
      createdBy,
      botId: 1, // TODO: Make this dynamic based on user selection
    },
    select: flowSelect,
  });
}

export async function deleteFlow(createdBy: number, id: number) {
  const result = await prisma.flow.deleteMany({
    where: {
      id,
      createdBy,
    },
  });

  if (result.count === 0) {
    throw new Error('Flow not found or not authorized.');
  }

  return result;
}
