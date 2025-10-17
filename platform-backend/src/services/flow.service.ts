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
    orderBy: [{ parentId: 'asc' }, { orderIndex: 'asc' }, { id: 'asc' }],
    select: flowSelect,
  });

  const nodeMap = new Map<number, FlowNode>();
  const roots: FlowNode[] = [];

  flows.forEach((flow) => {
    nodeMap.set(flow.id, { ...flow, children: [] });
  });

  nodeMap.forEach((node) => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  });

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
