import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { FlowType, Prisma } from '@prisma/client';
import {
  deleteFlow,
  listFlowTree,
  saveFlow,
} from '../services/flow.service.js';
import { prisma } from '../config/prisma.js';

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

function sanitizeStringValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function removeDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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

type GraphOption = {
  id: string;
  label: string;
  trigger: string;
  targetId: string | null;
};

type BuilderOption = {
  id?: string;
  label?: string;
  trigger?: string;
  targetId?: string | null;
};

type BuilderMetadata = {
  reactId?: string;
  position?: Record<string, unknown> | null;
  options?: BuilderOption[];
  messageType?: string;
  buttonTitle?: string | null;
  buttonFooter?: string | null;
  listButtonText?: string | null;
  listTitle?: string | null;
  listDescription?: string | null;
};

const DEFAULT_POSITION = { x: 160, y: 120 };
const DEFAULT_NODE_TYPE = 'default';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as Record<string, unknown>;
}

function extractBuilderMetadata(value: unknown): BuilderMetadata | null {
  const root = asRecord(value);
  if (!root) return null;

  const builderValue =
    'builder' in root ? (root as Record<string, unknown>).builder : undefined;
  const builder = asRecord(builderValue);
  if (!builder) return null;

  const position =
    builder.position && typeof builder.position === 'object'
      ? (builder.position as Record<string, unknown>)
      : null;

  const optionsRaw = Array.isArray(builder.options)
    ? (builder.options as unknown[])
    : [];

  const options: BuilderOption[] = [];
  optionsRaw.forEach((entry) => {
    const option = asRecord(entry);
    if (!option) return;
    options.push({
      id:
        typeof option.id === 'string' && option.id.length > 0
          ? option.id
          : undefined,
      label:
        typeof option.label === 'string' && option.label.length > 0
          ? option.label
          : undefined,
      trigger: typeof option.trigger === 'string' ? option.trigger : undefined,
      targetId:
        typeof option.targetId === 'string' && option.targetId.length > 0
          ? option.targetId
          : undefined,
    });
  });

  const messageType =
    typeof builder.messageType === 'string' ? builder.messageType : undefined;
  const buttonTitle = sanitizeStringValue(builder.buttonTitle);
  const buttonFooter = sanitizeStringValue(builder.buttonFooter);
  const listButtonText = sanitizeStringValue(builder.listButtonText);
  const listTitle = sanitizeStringValue(builder.listTitle);
  const listDescription = sanitizeStringValue(builder.listDescription);

  return {
    reactId:
      typeof builder.reactId === 'string' && builder.reactId.length > 0
        ? builder.reactId
        : undefined,
    position,
    options,
    messageType,
    buttonTitle,
    buttonFooter,
    listButtonText,
    listTitle,
    listDescription,
  };
}

function buildGraphOptionFromBuilder(option: BuilderOption): GraphOption {
  const sanitizedLabel = sanitizeStringValue(option.label) ?? '';

  const buildSlug = (value: string | null): string => {
    if (!value) return '';
    const base = removeDiacritics(value).toLowerCase();
    const normalized = base.replace(/[^a-z0-9]+/g, '_');
    const trimmed = normalized.replace(/^_+|_+$/g, '');
    if (trimmed.length) {
      return trimmed;
    }
    const fallback = base.replace(/\s+/g, '_');
    return fallback.length ? fallback : value.toLowerCase();
  };

  const pickTrigger = (): string => {
    const explicit = sanitizeStringValue(option.trigger);
    if (explicit) {
      const slug = buildSlug(explicit);
      return slug || explicit;
    }
    if (sanitizedLabel) {
      const slug = buildSlug(sanitizedLabel);
      if (slug) return slug;
      return sanitizedLabel;
    }
    if (option.id) {
      const idString = sanitizeStringValue(option.id) ?? String(option.id);
      const slug = buildSlug(idString);
      return slug || idString;
    }
    return `option_${crypto.randomUUID()}`;
  };

  const trigger = pickTrigger();

  return {
    id: option.id ?? crypto.randomUUID(),
    label: sanitizedLabel || trigger,
    trigger,
    targetId: option.targetId ?? null,
  };
}

