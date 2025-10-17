import type { Request, Response } from 'express';
import { FlowType, Prisma } from '@prisma/client';
import {
  deleteFlow,
  listFlowTree,
  saveFlow,
} from '../services/flow.service.js';

const allowedTypes: FlowType[] = [
  'MESSAGE',
  'MENU',
  'ACTION',
  'REDIRECT',
  'END',
];

function parseFlowType(value: unknown): FlowType | null {
  if (typeof value !== 'string') return null;
  const upper = value.toUpperCase() as FlowType;
  return allowedTypes.includes(upper) ? upper : null;
}

function normalizeMetadata(
  value: unknown
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  if (Array.isArray(value)) {
    return value as unknown as Prisma.InputJsonValue;
  }
  if (typeof value === 'object') {
    return value as unknown as Prisma.InputJsonValue;
  }
  return undefined;
}

export async function getFlows(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const areaId = req.query.areaId ? Number(req.query.areaId) : undefined;
  const includeInactive = req.query.includeInactive === 'true';

  const flows = await listFlowTree({
    createdBy: req.user.id,
    areaId: Number.isNaN(areaId) ? undefined : areaId,
    includeInactive,
  });

  return res.json(flows);
}

export async function createOrUpdateFlow(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const {
    id,
    name,
    message,
    type,
    trigger,
    parentId,
    areaId,
    orderIndex,
    metadata,
    isActive,
  } = req.body ?? {};

  const flowType = parseFlowType(type);
  if (!name || !message || !flowType) {
    return res.status(400).json({
      message: 'Name, message and a valid type are required.',
    });
  }

  const payload = await saveFlow(req.user.id, {
    id: typeof id === 'number' ? id : undefined,
    name,
    message,
    type: flowType,
    trigger: typeof trigger === 'string' ? trigger : null,
    parentId:
      typeof parentId === 'number'
        ? parentId
        : parentId === null
        ? null
        : undefined,
    areaId:
      typeof areaId === 'number' ? areaId : areaId === null ? null : undefined,
    orderIndex: typeof orderIndex === 'number' ? orderIndex : null,
    metadata: normalizeMetadata(metadata),
    isActive: typeof isActive === 'boolean' ? isActive : undefined,
  });

  return res.status(id ? 200 : 201).json(payload);
}

export async function removeFlow(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }

  try {
    await deleteFlow(req.user.id, id);
    return res.status(204).send();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to delete flow';
    return res.status(400).json({ message });
  }
}
