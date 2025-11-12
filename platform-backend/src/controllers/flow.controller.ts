// Listar todas las conexiones (edges) individuales
export async function listAllFlowEdges(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    // Obtener los IDs de los flows creados por el usuario
    const userFlows = await prisma.flow.findMany({
      where: { createdBy: req.user.id },
      select: { id: true },
    });
    const userFlowIds = userFlows.map((f) => f.id);
    if (userFlowIds.length === 0) {
      return res.json({ edges: [] });
    }
    const edges = await prisma.flowConnection.findMany({
      where: {
        fromId: { in: userFlowIds },
      },
      select: {
        id: true,
        fromId: true,
        toId: true,
        trigger: true,
      },
      orderBy: [{ id: 'asc' }],
    });
    // Formato compatible con frontend (ReactFlow)
    const serialized = edges.map((edge) => ({
      id: String(edge.id),
      source: String(edge.fromId),
      target: String(edge.toId),
      label: edge.trigger,
      data: {},
    }));
    return res.json({ edges: serialized });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Failed to list edges', error: String(error) });
  }
}
// Listar todos los nodos individuales (no árbol)
export async function listAllFlowNodes(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const nodes = await prisma.flow.findMany({
      where: { createdBy: req.user.id },
      orderBy: [{ id: 'asc' }],
    });
    return res.json({ nodes });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Failed to list nodes', error: String(error) });
  }
}
/*
 * @swagger
 * /flows:
 *   get:
 *     summary: Listar flujos
 *     tags:
 *       - Flujos
 *     responses:
 *       200:
 *         description: Lista de flujos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *   post:
 *     summary: Crear o actualizar flujo
 *     tags:
 *       - Flujos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Flujo creado o actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *       500:
 *         description: Error al crear/actualizar flujo
 */

import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { NodeType } from '../types/node-type';
import { env } from '../config/env';

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

/**
 * Limpia valores undefined recursivamente de un objeto
 */
function cleanUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefinedValues).filter((v) => v !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedValues(value);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Serializa un objeto a JSON string, limpiando valores undefined
 */
function serializeMetadata(metadata: any): string {
  const cleaned = cleanUndefinedValues(metadata);
  return JSON.stringify(cleaned);
}

// CRUD individual para nodos Flow
// import duplicado eliminado

export async function createFlowNode(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const {
    name,
    message,
    type,
    trigger,
    parentId,
    areaId,
    orderIndex,
    metadata: rawMetadata,
    isActive,
  } = req.body ?? {};

  // Sincronizar builder.type con el tipo real del nodo
  let metadata = rawMetadata;
  if (type === 'CONDITIONAL') {
    // Si el nodo es de tipo CONDITIONAL, nos aseguramos que el builder también lo sea.
    const currentBuilder =
      metadata &&
      typeof metadata === 'object' &&
      metadata.builder &&
      typeof metadata.builder === 'object'
        ? metadata.builder
        : {};
    const newBuilder = { ...currentBuilder, type: 'CONDITIONAL' };
    metadata = {
      ...(metadata && typeof metadata === 'object' ? metadata : {}),
      builder: newBuilder,
    };
  } else if (
    metadata &&
    typeof metadata === 'object' &&
    'builder' in metadata &&
    typeof metadata.builder === 'object'
  ) {
    metadata = { ...metadata, builder: { ...metadata.builder, type: type } };
  }

  if (!name || !message || !type) {
    return res
      .status(400)
      .json({ message: 'Name, message and type are required.' });
  }
  try {
    const node = await prisma.flow.create({
      data: {
        name,
        message,
        type,
        trigger: trigger ?? null,
        parentId: typeof parentId === 'number' ? parentId : null,
        areaId: typeof areaId === 'number' ? areaId : null,
        orderIndex: typeof orderIndex === 'number' ? orderIndex : 0,
        metadata: metadata ?? undefined,
        isActive: typeof isActive === 'boolean' ? isActive : true,
        createdBy: req.user.id,
        botId: 1, // TODO: parametrizar
      },
    });
    return res.status(201).json(node);
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Failed to create node', error: String(error) });
  }
}

export async function updateFlowNode(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  const {
    name,
    message,
    type,
    trigger,
    parentId,
    areaId,
    orderIndex,
    metadata: rawMetadata,
    isActive,
  } = req.body ?? {};

  // DEBUG: Log para ver qué se recibe
  if (type === 'NOTE') {
    console.log(`[UPDATE NODE] Actualizando nodo NOTE ${id}:`, {
      id,
      name,
      message,
      type,
      metadata: rawMetadata,
    });
  }

  // Sincronizar builder.type con el tipo real del nodo
  let metadata = rawMetadata;
  if (type === 'CONDITIONAL') {
    // Si el nodo es de tipo CONDITIONAL, nos aseguramos que el builder también lo sea.
    const currentBuilder =
      metadata &&
      typeof metadata === 'object' &&
      metadata.builder &&
      typeof metadata.builder === 'object'
        ? metadata.builder
        : {};
    const newBuilder = { ...currentBuilder, type: 'CONDITIONAL' };
    metadata = {
      ...(metadata && typeof metadata === 'object' ? metadata : {}),
      builder: newBuilder,
    };
  } else if (
    metadata &&
    typeof metadata === 'object' &&
    'builder' in metadata &&
    typeof metadata.builder === 'object' &&
    type
  ) {
    metadata = { ...metadata, builder: { ...metadata.builder, type: type } };
  }

  try {
    const node = await prisma.flow.update({
      where: { id, createdBy: req.user.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(message !== undefined ? { message } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(trigger !== undefined ? { trigger } : {}),
        ...(parentId !== undefined ? { parentId } : {}),
        ...(areaId !== undefined ? { areaId } : {}),
        ...(orderIndex !== undefined ? { orderIndex } : {}),
        ...(metadata !== undefined
          ? { metadata: JSON.stringify(metadata) }
          : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
    return res.json(node);
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Failed to update node', error: String(error) });
  }
}

export async function deleteFlowNode(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  try {
    await prisma.flow.deleteMany({ where: { id, createdBy: req.user.id } });
    return res.status(204).send();
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Failed to delete node', error: String(error) });
  }
}

export async function getFlowNode(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  try {
    const node = await prisma.flow.findFirst({
      where: { id, createdBy: req.user.id },
    });
    if (!node) {
      return res.status(404).json({ message: 'Node not found' });
    }
    return res.json(node);
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Failed to get node', error: String(error) });
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

type ConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'REGEX';

type GraphCondition = {
  id: string;
  label: string;
  match: string;
  matchMode: 'EXACT' | 'CONTAINS' | 'REGEX';
  operator: ConditionOperator;
  targetId: string | null;
};

type BuilderCondition = {
  id?: string;
  label?: string;
  match?: string;
  matchMode?: string;
  operator?: string;
  targetId?: string | null;
};

const CONDITIONAL_OPERATOR_VALUES: ConditionOperator[] = [
  'EQUALS',
  'NOT_EQUALS',
  'CONTAINS',
  'STARTS_WITH',
  'ENDS_WITH',
  'GREATER_THAN',
  'LESS_THAN',
  'REGEX',
];

const CONDITIONAL_OPERATOR_SET = new Set(CONDITIONAL_OPERATOR_VALUES);

function normalizeConditionOperator(value?: string | null): ConditionOperator {
  if (!value) return 'EQUALS';
  const upper = value.toUpperCase() as ConditionOperator;
  return CONDITIONAL_OPERATOR_SET.has(upper) ? upper : 'EQUALS';
}

type BuilderMetadata = {
  reactId?: string;
  position?: Record<string, unknown> | null;
  options?: BuilderOption[];
  conditions?: BuilderCondition[];
  sourceVariable?: string | null;
  defaultLabel?: string | null;
  defaultTargetId?: string | null;
  defaultConditionId?: string | null;
  messageType?: string;
  buttonTitle?: string | null;
  buttonFooter?: string | null;
  listButtonText?: string | null;
  listTitle?: string | null;
  listDescription?: string | null;
  type?: string;
  waitForResponse?: boolean;
  responseVariableName?: string | null;
  responseVariableType?: string;
  audioModel?: string | null;
  imageModel?: string | null;
  saveResponseToVariable?: string | null;
  seconds?: number;
  week?: Record<string, unknown>;
  targetBotId?: string | null;
  agentId?: string | null;
  prompt?: string | null;
  model?: string | null;
  variable?: string | null;
  value?: string | null;
};

const DEFAULT_POSITION = { x: 160, y: 120 };
const DEFAULT_NODE_TYPE = 'default';
const NODE_TYPE_SET = new Set<NodeType>([
  'START',
  'TEXT',
  'CONDITIONAL',
  'DELAY',
  'SCHEDULE',
  'REDIRECT_BOT',
  'REDIRECT_AGENT',
  'AI',
  'SET_VARIABLE',
  'END',
]);
const VARIABLE_TYPE_SET = new Set(['STRING', 'NUMBER', 'BOOLEAN', 'JSON']);

function normalizeFlowNodeType(value: unknown): NodeType {
  if (typeof value === 'string') {
    const upper = value.toUpperCase();
    if (NODE_TYPE_SET.has(upper as NodeType)) {
      return upper as NodeType;
    }
    if (upper === 'MENU') {
      return 'TEXT';
    }
  }
  return 'TEXT';
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizePositionValue(position?: Record<string, unknown> | null): {
  x: number;
  y: number;
} {
  if (!position) {
    return { ...DEFAULT_POSITION };
  }
  const x = parseNumericValue(position['x']) ?? DEFAULT_POSITION.x;
  const y = parseNumericValue(position['y']) ?? DEFAULT_POSITION.y;
  return { x, y };
}

function buildButtonSettingsFromMetadata(metadata?: BuilderMetadata | null) {
  const title = sanitizeStringValue(metadata?.buttonTitle ?? null);
  const footer = sanitizeStringValue(metadata?.buttonFooter ?? null);
  if (!title && !footer) {
    return undefined;
  }
  return {
    ...(title ? { title } : {}),
    ...(footer ? { footer } : {}),
  };
}

function buildListSettingsFromMetadata(metadata?: BuilderMetadata | null) {
  const buttonText = sanitizeStringValue(metadata?.listButtonText ?? null);
  const listTitle = sanitizeStringValue(metadata?.listTitle ?? null);
  const description = sanitizeStringValue(metadata?.listDescription ?? null);
  if (!buttonText && !listTitle && !description) {
    return undefined;
  }
  return {
    ...(buttonText ? { buttonText } : {}),
    ...(listTitle ? { title: listTitle } : {}),
    ...(description ? { description } : {}),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  // Si es un string JSON, intentar parsearlo
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch (e) {
      return null;
    }
  }

  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as Record<string, unknown>;
}

function extractBuilderMetadata(value: unknown): BuilderMetadata | null {
  // asRecord ya maneja el parsing de JSON strings
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

  const conditionsRaw = Array.isArray(builder.conditions)
    ? (builder.conditions as unknown[])
    : [];

  const conditions: BuilderCondition[] = [];
  conditionsRaw.forEach((entry) => {
    const condition = asRecord(entry);
    if (!condition) return;
    conditions.push({
      id:
        typeof condition.id === 'string' && condition.id.length > 0
          ? condition.id
          : undefined,
      label:
        typeof condition.label === 'string' && condition.label.length > 0
          ? condition.label
          : undefined,
      match:
        typeof condition.match === 'string' && condition.match.length > 0
          ? condition.match
          : undefined,
      matchMode:
        typeof condition.matchMode === 'string' &&
        condition.matchMode.length > 0
          ? condition.matchMode
          : undefined,
      targetId:
        typeof condition.targetId === 'string' && condition.targetId.length > 0
          ? condition.targetId
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
  const nodeType =
    typeof builder.type === 'string' && builder.type.length > 0
      ? builder.type
      : undefined;
  const waitForResponse =
    typeof builder.waitForResponse === 'boolean'
      ? builder.waitForResponse
      : undefined;
  const responseVariableName = sanitizeStringValue(
    builder.responseVariableName ?? builder.saveResponseToVariable
  );
  const responseVariableType =
    typeof builder.responseVariableType === 'string'
      ? builder.responseVariableType.toUpperCase()
      : undefined;
  const audioModel = sanitizeStringValue(builder.audioModel);
  const imageModel = sanitizeStringValue(builder.imageModel);
  const saveResponseToVariable = sanitizeStringValue(
    builder.saveResponseToVariable
  );
  const sourceVariable = sanitizeStringValue(builder.sourceVariable);
  const defaultLabel = sanitizeStringValue(builder.defaultLabel);
  const defaultTargetId = sanitizeStringValue(builder.defaultTargetId);
  const defaultConditionId = sanitizeStringValue(builder.defaultConditionId);
  const seconds =
    typeof builder.seconds === 'number' ? builder.seconds : undefined;
  const week =
    typeof builder.week === 'object' && builder.week !== null
      ? (builder.week as Record<string, unknown>)
      : undefined;
  const targetBotId = sanitizeStringValue(builder.targetBotId);
  const agentId = sanitizeStringValue(builder.agentId);
  const prompt = sanitizeStringValue(builder.prompt);
  const model = sanitizeStringValue(builder.model);
  const variable = sanitizeStringValue(builder.variable);
  const nodeValue = sanitizeStringValue(builder.value);

  return {
    reactId:
      typeof builder.reactId === 'string' && builder.reactId.length > 0
        ? builder.reactId
        : undefined,
    position,
    options,
    conditions,
    messageType,
    buttonTitle,
    buttonFooter,
    listButtonText,
    listTitle,
    listDescription,
    type: nodeType,
    waitForResponse,
    responseVariableName: responseVariableName ?? null,
    responseVariableType,
    audioModel,
    imageModel,
    saveResponseToVariable,
    sourceVariable: sourceVariable ?? null,
    defaultLabel: defaultLabel ?? null,
    defaultTargetId: defaultTargetId ?? null,
    defaultConditionId: defaultConditionId ?? null,
    seconds,
    week,
    targetBotId,
    agentId,
    prompt,
    model,
    variable,
    value: nodeValue,
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

function buildGraphConditionFromBuilder(
  condition: BuilderCondition
): GraphCondition {
  const label = sanitizeStringValue(condition.label) ?? '';
  const match = sanitizeStringValue(condition.match) ?? '';
  const operator = normalizeConditionOperator(
    condition.operator ?? condition.matchMode
  );
  const matchMode: 'EXACT' | 'CONTAINS' | 'REGEX' =
    operator === 'CONTAINS'
      ? 'CONTAINS'
      : operator === 'REGEX'
      ? 'REGEX'
      : 'EXACT';

  return {
    id: condition.id ?? crypto.randomUUID(),
    label: label || match,
    match,
    matchMode,
    operator,
    targetId: condition.targetId ?? null,
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
    conditions?: unknown;
    flowId?: unknown;
    areaId?: unknown;
    isActive?: unknown;
    parentId?: unknown;
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

function sanitizeCondition(raw: unknown): GraphCondition | null {
  if (!raw || typeof raw !== 'object') return null;
  const condition = raw as Record<string, unknown>;
  const id =
    typeof condition.id === 'string'
      ? condition.id
      : condition.id !== undefined
      ? String(condition.id)
      : null;
  if (!id) return null;

  const match =
    typeof condition.match === 'string' ? condition.match.trim() : '';
  const operator = normalizeConditionOperator(
    typeof condition.operator === 'string'
      ? condition.operator
      : typeof condition.matchMode === 'string'
      ? condition.matchMode
      : undefined
  );
  const matchMode: 'EXACT' | 'CONTAINS' | 'REGEX' =
    operator === 'CONTAINS'
      ? 'CONTAINS'
      : operator === 'REGEX'
      ? 'REGEX'
      : 'EXACT';

  return {
    id,
    label: typeof condition.label === 'string' ? condition.label.trim() : '',
    match,
    matchMode,
    operator,
    targetId:
      typeof condition.targetId === 'string'
        ? condition.targetId
        : condition.targetId === null
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

  const payloadBotId = parseNumericValue(req.body?.botId);
  if (!payloadBotId) {
    return res
      .status(400)
      .json({ message: 'botId is required to save the flow graph.' });
  }

  const botRecord = await prisma.bot.findUnique({
    where: { id: payloadBotId },
  });

  if (!botRecord) {
    return res.status(404).json({ message: 'Bot not found.' });
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

  console.error('[saveFlowGraph] payload', {
    userId: req.user.id,
    botId: payloadBotId,
    nodes: nodesPayload.length,
    edges: edgesPayload.length,
    deleteMissing,
  });

  // Log detallado de nodos recibidos
  console.log('[saveFlowGraph] NODOS RECIBIDOS DEL FRONTEND:');
  nodesPayload.forEach((node: any, idx: number) => {
    console.log(
      `  [${idx}] id="${node.id}" type="${node.type}" flowId=${
        node.data?.flowId ?? 'undefined'
      }`
    );
  });

  try {
    const persistGraph = async (
      client: Prisma.TransactionClient | typeof prisma
    ) => {
      const nodeIdToFlowId = new Map<string, number>();
      const sanitizedOptionsByNode = new Map<string, GraphOption[]>();
      const sanitizedConditionsByNode = new Map<string, GraphCondition[]>();
      const sanitizedDefaultConditionsByNode = new Map<
        string,
        GraphCondition
      >();
      const touchedFlowIds = new Set<number>();
      const responseNodes: Array<{ reactId: string; flowId: number }> = [];
      const incomingTriggerMap = new Map<string, Set<string>>();

      for (const entry of nodesPayload) {
        const normalized = normalizeGraphNode(entry);
        if (!normalized) continue;

        const nodeId = normalized.id;
        const data = normalized.data ?? {};
        const dataRecord = data as Record<string, unknown>;

        // DEBUG: Log de todos los datos recibidos para CAPTURE
        if (dataRecord.type === 'CAPTURE') {
          console.log(
            `[DEBUG] CAPTURE node "${nodeId}": data keys = ${Object.keys(
              dataRecord
            ).join(', ')}`
          );
          console.log(
            `[DEBUG]   responseVariableName = "${dataRecord.responseVariableName}"`
          );
          console.log(`[DEBUG]   message = "${dataRecord.message}"`);
        }

        // DEBUG: Log para NOTE
        if (dataRecord.type === 'NOTE') {
          console.log(
            `[DEBUG] NOTE node "${nodeId}": data keys = ${Object.keys(
              dataRecord
            ).join(', ')}`
          );
          console.log(`[DEBUG]   message = "${dataRecord.message}"`);
          console.log(`[DEBUG]   value = "${dataRecord.value}"`);
          console.log(`[DEBUG]   label = "${dataRecord.label}"`);
        }

        // DEBUG: Log para CONDITIONAL
        if (dataRecord.type === 'CONDITIONAL') {
          console.log(
            `[DEBUG] CONDITIONAL node "${nodeId}": data keys = ${Object.keys(
              dataRecord
            ).join(', ')}`
          );
          console.log(
            `[DEBUG]   sourceVariable = "${dataRecord.sourceVariable}"`
          );
          console.log(
            `[DEBUG]   evaluations count = ${
              Array.isArray(dataRecord.evaluations)
                ? dataRecord.evaluations.length
                : 0
            }`
          );
          if (
            Array.isArray(dataRecord.evaluations) &&
            dataRecord.evaluations.length > 0
          ) {
            console.log(
              `[DEBUG]   first evaluation = ${JSON.stringify(
                dataRecord.evaluations[0]
              )}`
            );
          }
        }

        const options = Array.isArray(data.options)
          ? (data.options as unknown[])
              .map(sanitizeOption)
              .filter((value): value is GraphOption => Boolean(value))
          : [];

        const conditionalEvaluations = Array.isArray(dataRecord.evaluations)
          ? (dataRecord.evaluations as unknown[])
              .map((entry) => {
                if (!entry || typeof entry !== 'object') return null;
                const evaluation = entry as Record<string, unknown>;
                const id =
                  typeof evaluation.id === 'string'
                    ? evaluation.id
                    : evaluation.id !== undefined
                    ? String(evaluation.id)
                    : crypto.randomUUID();
                const operatorRaw =
                  typeof evaluation.operator === 'string'
                    ? evaluation.operator.toUpperCase()
                    : 'EQUALS';
                const operator = CONDITIONAL_OPERATOR_SET.has(
                  operatorRaw as ConditionOperator
                )
                  ? (operatorRaw as ConditionOperator)
                  : 'EQUALS';
                const matchMode: 'EXACT' | 'CONTAINS' | 'REGEX' =
                  operator === 'CONTAINS'
                    ? 'CONTAINS'
                    : operator === 'REGEX'
                    ? 'REGEX'
                    : 'EXACT';
                return {
                  id,
                  label:
                    typeof evaluation.label === 'string'
                      ? evaluation.label
                      : 'Condici��n',
                  match:
                    typeof evaluation.value === 'string'
                      ? evaluation.value
                      : '',
                  matchMode,
                  operator,
                  targetId:
                    typeof evaluation.targetId === 'string'
                      ? evaluation.targetId
                      : null,
                };
              })
              .filter((value): value is GraphCondition => Boolean(value))
          : [];

        const areaIdRaw =
          typeof dataRecord.areaId === 'number'
            ? dataRecord.areaId
            : typeof dataRecord.areaId === 'string'
            ? Number(dataRecord.areaId)
            : null;
        const areaId =
          typeof areaIdRaw === 'number' && Number.isFinite(areaIdRaw)
            ? areaIdRaw
            : null;

        const triggerValue = null;

        // Usar el type recibido directamente como string para Prisma
        const flowType =
          typeof data.type === 'string' && data.type.trim().length
            ? data.type.trim()
            : typeof normalized.type === 'string' &&
              normalized.type.trim().length
            ? normalized.type.trim()
            : 'MENU';

        const label =
          typeof data.label === 'string' && data.label.trim().length
            ? data.label.trim()
            : 'Nodo sin título';

        // Para nodos NOTE, siempre usar el campo message del payload
        // Pero FILTRAR imágenes/datos base64 que no debería estar en el contenido
        let message = typeof data.message === 'string' ? data.message : '';

        // Limpieza: eliminar datos base64 de imágenes (evitar que las imágenes se guarden como texto)
        if (
          message.includes('/9j/4AAQSkZJRg') ||
          message.includes('data:image')
        ) {
          // Detectar si hay base64 de imagen y extraer solo el texto antes de ella
          const base64Match = message.match(
            /(\n)?\/9j\/4AAQSkZJRg[\w+/]*={0,2}|data:image[^;]*;base64,[A-Za-z0-9+/]*={0,2}/
          );
          if (base64Match) {
            // Tomar solo el texto antes de la imagen
            message = message.substring(0, base64Match.index || 0).trim();
            console.log(
              `[saveFlowGraph] Node "${nodeId}" (type: ${flowType}): Imagen removida del contenido. Mensaje limpio: "${message}"`
            );
          }
        }

        console.log(
          `[saveFlowGraph] Node "${nodeId}" (type: ${flowType}): data.message="${message}"`
        );

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

        const sourceVariableValue = sanitizeStringValue(
          dataRecord.sourceVariable
        );
        const defaultLabelValue = sanitizeStringValue(dataRecord.defaultLabel);
        const defaultTargetId =
          typeof dataRecord.defaultTargetId === 'string' &&
          dataRecord.defaultTargetId.length
            ? dataRecord.defaultTargetId
            : null;
        const defaultConditionId =
          typeof dataRecord.defaultConditionId === 'string' &&
          dataRecord.defaultConditionId.length
            ? dataRecord.defaultConditionId
            : crypto.randomUUID();

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

        const waitForResponse =
          typeof dataRecord.waitForResponse === 'boolean'
            ? dataRecord.waitForResponse
            : Boolean(
                sanitizeStringValue(
                  dataRecord.responseVariableName ??
                    dataRecord.saveResponseToVariable
                )
              );
        const responseVariableName = waitForResponse
          ? sanitizeStringValue(
              dataRecord.responseVariableName ??
                dataRecord.saveResponseToVariable
            )
          : null;

        // DEBUG: Log responseVariableName
        if (flowType === 'CAPTURE') {
          console.log(
            `[saveFlowGraph] CAPTURE Node "${nodeId}": responseVariableName="${dataRecord.responseVariableName}" → sanitized="${responseVariableName}"`
          );
        }

        const rawVariableType =
          typeof dataRecord.responseVariableType === 'string'
            ? dataRecord.responseVariableType.toUpperCase()
            : undefined;
        const responseVariableType =
          rawVariableType && VARIABLE_TYPE_SET.has(rawVariableType)
            ? rawVariableType
            : undefined;
        const audioModelValue = sanitizeStringValue(dataRecord.audioModel);
        const imageModelValue = sanitizeStringValue(dataRecord.imageModel);

        // Campos para DELAY
        const secondsValue =
          typeof dataRecord.seconds === 'number' ? dataRecord.seconds : 1;

        // Campos para SCHEDULE
        const weekValue =
          typeof dataRecord.week === 'object' && dataRecord.week !== null
            ? dataRecord.week
            : undefined;

        // Campos para REDIRECT_BOT
        const targetBotIdValue = sanitizeStringValue(dataRecord.targetBotId);

        // Campos para REDIRECT_AGENT
        const agentIdValue = sanitizeStringValue(dataRecord.agentId);

        // Campos para AI
        const promptValue = sanitizeStringValue(dataRecord.prompt);
        const modelValue = sanitizeStringValue(dataRecord.model);

        // Campos para SET_VARIABLE
        const variableValue = sanitizeStringValue(dataRecord.variable);
        const valueValue = sanitizeStringValue(dataRecord.value);

        const metadataPayload = {
          builder: {
            reactId: nodeId ?? undefined, // Usar nodeId tal cual, sin conversión
            position: normalized.position ?? null,
            type: flowType ?? 'default', // Usar flowType (CONDITIONAL, TEXT, etc) no normalized.type
            width: normalized.width ?? null,
            height: normalized.height ?? null,
            options,
            conditions: conditionalEvaluations,
            sourceVariable: sourceVariableValue ?? undefined,
            defaultLabel: defaultLabelValue ?? undefined,
            defaultTargetId: defaultTargetId ?? undefined,
            defaultConditionId:
              flowType === 'CONDITIONAL' ? defaultConditionId : undefined,
            messageType,
            buttonTitle: buttonTitle ?? null,
            buttonFooter: buttonFooter ?? null,
            listButtonText: listButtonText ?? null,
            listTitle: listTitle ?? null,
            listDescription: listDescription ?? null,
            waitForResponse: waitForResponse || undefined,
            responseVariableName: responseVariableName ?? undefined,
            responseVariableType,
            audioModel: audioModelValue ?? undefined,
            imageModel: imageModelValue ?? undefined,
            saveResponseToVariable: responseVariableName ?? undefined,
            // Campos para DELAY
            seconds: flowType === 'DELAY' ? secondsValue : undefined,
            // Campos para SCHEDULE
            week: flowType === 'SCHEDULE' ? weekValue : undefined,
            // Campos para REDIRECT_BOT
            targetBotId:
              flowType === 'REDIRECT_BOT' ? targetBotIdValue : undefined,
            // Campos para REDIRECT_AGENT
            agentId: flowType === 'REDIRECT_AGENT' ? agentIdValue : undefined,
            // Campos para AI
            prompt: flowType === 'AI' ? promptValue : undefined,
            model: flowType === 'AI' ? modelValue : undefined,
            // Campos para SET_VARIABLE
            variable: flowType === 'SET_VARIABLE' ? variableValue : undefined,
            value: flowType === 'SET_VARIABLE' ? valueValue : undefined,
          },
        };

        // Serializar metadata a JSON string, limpiando valores undefined
        const metadataJsonString = serializeMetadata(metadataPayload);

        if (flowType === 'CONDITIONAL') {
          sanitizedDefaultConditionsByNode.set(nodeId, {
            id: defaultConditionId,
            label: defaultLabelValue ?? 'Otro...',
            match: '',
            matchMode: 'EXACT',
            operator: 'EQUALS',
            targetId: defaultTargetId,
          });
        }

        const flowId =
          typeof data.flowId === 'number' && Number.isInteger(data.flowId)
            ? data.flowId
            : null;

        const parentId =
          typeof (data as any).parentId === 'number' &&
          Number.isInteger((data as any).parentId)
            ? (data as any).parentId
            : null;

        let recordId: number;

        // Primero intentar buscar por flowId si existe
        let existing = flowId
          ? await client.flow.findFirst({
              where: {
                id: flowId,
                createdBy: req.user!.id,
              },
              select: { id: true, botId: true },
            })
          : null;

        console.log(
          `[saveFlowGraph] Node "${nodeId}": flowId=${flowId}, found by flowId=${!!existing}`
        );

        // Si no encuentra por flowId, buscar por reactId en metadata
        if (!existing && nodeId) {
          const candidates: Array<{
            id: number;
            botId: number;
            metadata: Prisma.JsonValue;
          }> = await client.flow.findMany({
            where: {
              createdBy: req.user!.id,
              botId: payloadBotId,
            },
            select: { id: true, botId: true, metadata: true },
          });

          console.log(
            `[saveFlowGraph] Searching for reactId="${nodeId}" among ${candidates.length} existing flows`
          );

          for (const candidate of candidates) {
            const builderMeta = extractBuilderMetadata(
              candidate.metadata ?? null
            );
            console.log(
              `  Candidate id=${candidate.id}: reactId="${builderMeta?.reactId}"`
            );

            if (builderMeta?.reactId === nodeId) {
              console.log(
                `  ✓ FOUND MATCH! Using existing flow id=${candidate.id}`
              );
              existing = { id: candidate.id, botId: candidate.botId };
              break;
            }
          }

          if (!existing) {
            console.log(
              `  ✗ NO MATCH FOUND for reactId="${nodeId}" - will CREATE new`
            );
          }
        }

        if (existing) {
          // ACTUALIZAR flow existente
          console.log(
            `[saveFlowGraph] UPDATING existing flow id=${existing.id} for node="${nodeId}"`
          );

          if (existing.botId !== payloadBotId) {
            const error = new Error(GRAPH_UNAUTHORIZED_ERROR);
            throw error;
          }

          const updated = await client.flow.update({
            where: { id: existing.id },
            data: {
              name: label,
              message,
              trigger: triggerValue,
              type: flowType as any,
              orderIndex: 0,
              isActive,
              areaId: areaId ?? null,
              metadata: metadataJsonString,
              parentId,
              botId: payloadBotId,
            },
            select: { id: true },
          });

          recordId = updated.id;
          console.log(`[saveFlowGraph] ✓ UPDATED flow id=${recordId}`);
        } else {
          // CREAR nuevo flow
          console.log(`[saveFlowGraph] CREATING new flow for node="${nodeId}"`);

          const created = await client.flow.create({
            data: {
              name: label,
              message,
              trigger: triggerValue,
              type: flowType as any,
              orderIndex: 0,
              metadata: metadataJsonString,
              areaId: areaId ?? null,
              isActive,
              createdBy: req.user!.id,
              parentId,
              botId: payloadBotId,
            },
            select: { id: true },
          });
          recordId = created.id;
          console.log(`[saveFlowGraph] ✓ CREATED new flow id=${recordId}`);
        }

        nodeIdToFlowId.set(nodeId, recordId);
        sanitizedOptionsByNode.set(nodeId, options);
        sanitizedConditionsByNode.set(nodeId, conditionalEvaluations);
        touchedFlowIds.add(recordId);
        responseNodes.push({ reactId: nodeId, flowId: recordId });
        if (!incomingTriggerMap.has(nodeId)) {
          incomingTriggerMap.set(nodeId, new Set<string>());
        }
      }

      if (touchedFlowIds.size) {
        await client.flowConnection.deleteMany({
          where: {
            fromId: {
              in: Array.from(touchedFlowIds),
            },
          },
        });
      }

      const connectionLookup = new Map<
        string,
        { nodeId: string; option?: GraphOption; condition?: GraphCondition }
      >();
      sanitizedOptionsByNode.forEach((options, nodeId) => {
        options.forEach((option) => {
          connectionLookup.set(option.id, { option, nodeId });
        });
      });
      sanitizedConditionsByNode.forEach((conditions, nodeId) => {
        conditions.forEach((condition) => {
          connectionLookup.set(condition.id, { condition, nodeId });
        });
      });
      sanitizedDefaultConditionsByNode.forEach((condition, nodeId) => {
        connectionLookup.set(condition.id, { condition, nodeId });
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
        let sourceHandle = ''; // Nueva variable para almacenar el sourceHandle

        if (normalized.data && typeof normalized.data === 'object') {
          const dataRecord = normalized.data as Record<string, unknown>;
          const connectionId =
            typeof dataRecord.optionId === 'string'
              ? dataRecord.optionId
              : typeof dataRecord.conditionId === 'string'
              ? dataRecord.conditionId
              : null;
          if (connectionId) {
            sourceHandle = connectionId; // Guardar el connectionId como sourceHandle
            const lookup = connectionLookup.get(connectionId);
            if (lookup?.condition) {
              // Usar el label de la condición, no el ID
              trigger = lookup.condition.label || 'Condición';
            } else if (lookup?.option?.trigger) {
              trigger = lookup.option.trigger.trim();
            } else if (lookup?.option?.label) {
              trigger = lookup.option.label.trim();
            }
          }
        }

        // Si no se encontró trigger, usar el label enviado desde el frontend
        if (!trigger && typeof normalized.label === 'string') {
          trigger = normalized.label.trim();
        }

        // Guardar sourceHandle como prefijo en trigger: "sourceHandle||displayLabel"
        const triggerWithSourceHandle = sourceHandle
          ? `${sourceHandle}||${trigger}`
          : trigger;

        // DEBUG: Log para verificar el formato
        if (sourceHandle) {
          console.log('[saveFlowGraph] Edge trigger format:', {
            sourceHandle,
            trigger,
            triggerWithSourceHandle,
          });
        }

        if (triggerWithSourceHandle.length > 0 && normalized.target) {
          const set =
            incomingTriggerMap.get(normalized.target) ?? new Set<string>();
          set.add(triggerWithSourceHandle);
          incomingTriggerMap.set(normalized.target, set);
        }

        const key = `${fromId}|${toId}|${triggerWithSourceHandle}`;
        if (!uniqueConnections.has(key)) {
          uniqueConnections.set(key, {
            fromId,
            toId,
            trigger: triggerWithSourceHandle,
          });
        }
      }

      if (uniqueConnections.size) {
        await client.flowConnection.createMany({
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

          await client.flow.update({
            where: { id: flowId },
            data: {
              trigger: uniqueTriggers.length ? uniqueTriggers.join(',') : null,
            },
          });
        }
      }

      let deletedFlowIds: number[] = [];

      if (deleteMissing) {
        const existingFlows = await client.flow.findMany({
          where: { createdBy: req.user!.id, botId: payloadBotId },
          select: {
            id: true,
            metadata: true,
          },
        });

        const payloadReactIds = new Set(
          responseNodes.map((mapping) => mapping.reactId)
        );

        const flowsToDelete = existingFlows.filter((flow) => {
          const builderMeta = extractBuilderMetadata(flow.metadata ?? null);
          if (builderMeta?.reactId) {
            return !payloadReactIds.has(builderMeta.reactId);
          }
          // Fallback: legacy nodes without builder metadata should be deleted
          // when they were not part of the payload processed in this save.
          return !touchedFlowIds.has(flow.id);
        });

        if (flowsToDelete.length) {
          const ids = flowsToDelete.map((flow) => flow.id);
          await client.flowConnection.deleteMany({
            where: {
              OR: [{ fromId: { in: ids } }, { toId: { in: ids } }],
            },
          });
          await client.flow.deleteMany({
            where: { id: { in: ids } },
          });
          deletedFlowIds = ids;
        }
      }

      return { nodes: responseNodes, deletedFlowIds };
    };

    const useTransaction =
      nodesPayload.length <= env.flowGraphTransactionNodeLimit;

    if (!useTransaction) {
      console.warn(
        '[saveFlowGraph] Persisting without transaction due to graph size',
        nodesPayload.length
      );
    }

    const transactionResult = useTransaction
      ? await prisma.$transaction((tx) => persistGraph(tx), {
          timeout: env.prismaTransactionTimeoutMs,
          maxWait: env.prismaTransactionMaxWaitMs,
        })
      : await persistGraph(prisma);

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

    console.error('[saveFlowGraph] Failed to persist flow graph', error);
    return res
      .status(500)
      .json({ message: 'Failed to persist flow graph', error: String(error) });
  }
}

export async function getFlowGraph(req: Request, res: Response) {
  try {
    const botIdFilter = req.query.botId ? Number(req.query.botId) : null;

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const flows = await prisma.flow.findMany({
      where: {
        createdBy: req.user.id,
        ...(botIdFilter ? { botId: botIdFilter } : {}),
      },
      orderBy: [{ id: 'asc' }],
    });

    if (!flows.length) {
      return res.status(200).json({ nodes: [], edges: [] });
    }

    // Deduplicar flows por reactId, manteniendo el más reciente (por id mayor)
    const reactIdToFlow = new Map<string, (typeof flows)[0]>();
    for (const flow of flows) {
      const builderMeta = extractBuilderMetadata(flow.metadata ?? null);
      const reactId = builderMeta?.reactId ?? `flow-${flow.id}`;

      const existing = reactIdToFlow.get(reactId);
      // Mantener el flow con ID más alto (más reciente)
      if (!existing || flow.id > existing.id) {
        reactIdToFlow.set(reactId, flow);
      }
    }

    const uniqueFlows = Array.from(reactIdToFlow.values());
    const flowIds = uniqueFlows.map((flow) => flow.id);

    // DEBUG
    console.log('[getFlowGraph] Total flows in DB:', flows.length);
    console.log('[getFlowGraph] Unique flows after dedup:', uniqueFlows.length);
    console.log('[getFlowGraph] Flow IDs included:', flowIds);
    console.log(
      '[getFlowGraph] All flow IDs in DB:',
      flows.map((f) => f.id)
    );

    // Buscar conexiones donde AMBOS nodos (fromId y toId) están en el conjunto completo de flows
    const connections = await prisma.flowConnection.findMany({
      where: {
        OR: [{ fromId: { in: flowIds } }, { toId: { in: flowIds } }],
      },
    });

    // Filtrar para incluir solo aquellas donde ambos nodos existen en flows
    const allFlowIds = new Set(flows.map((f) => f.id));
    const validConnections = connections.filter((conn) => {
      return allFlowIds.has(conn.fromId) && allFlowIds.has(conn.toId);
    });

    // DEBUG
    console.log(
      '[getFlowGraph] Connections found (total):',
      connections.length
    );
    console.log(
      '[getFlowGraph] Valid connections (both nodes exist):',
      validConnections.length
    );
    validConnections.forEach((conn) => {
      console.log(`  - Connection ${conn.id}: ${conn.fromId} → ${conn.toId}`);
    });

    type SerializedEdgeResponse = {
      id: string;
      source: string;
      target: string;
      label?: string;
      sourceHandle?: string;
      targetHandle?: string;
      data?: { optionId?: string; conditionId?: string };
    };

    const nodes: Array<{
      id: string;
      type?: string;
      position: { x: number; y: number };
      data: Record<string, unknown>;
    }> = [];

    const flowIdToReactId = new Map<number, string>();

    for (const flow of uniqueFlows) {
      const builderMeta = extractBuilderMetadata(flow.metadata ?? null);
      const reactId = builderMeta?.reactId ?? `flow-${flow.id}`;
      flowIdToReactId.set(flow.id, reactId);

      const nodeType = normalizeFlowNodeType(flow.type);

      // DEBUG: Log para CONDITIONAL
      if (nodeType === 'CONDITIONAL') {
        console.log(
          `[getFlowGraph] Reading flow id=${flow.id} (${reactId}): type="${nodeType}", builderMeta.sourceVariable="${builderMeta?.sourceVariable}"`
        );
      }

      const buttonSettings = buildButtonSettingsFromMetadata(builderMeta);
      const listSettings = buildListSettingsFromMetadata(builderMeta);
      const sanitizedOptions =
        builderMeta?.options?.map((option) =>
          buildGraphOptionFromBuilder(option)
        ) ?? [];
      const sanitizedConditions =
        builderMeta?.conditions?.map((condition) => ({
          id:
            typeof condition?.id === 'string' && condition.id.length > 0
              ? condition.id
              : crypto.randomUUID(),
          label:
            typeof condition?.label === 'string'
              ? condition.label
              : 'Condición',
          operator:
            typeof condition?.operator === 'string'
              ? condition.operator
              : typeof condition?.matchMode === 'string'
              ? condition.matchMode
              : 'EQUALS',
          value: typeof condition?.match === 'string' ? condition.match : '',
          targetId:
            typeof condition?.targetId === 'string' ? condition.targetId : null,
        })) ?? [];

      const nodeData: Record<string, unknown> = {
        // Propiedades principales del nodo
        label: typeof flow.name === 'string' ? flow.name : undefined,
        message: typeof flow.message === 'string' ? flow.message : undefined,
        trigger: typeof flow.trigger === 'string' ? flow.trigger : undefined,
        type: builderMeta?.type ?? flow.type ?? 'default',
        position: builderMeta?.position ?? null,
        // ID del flow en la base de datos (para evitar duplicados al guardar nuevamente)
        flowId: flow.id,
        parentId: flow.parentId,
        // Configuraciones adicionales
        buttonSettings: buttonSettings ?? undefined,
        listSettings: listSettings ?? undefined,
        options: sanitizedOptions,
        evaluations: sanitizedConditions,
        // Campos para CAPTURE
        responseVariableName:
          typeof builderMeta?.responseVariableName === 'string'
            ? builderMeta.responseVariableName
            : undefined,
        responseVariableType:
          typeof builderMeta?.responseVariableType === 'string'
            ? builderMeta.responseVariableType
            : undefined,
        audioModel:
          typeof builderMeta?.audioModel === 'string'
            ? builderMeta.audioModel
            : undefined,
        imageModel:
          typeof builderMeta?.imageModel === 'string'
            ? builderMeta.imageModel
            : undefined,
        waitForResponse:
          typeof builderMeta?.waitForResponse === 'boolean'
            ? builderMeta.waitForResponse
            : undefined,
        // Campo para CONDITIONAL
        sourceVariable:
          typeof builderMeta?.sourceVariable === 'string'
            ? builderMeta.sourceVariable
            : undefined,
      };

      if (nodeType === 'CONDITIONAL') {
        nodeData.defaultLabel =
          typeof builderMeta?.defaultLabel === 'string'
            ? builderMeta.defaultLabel
            : 'Otro';
        nodeData.defaultTargetId =
          typeof builderMeta?.defaultTargetId === 'string'
            ? builderMeta.defaultTargetId
            : null;
        nodeData.defaultConditionId =
          typeof builderMeta?.defaultConditionId === 'string' &&
          builderMeta.defaultConditionId.length
            ? builderMeta.defaultConditionId
            : crypto.randomUUID();
        // Asegurar que sourceVariable se incluye también
        if (
          !nodeData.sourceVariable &&
          typeof builderMeta?.sourceVariable === 'string'
        ) {
          nodeData.sourceVariable = builderMeta.sourceVariable;
        }
        console.log(
          `[getFlowGraph] CONDITIONAL node "${reactId}": sourceVariable in nodeData="${nodeData.sourceVariable}", from builderMeta="${builderMeta?.sourceVariable}"`
        );
      }

      // Campos para DELAY
      if (nodeType === 'DELAY') {
        nodeData.seconds =
          typeof builderMeta?.seconds === 'number' ? builderMeta.seconds : 1;
      }

      // Campos para SCHEDULE
      if (nodeType === 'SCHEDULE') {
        nodeData.week = builderMeta?.week ?? {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        };
      }

      // Campos para REDIRECT_BOT
      if (nodeType === 'REDIRECT_BOT') {
        nodeData.targetBotId = builderMeta?.targetBotId ?? '';
      }

      // Campos para REDIRECT_AGENT
      if (nodeType === 'REDIRECT_AGENT') {
        nodeData.agentId = builderMeta?.agentId ?? '';
      }

      // Campos para AI
      if (nodeType === 'AI') {
        nodeData.prompt = builderMeta?.prompt ?? '';
        nodeData.model = builderMeta?.model ?? '';
      }

      // Campos para SET_VARIABLE
      if (nodeType === 'SET_VARIABLE') {
        nodeData.variable = builderMeta?.variable ?? '';
        nodeData.value = builderMeta?.value ?? '';
      }

      const serializedNode = {
        id: reactId,
        type: builderMeta?.type ?? DEFAULT_NODE_TYPE,
        position: normalizePositionValue(builderMeta?.position ?? null),
        data: nodeData,
      };

      nodes.push(serializedNode);
    }

    const edges = validConnections
      .map((conn): SerializedEdgeResponse | null => {
        const sourceId = flowIdToReactId.get(conn.fromId);
        const targetId = flowIdToReactId.get(conn.toId);

        if (!sourceId || !targetId) {
          return null;
        }

        // DEBUG: Log el trigger tal como está en BD
        console.log('[getFlowGraph] Connection trigger from DB:', {
          id: conn.id,
          fromId: conn.fromId,
          toId: conn.toId,
          trigger: conn.trigger,
        });

        // Extraer sourceHandle del trigger: "sourceHandleId||displayLabel"
        let sourceHandle: string | undefined;
        let displayLabel: string | undefined;

        if (conn.trigger) {
          const parts = conn.trigger.split('||');
          if (parts.length === 2) {
            sourceHandle = parts[0] || undefined;
            displayLabel = parts[1] || undefined;
          } else {
            displayLabel = conn.trigger;
          }
        }

        // DEBUG: Log resultado de la extracción
        if (sourceHandle) {
          console.log('[getFlowGraph] Extracted sourceHandle:', {
            original: conn.trigger,
            sourceHandle,
            displayLabel,
          });
        }

        // Determinar si es conditionId u optionId basándose en el trigger
        const edgeData: { conditionId?: string; optionId?: string } = {};
        if (sourceHandle) {
          if (displayLabel?.startsWith('cond:')) {
            edgeData.conditionId = sourceHandle;
          } else {
            edgeData.optionId = sourceHandle;
          }
        }

        return {
          id: `edge-${conn.id}`,
          source: sourceId,
          target: targetId,
          label: displayLabel,
          sourceHandle,
          targetHandle: undefined,
          data: edgeData,
        };
      })
      .filter((edge): edge is SerializedEdgeResponse => edge !== null);

    return res.status(200).json({ nodes, edges });
  } catch (error) {
    console.error('[getFlowGraph] Error general:', error);
    return res
      .status(400)
      .json({ message: 'Failed to load flow graph', error: String(error) });
  }
}