function normalizeTriggerValue(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

type GraphNodePayload = {
  id: string;
  data?: {
    label?: unknown;
    message?: unknown;
    type?: unknown;
    options?: unknown;
    flowId?: unknown;
    isActive?: unknown;
    messageKind?: unknown;
    buttonSettings?: unknown;
    listSettings?: unknown;
  };
  position?: unknown;
  type?: unknown;
  width?: unknown;
  height?: unknown;
};

type GraphEdgePayload = {
  source?: string;
  target?: string;
  label?: unknown;
  data?: unknown;
};

const GRAPH_UNAUTHORIZED_ERROR = 'FLOW_GRAPH_UNAUTHORIZED';

function sanitizeOption(raw: unknown): GraphOption | null {
  if (!raw || typeof raw !== 'object') return null;
  const option = raw as Record<string, unknown>;
  const id =
    typeof option.id === 'string'
      ? option.id
      : option.id !== undefined
      ? String(option.id)
      : null;
  if (!id) return null;

  return {
    id,
    label: typeof option.label === 'string' ? option.label.trim() : '',
    trigger: typeof option.trigger === 'string' ? option.trigger.trim() : '',
    targetId:
      typeof option.targetId === 'string'
        ? option.targetId
        : option.targetId === null
        ? null
        : null,
  };
}

function normalizeGraphNode(raw: unknown): GraphNodePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const node = raw as Record<string, unknown>;
  const id =
    typeof node.id === 'string'
      ? node.id
      : node.id !== undefined
      ? String(node.id)
      : null;
  if (!id) return null;
  return node as GraphNodePayload;
}

function normalizeGraphEdge(raw: unknown): GraphEdgePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const edge = raw as Record<string, unknown>;
  if (typeof edge.source !== 'string' || typeof edge.target !== 'string') {
    return null;
  }
  return edge as GraphEdgePayload;
}

