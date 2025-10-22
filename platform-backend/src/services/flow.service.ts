import { FlowType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

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
  type: FlowType;
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