export async function saveFlowGraph(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const nodesPayload = Array.isArray(req.body?.nodes)
    ? (req.body.nodes as unknown[])
    : [];
  const edgesPayload = Array.isArray(req.body?.edges)
    ? (req.body.edges as unknown[])
    : [];
  const deleteMissing = req.body?.deleteMissing === true;

  if (!nodesPayload.length) {
    return res.status(400).json({ message: 'Graph payload is required.' });
  }

  try {
    const transactionResult = await prisma.$transaction(async (tx) => {
      const nodeIdToFlowId = new Map<string, number>();
      const sanitizedOptionsByNode = new Map<string, GraphOption[]>();
      const touchedFlowIds = new Set<number>();
      const responseNodes: Array<{ reactId: string; flowId: number }> = [];
      const incomingTriggerMap = new Map<string, Set<string>>();

      for (const entry of nodesPayload) {
        const normalized = normalizeGraphNode(entry);
        if (!normalized) continue;

        const nodeId = normalized.id;
        const data = normalized.data ?? {};

        const options = Array.isArray(data.options)
          ? (data.options as unknown[])
              .map(sanitizeOption)
              .filter((value): value is GraphOption => Boolean(value))
          : [];

        const triggerValue = null;

        const flowType =
          parseFlowType(data.type) ??
          parseFlowType((normalized.type as string) ?? '') ??
          'MENU';

        const label =
          typeof data.label === 'string' && data.label.trim().length
            ? data.label.trim()
            : 'Nodo sin título';
        const message = typeof data.message === 'string' ? data.message : '';
        const isActive =
          typeof data.isActive === 'boolean' ? data.isActive : true;

        const messageKindRaw =
          typeof data.messageKind === 'string'
            ? data.messageKind.toUpperCase()
            : 'TEXT';
        const messageType =
          messageKindRaw === 'BUTTONS' || messageKindRaw === 'LIST'
            ? messageKindRaw
            : 'TEXT';

        const buttonSettingsRecord = asRecord(data.buttonSettings);
        const buttonTitle = sanitizeStringValue(
          buttonSettingsRecord ? buttonSettingsRecord['title'] : undefined
        );
        const buttonFooter = sanitizeStringValue(
          buttonSettingsRecord ? buttonSettingsRecord['footer'] : undefined
        );

        const listSettingsRecord = asRecord(data.listSettings);
        const listButtonText = sanitizeStringValue(
          listSettingsRecord ? listSettingsRecord['buttonText'] : undefined
        );
        const listTitle = sanitizeStringValue(
          listSettingsRecord ? listSettingsRecord['title'] : undefined
        );
        const listDescription = sanitizeStringValue(
          listSettingsRecord ? listSettingsRecord['description'] : undefined
        );

        const metadataPayload: Prisma.InputJsonValue = {
          builder: {
            reactId: nodeId,
            position: normalized.position ?? null,
            type: normalized.type ?? 'default',
            width: normalized.width ?? null,
            height: normalized.height ?? null,
            options,
            messageType,
            buttonTitle: buttonTitle ?? null,
            buttonFooter: buttonFooter ?? null,
            listButtonText: listButtonText ?? null,
            listTitle: listTitle ?? null,
            listDescription: listDescription ?? null,
          },
        };

        const flowId =
          typeof data.flowId === 'number' && Number.isInteger(data.flowId)
            ? data.flowId
            : null;

        let recordId: number;

        if (flowId) {
          const existing = await tx.flow.findFirst({
            where: {
              id: flowId,
              createdBy: req.user!.id,
            },
            select: { id: true },
          });

          if (!existing) {
            const error = new Error(GRAPH_UNAUTHORIZED_ERROR);
            throw error;
          }

          const updated = await tx.flow.update({
            where: { id: existing.id },
            data: {
              name: label,
              message,
              trigger: triggerValue,
              type: flowType,
              orderIndex: 0,
              isActive,
              metadata: metadataPayload,
            },
            select: { id: true },
          });

          recordId = updated.id;
        } else {
          const created = await tx.flow.create({
            data: {
              name: label,
              message,
              trigger: triggerValue,
              type: flowType,
              orderIndex: 0,
              metadata: metadataPayload,
              isActive,
              createdBy: req.user!.id,
            },
            select: { id: true },
          });
          recordId = created.id;
        }

        nodeIdToFlowId.set(nodeId, recordId);
        sanitizedOptionsByNode.set(nodeId, options);
        touchedFlowIds.add(recordId);
        responseNodes.push({ reactId: nodeId, flowId: recordId });
        if (!incomingTriggerMap.has(nodeId)) {
          incomingTriggerMap.set(nodeId, new Set<string>());
        }
      }

      if (touchedFlowIds.size) {
        await tx.flowConnection.deleteMany({
          where: {
            fromId: {
              in: Array.from(touchedFlowIds),
            },
          },
        });
      }

      const optionLookup = new Map<
        string,
        { option: GraphOption; nodeId: string }
      >();
      sanitizedOptionsByNode.forEach((options, nodeId) => {
        options.forEach((option) => {
          optionLookup.set(option.id, { option, nodeId });
        });
      });

      const uniqueConnections = new Map<
        string,
        { fromId: number; toId: number; trigger: string }
      >();

      for (const entry of edgesPayload) {
        const normalized = normalizeGraphEdge(entry);
        if (!normalized) continue;

        const fromId = nodeIdToFlowId.get(normalized.source ?? '');
        const toId = nodeIdToFlowId.get(normalized.target ?? '');
        if (!fromId || !toId) continue;

        let trigger = '';

        if (
          normalized.data &&
          typeof normalized.data === 'object' &&
          'optionId' in normalized.data &&
          typeof (normalized.data as Record<string, unknown>).optionId ===
            'string'
        ) {
          const lookup = optionLookup.get(
            (normalized.data as Record<string, string>).optionId
          );
          if (lookup?.option?.trigger) {
            trigger = lookup.option.trigger.trim();
          } else if (lookup?.option?.label) {
            trigger = lookup.option.label.trim();
          }
        }

        if (!trigger && typeof normalized.label === 'string') {
          trigger = normalized.label.trim();
        }

        if (trigger.length > 0 && normalized.target) {
          const set =
            incomingTriggerMap.get(normalized.target) ?? new Set<string>();
          set.add(trigger);
          incomingTriggerMap.set(normalized.target, set);
        }

        const key = `${fromId}|${toId}|${trigger}`;
        if (!uniqueConnections.has(key)) {
          uniqueConnections.set(key, { fromId, toId, trigger });
        }
      }

      if (uniqueConnections.size) {
        await tx.flowConnection.createMany({
          data: Array.from(uniqueConnections.values()),
          skipDuplicates: true,
        });
      }

      if (incomingTriggerMap.size) {
        for (const [reactId, triggerSet] of incomingTriggerMap.entries()) {
          const flowId = nodeIdToFlowId.get(reactId);
          if (!flowId) continue;

          const triggers = Array.from(triggerSet)
            .map((value) => value.trim())
            .filter((value) => value.length > 0);
          const uniqueTriggers = Array.from(new Set(triggers));

          await tx.flow.update({
            where: { id: flowId },
            data: {
              trigger: uniqueTriggers.length ? uniqueTriggers.join(',') : null,
            },
          });
        }
      }

      let deletedFlowIds: number[] = [];

      if (deleteMissing) {
        const existingFlows = await tx.flow.findMany({
          where: { createdBy: req.user!.id },
          select: {
            id: true,
            metadata: true,
          },
        });

        const payloadReactIds = new Set(
          responseNodes.map((mapping) => mapping.reactId)
        );

        const flowsToDelete = existingFlows.filter((flow) => {
          const builderMeta = extractBuilderMetadata(flow.metadata);
          if (!builderMeta?.reactId) return false;
          return !payloadReactIds.has(builderMeta.reactId);
        });

        if (flowsToDelete.length) {
          const ids = flowsToDelete.map((flow) => flow.id);
          await tx.flowConnection.deleteMany({
            where: {
              OR: [{ fromId: { in: ids } }, { toId: { in: ids } }],
            },
          });
          await tx.flow.deleteMany({
            where: { id: { in: ids } },
          });
          deletedFlowIds = ids;
        }
      }

      return { nodes: responseNodes, deletedFlowIds };
    });

    return res.json({
      success: true,
      nodes: transactionResult.nodes,
      deletedFlowIds: transactionResult.deletedFlowIds,
    });
  } catch (error) {
    if (error instanceof Error && error.message === GRAPH_UNAUTHORIZED_ERROR) {
      return res.status(403).json({
        message: 'Attempted to update a flow that does not belong to the user.',
      });
    }

    console.error('Failed to save flow graph', error);
    return res
      .status(500)
      .json({ message: 'Failed to persist flow graph', error: String(error) });
  }
}

export async function getFlowGraph(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const flows = await prisma.flow.findMany({
      where: { createdBy: req.user.id },
      include: {
        outgoingConnections: {
          select: {
            id: true,
            toId: true,
            trigger: true,
          },
        },
      },
      orderBy: [{ id: 'asc' }],
    });

    const nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: {
        label: string;
        message: string;
        type: FlowType;
        options: GraphOption[];
        flowId: number;
        messageKind: 'TEXT' | 'BUTTONS' | 'LIST';
        buttonSettings?: { title?: string; footer?: string };
        listSettings?: {
          buttonText?: string;
          title?: string;
          description?: string;
        };
      };
    }> = [];
    const edges: Array<{
      id: string;
      source: string;
      target: string;
      label: string;
      data?: { optionId?: string };
    }> = [];

    const flowIdToReactId = new Map<number, string>();
    const flowIdToNodeIndex = new Map<number, number>();

    flows.forEach((flow, index) => {
      const builderMeta = extractBuilderMetadata(flow.metadata);
      const reactId =
        builderMeta?.reactId && builderMeta.reactId.length > 0
          ? builderMeta.reactId
          : `flow-${flow.id}`;

      const fallbackPosition = {
        x: DEFAULT_POSITION.x + (index % 4) * 180,
        y: DEFAULT_POSITION.y + Math.floor(index / 4) * 140,
      };

      let position = fallbackPosition;
      if (builderMeta?.position) {
        const positionRecord = builderMeta.position as Record<string, unknown>;
        const xValue = Number(positionRecord.x);
        const yValue = Number(positionRecord.y);
        if (Number.isFinite(xValue) && Number.isFinite(yValue)) {
          position = { x: xValue, y: yValue };
        }
      }

      const options =
        builderMeta?.options?.map((option) =>
          buildGraphOptionFromBuilder(option)
        ) ?? [];

      const messageTypeRaw =
        typeof builderMeta?.messageType === 'string'
          ? builderMeta.messageType.toUpperCase()
          : 'TEXT';
      const messageKind =
        messageTypeRaw === 'BUTTONS' || messageTypeRaw === 'LIST'
          ? messageTypeRaw
          : 'TEXT';

      const buttonSettings =
        (builderMeta?.buttonTitle && builderMeta.buttonTitle.length > 0) ||
        (builderMeta?.buttonFooter && builderMeta.buttonFooter.length > 0)
          ? {
              title: builderMeta?.buttonTitle ?? undefined,
              footer: builderMeta?.buttonFooter ?? undefined,
            }
          : undefined;

      const listSettings =
        (builderMeta?.listButtonText &&
          builderMeta.listButtonText.length > 0) ||
        (builderMeta?.listTitle && builderMeta.listTitle.length > 0) ||
        (builderMeta?.listDescription && builderMeta.listDescription.length > 0)
          ? {
              buttonText: builderMeta?.listButtonText ?? undefined,
              title: builderMeta?.listTitle ?? undefined,
              description: builderMeta?.listDescription ?? undefined,
            }
          : undefined;

      const nodeIndex =
        nodes.push({
          id: reactId,
          type: DEFAULT_NODE_TYPE,
          position,
          data: {
            label: flow.name,
            message: flow.message,
            type: flow.type,
            options,
            flowId: flow.id,
            messageKind,
            ...(buttonSettings ? { buttonSettings } : {}),
            ...(listSettings ? { listSettings } : {}),
          },
        }) - 1;

      flowIdToReactId.set(flow.id, reactId);
      flowIdToNodeIndex.set(flow.id, nodeIndex);
    });

    flows.forEach((flow) => {
      const sourceReactId = flowIdToReactId.get(flow.id);
      const nodeIndex = flowIdToNodeIndex.get(flow.id);
      if (!sourceReactId || nodeIndex === undefined) {
        return;
      }

      const optionMap = new Map(
        nodes[nodeIndex].data.options.map((option) => [
          normalizeTriggerValue(option.trigger),
          option,
        ])
      );

      flow.outgoingConnections.forEach((connection) => {
        const targetReactId = flowIdToReactId.get(connection.toId);
        if (!targetReactId) return;

        const normalizedTrigger = normalizeTriggerValue(connection.trigger);
        let option = optionMap.get(normalizedTrigger);

        if (!option) {
          option = {
            id: crypto.randomUUID(),
            label: connection.trigger ?? '',
            trigger: connection.trigger ?? '',
            targetId: targetReactId,
          };
          nodes[nodeIndex].data.options.push(option);
          optionMap.set(normalizedTrigger, option);
        } else {
          option.targetId = targetReactId;
          if (!option.label) {
            option.label = connection.trigger ?? '';
          }
          if (!option.trigger) {
            option.trigger = connection.trigger ?? '';
          }
        }

        edges.push({
          id: `edge-${flow.id}-${connection.toId}-${connection.id}`,
          source: sourceReactId,
          target: targetReactId,
          label: connection.trigger ?? '',
          data: option.id ? { optionId: option.id } : undefined,
        });
      });
    });

    return res.json({
      nodes,
      edges,
    });
  } catch (error) {
    console.error('Failed to load flow graph', error);
    return res
      .status(500)
      .json({ message: 'Failed to load flow graph', error: String(error) });
  }
}
