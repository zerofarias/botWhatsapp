import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactFlow, {
  Background,
  Connection,
  Controls,
  MiniMap,
  ReactFlowInstance,
  ReactFlowProvider,
  XYPosition,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import NodeEditor from './NodeEditor';
import {
  FlowBuilderEdge,
  FlowBuilderNode,
  FlowNodeData,
  FlowNodeDataWithLegacy,
  FlowOption,
  ConditionalNodeData,
  ConditionalEvaluation,
  ButtonSettings,
  ListSettings,
  TextNodeData,
  FlowNodeType,
  FLOW_NODE_TYPES,
  SerializedNode,
  FlowGraphPayload,
  SerializedEdge,
} from './types';

import { getFlowGraph, saveFlowGraph } from '../../api/flows';
import { FlowToolbar } from '../../components/flow-builder/FlowToolbar';
import { ConditionalNode } from '../../components/flow-builder/nodes/ConditionalNode';
import { DeleteableEdge } from './components/DeleteableEdge';
// import { api } from '../../services/api';
import './flow-builder.css';

const DEFAULT_POSITION: XYPosition = { x: 160, y: 120 };
const DEFAULT_NODE_TYPE = 'default';

/**
 * Retorna la clase CSS para la forma de un nodo basado en su tipo
 */
function getNodeShapeClass(nodeType: string): string {
  switch (nodeType) {
    case 'START':
    case 'END':
      return 'node-shape-circle';
    case 'CONDITIONAL':
      return 'node-shape-rounded'; // CONDITIONAL tiene su propio estilo personalizado
    default:
      return 'node-shape-rounded';
  }
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Sanitiza las opciones de un nodo tipo TEXT
function sanitizeOptions(options?: FlowOption[]): FlowOption[] {
  if (!Array.isArray(options)) {
    return [];
  }
  return options.map((option) => {
    const id =
      typeof option?.id === 'string' && option.id.length > 0
        ? option.id
        : uuidv4();
    let label = typeof option?.label === 'string' ? option.label.trim() : '';
    let trigger =
      typeof option?.trigger === 'string' ? option.trigger.trim() : '';
    if (!label && trigger) {
      label = trigger;
    }
    if (!trigger && label) {
      const slug = slugify(label);
      trigger = slug.length ? slug : label;
    }
    if (!trigger) {
      const slug = slugify(id);
      trigger = slug.length ? slug : id;
    }
    if (!label) {
      label = trigger;
    }
    return {
      id,
      label,
      trigger,
      targetId:
        typeof option?.targetId === 'string' && option.targetId.length > 0
          ? option.targetId
          : null,
    };
  });
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return undefined;
}

function normalizePosition(
  position?: { x: number; y: number } | null
): XYPosition {
  if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
    return { x: position.x, y: position.y };
  }
  return { ...DEFAULT_POSITION };
}

function sanitizeButtonSettingsValue(
  settings?: ButtonSettings | null
): ButtonSettings | undefined {
  if (!settings || typeof settings !== 'object') {
    return undefined;
  }
  const title = normalizeOptionalString((settings as ButtonSettings).title);
  const footer = normalizeOptionalString((settings as ButtonSettings).footer);
  if (!title && !footer) {
    return undefined;
  }
  return {
    ...(title ? { title } : {}),
    ...(footer ? { footer } : {}),
  };
}

function sanitizeListSettingsValue(
  settings?: ListSettings | null
): ListSettings | undefined {
  if (!settings || typeof settings !== 'object') {
    return undefined;
  }

  const buttonText = normalizeOptionalString(
    (settings as ListSettings).buttonText
  );
  const title = normalizeOptionalString((settings as ListSettings).title);
  const description = normalizeOptionalString(
    (settings as ListSettings).description
  );

  if (!buttonText && !title && !description) {
    return undefined;
  }

  return {
    ...(buttonText ? { buttonText } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
  };
}

// Normaliza y migra nodos legacy a la nueva estructura discriminada
function normalizeNodeFromServer(node: SerializedNode): FlowBuilderNode {
  const { id, type, position } = node;
  const legacy = node.data as FlowNodeDataWithLegacy;
  let data: FlowNodeData;
  switch (legacy.type) {
    case 'START':
      data = {
        type: 'START',
        label: legacy.label ?? 'Inicio',
      };
      break;
    case 'CAPTURE':
      data = {
        type: 'CAPTURE',
        label: legacy.label ?? 'Capturador',
        message: legacy.message ?? '',
        responseVariableName:
          typeof (legacy as any).responseVariableName === 'string'
            ? (legacy as any).responseVariableName
            : 'response',
        responseVariableType: legacy.responseVariableType ?? 'STRING',
        audioModel: legacy.audioModel ?? null,
        imageModel: legacy.imageModel ?? null,
        waitForResponse: true,
      };
      break;
    case 'TEXT':
    case 'MENU': // migrar legacy 'MENU' a 'TEXT'
      data = {
        type: 'TEXT',
        label: legacy.label ?? 'Mensaje',
        message: legacy.message ?? '',
        messageKind: legacy.messageKind ?? 'TEXT',
        options: Array.isArray(legacy.options)
          ? sanitizeOptions(legacy.options)
          : [],
        waitForResponse:
          typeof legacy.waitForResponse === 'boolean'
            ? legacy.waitForResponse
            : Boolean(
                legacy.responseVariableName ?? legacy.saveResponseToVariable
              ),
        responseVariableName:
          legacy.responseVariableName ?? legacy.saveResponseToVariable ?? null,
        responseVariableType: legacy.responseVariableType ?? 'STRING',
        audioModel: legacy.audioModel ?? null,
        imageModel: legacy.imageModel ?? null,
        saveResponseToVariable:
          legacy.saveResponseToVariable ?? legacy.responseVariableName ?? null,
        ...(legacy.buttonSettings
          ? { buttonSettings: legacy.buttonSettings }
          : {}),
        ...(legacy.listSettings ? { listSettings: legacy.listSettings } : {}),
      };
      break;
    case 'CONDITIONAL':
      data = {
        type: 'CONDITIONAL',
        label: legacy.label ?? 'Condicional',
        sourceVariable:
          typeof (legacy as any).sourceVariable === 'string'
            ? (legacy as any).sourceVariable
            : '',
        evaluations: Array.isArray(
          (legacy as Partial<ConditionalNodeData>).evaluations
        )
          ? (
              (legacy as Partial<ConditionalNodeData>).evaluations as Array<
                ConditionalEvaluation | undefined
              >
            ).map((evaluation) => ({
              id:
                evaluation && typeof evaluation.id === 'string'
                  ? evaluation.id
                  : uuidv4(),
              label:
                evaluation && typeof evaluation.label === 'string'
                  ? evaluation.label
                  : 'Condición',
              operator:
                evaluation && typeof evaluation.operator === 'string'
                  ? (evaluation.operator as ConditionalEvaluation['operator'])
                  : 'EQUALS',
              value:
                evaluation && typeof evaluation.value === 'string'
                  ? evaluation.value
                  : '',
              targetId:
                evaluation && typeof evaluation.targetId === 'string'
                  ? evaluation.targetId
                  : null,
            }))
          : [],
        defaultLabel:
          typeof (legacy as any).defaultLabel === 'string'
            ? (legacy as any).defaultLabel
            : 'Otro',
        defaultTargetId:
          typeof (legacy as any).defaultTargetId === 'string'
            ? (legacy as any).defaultTargetId
            : null,
        defaultConditionId:
          typeof (legacy as any).defaultConditionId === 'string' &&
          (legacy as any).defaultConditionId.length
            ? (legacy as any).defaultConditionId
            : uuidv4(),
      };
      if (id)
        console.log(
          `[normalizeNode] CONDITIONAL "${id}": sourceVariable="${data.sourceVariable}"`
        );
      break;
    case 'DELAY':
      data = {
        type: 'DELAY',
        label: legacy.label ?? 'Espera',
        seconds: legacy.seconds ?? 1,
      };
      break;
    case 'SCHEDULE':
      data = {
        type: 'SCHEDULE',
        label: legacy.label ?? 'Horario',
        week:
          typeof legacy.week === 'object' && legacy.week !== null
            ? legacy.week
            : {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: [],
                sunday: [],
              },
      };
      break;
    case 'REDIRECT_BOT':
      data = {
        type: 'REDIRECT_BOT',
        label: legacy.label ?? 'Redirigir a Bot',
        targetBotId: legacy.targetBotId ?? '',
      };
      break;
    case 'REDIRECT_AGENT':
      data = {
        type: 'REDIRECT_AGENT',
        label: legacy.label ?? 'Redirigir a Agente',
        agentId: legacy.agentId ?? '',
      };
      break;
    case 'AI':
      data = {
        type: 'AI',
        label: legacy.label ?? 'Consulta IA',
        prompt: legacy.prompt ?? '',
        model: legacy.model ?? '',
      };
      break;
    case 'SET_VARIABLE':
      data = {
        type: 'SET_VARIABLE',
        label: legacy.label ?? 'Setear Variable',
        variable: legacy.variable ?? '',
        value: legacy.value ?? '',
      };
      break;
    case 'END':
      data = {
        type: 'END',
        label: legacy.label ?? 'Fin',
      };
      break;
    default: {
      const fallback: any = legacy;
      data = {
        type: 'TEXT',
        label: typeof fallback.label === 'string' ? fallback.label : 'Migrado',
        message: typeof fallback.message === 'string' ? fallback.message : '',
        messageKind:
          typeof fallback.messageKind === 'string'
            ? fallback.messageKind
            : 'TEXT',
        options: Array.isArray(fallback.options)
          ? sanitizeOptions(fallback.options)
          : [],
      };
      break;
    }
  }

  const flowId =
    typeof (legacy as any).flowId === 'number' &&
    Number.isInteger((legacy as any).flowId)
      ? (legacy as any).flowId
      : null;
  const parentId =
    typeof (legacy as any).parentId === 'number' &&
    Number.isInteger((legacy as any).parentId)
      ? (legacy as any).parentId
      : null;

  data = {
    ...data,
    flowId,
    parentId,
  };

  return {
    id,
    type: type ?? DEFAULT_NODE_TYPE,
    position: normalizePosition(position),
    data,
  };
}

function toSerializedNode(node: FlowBuilderNode): SerializedNode {
  // Forzar type 'START' para el nodo de inicio, nunca 'MENU', 'menu' ni 'default'
  let forcedType = node.type;
  if (node.data.type === 'START') {
    forcedType = 'START';
  }
  const base = {
    id: node.id,
    type: forcedType ?? DEFAULT_NODE_TYPE,
    position: node.position ?? { ...DEFAULT_POSITION },
  };
  const data = (() => {
    switch (node.data.type) {
      case 'TEXT':
        const waitForResponse =
          typeof node.data.waitForResponse === 'boolean'
            ? node.data.waitForResponse
            : Boolean(
                node.data.responseVariableName ??
                  node.data.saveResponseToVariable
              );
        const responseVariableName = waitForResponse
          ? node.data.responseVariableName ??
            node.data.saveResponseToVariable ??
            null
          : null;
        const responseVariableType = waitForResponse
          ? node.data.responseVariableType ?? 'STRING'
          : undefined;
        return {
          type: 'TEXT',
          label: node.data.label,
          message: node.data.message,
          messageKind: node.data.messageKind,
          options: sanitizeOptions(node.data.options),
          waitForResponse,
          responseVariableName,
          responseVariableType,
          audioModel: waitForResponse ? node.data.audioModel ?? null : null,
          imageModel: waitForResponse ? node.data.imageModel ?? null : null,
          saveResponseToVariable: responseVariableName,
          ...(node.data.buttonSettings
            ? {
                buttonSettings: sanitizeButtonSettingsValue(
                  node.data.buttonSettings
                ),
              }
            : {}),
          ...(node.data.listSettings
            ? {
                listSettings: sanitizeListSettingsValue(node.data.listSettings),
              }
            : {}),
          flowId: node.data.flowId ?? null,
          parentId: node.data.parentId ?? null,
        };
      case 'START':
        return {
          type: 'START',
          label: node.data.label,
          flowId: node.data.flowId ?? null,
          parentId: node.data.parentId ?? null,
        };
      case 'CAPTURE':
        return {
          type: 'CAPTURE',
          label: node.data.label,
          message: node.data.message,
          responseVariableName: node.data.responseVariableName,
          responseVariableType: node.data.responseVariableType ?? 'STRING',
          audioModel: node.data.audioModel ?? null,
          imageModel: node.data.imageModel ?? null,
          waitForResponse: true,
          flowId: node.data.flowId ?? null,
          parentId: node.data.parentId ?? null,
        };
      case 'CONDITIONAL':
        return {
          type: 'CONDITIONAL',
          label: node.data.label,
          sourceVariable: node.data.sourceVariable,
          evaluations: node.data.evaluations,
          defaultLabel: node.data.defaultLabel ?? 'Otro',
          defaultTargetId: node.data.defaultTargetId ?? null,
          defaultConditionId: node.data.defaultConditionId ?? uuidv4(),
          flowId: node.data.flowId ?? null,
          parentId: node.data.parentId ?? null,
        };
      case 'DELAY':
        return {
          type: 'DELAY',
          label: node.data.label,
          seconds: node.data.seconds,
          flowId: node.data.flowId ?? null,
          parentId: node.data.parentId ?? null,
        };
      case 'SCHEDULE':
        return {
          type: 'SCHEDULE',
          label: node.data.label,
          week: node.data.week ?? {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
          },
          flowId: node.data.flowId ?? null,
          parentId: node.data.parentId ?? null,
        };
      case 'REDIRECT_BOT':
        return {
          type: 'REDIRECT_BOT',
          label: node.data.label,
          targetBotId: node.data.targetBotId,
          flowId: node.data.flowId ?? null,
          parentId: node.data.parentId ?? null,
        };
      case 'REDIRECT_AGENT':
        return {
          type: 'REDIRECT_AGENT',
          label: node.data.label,
          agentId: node.data.agentId,
          flowId: node.data.flowId ?? null,
          parentId: node.data.parentId ?? null,
        };
      case 'AI':
        return {
          type: 'AI',
          label: node.data.label,
          prompt: node.data.prompt,
          model: node.data.model,
          flowId: node.data.flowId ?? null,
          parentId: node.data.parentId ?? null,
        };
      case 'SET_VARIABLE':
        return {
          type: 'SET_VARIABLE',
          label: node.data.label,
          variable: node.data.variable,
          value: node.data.value,
          flowId: node.data.flowId ?? null,
          parentId: node.data.parentId ?? null,
        };
      case 'END':
        return {
          type: 'END',
          label: node.data.label,
          flowId: node.data.flowId ?? null,
          parentId: node.data.parentId ?? null,
        };
    }
  })();
  // Forzamos el tipo de data a 'any' para cumplir con SerializedNode y evitar error de tipos discriminados
  return { ...base, data: data as FlowNodeData };
}

// Crea un nodo inicial estrictamente tipado según el tipo discriminado
function createNode(type: FlowNodeType, position: XYPosition): FlowBuilderNode {
  const id = uuidv4();
  let data: FlowNodeData;
  switch (type) {
    case 'START':
      data = { type: 'START', label: 'Inicio' };
      break;
    case 'TEXT':
      data = {
        type: 'TEXT',
        label: 'Mensaje',
        message: '',
        messageKind: 'TEXT',
        options: [],
        waitForResponse: false,
        responseVariableName: null,
        responseVariableType: 'STRING',
        audioModel: null,
        imageModel: null,
      };
      break;
    case 'CAPTURE':
      data = {
        type: 'CAPTURE',
        label: 'Capturador',
        message: '',
        responseVariableName: 'response',
        responseVariableType: 'STRING',
        audioModel: null,
        imageModel: null,
        waitForResponse: true,
      };
      break;
    case 'CONDITIONAL':
      data = {
        type: 'CONDITIONAL',
        label: 'Condicional',
        sourceVariable: '',
        evaluations: [
          {
            id: uuidv4(),
            label: 'Es igual a 1',
            operator: 'EQUALS',
            value: '1',
            targetId: null,
          },
        ],
        defaultLabel: 'Otro...',
        defaultTargetId: null,
        defaultConditionId: uuidv4(),
      };
      break;
    case 'DELAY':
      data = {
        type: 'DELAY',
        label: 'Espera',
        seconds: 1,
      };
      break;
    case 'SCHEDULE':
      data = {
        type: 'SCHEDULE',
        label: 'Horario',
        week: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        },
      };
      break;
    case 'REDIRECT_BOT':
      data = {
        type: 'REDIRECT_BOT',
        label: 'Redirigir a Bot',
        targetBotId: '',
      };
      break;
    case 'REDIRECT_AGENT':
      data = {
        type: 'REDIRECT_AGENT',
        label: 'Redirigir a Agente',
        agentId: '',
      };
      break;
    case 'AI':
      data = {
        type: 'AI',
        label: 'Consulta IA',
        prompt: '',
        model: '',
      };
      break;
    case 'SET_VARIABLE':
      data = {
        type: 'SET_VARIABLE',
        label: 'Setear Variable',
        variable: '',
        value: '',
      };
      break;
    case 'END':
      data = {
        type: 'END',
        label: 'Fin',
      };
      break;
    default:
      throw new Error(`Tipo de nodo no soportado: ${type}`);
  }
  return {
    id,
    position,
    type: DEFAULT_NODE_TYPE,
    data,
  };
}

/**
 * Props para FlowBuilder
 * @param botId ID del bot (opcional)
 * @param botName Nombre del bot (opcional)
 */
interface FlowBuilderProps {
  botId: number;
  botName?: string;
  onBack?: () => void;
}

const FlowBuilderInner: React.FC<FlowBuilderProps> = ({
  botId,
  botName,
  onBack,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<{
    optionId?: string;
    conditionId?: string;
  }>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nodesRef = useRef<FlowBuilderNode[]>([]);
  const edgesRef = useRef<FlowBuilderEdge[]>([]);
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const persistGraphRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const updateNodesState = useCallback(
    (
      updater: (previous: FlowBuilderNode[]) => FlowBuilderNode[]
    ): FlowBuilderNode[] => {
      let nextNodes: FlowBuilderNode[] = [];
      setNodes((previous) => {
        const updated = updater(previous);
        nodesRef.current = updated;
        nextNodes = updated;
        return updated;
      });
      return nextNodes;
    },
    [setNodes]
  );

  const updateEdgesState = useCallback(
    (
      updater: (previous: FlowBuilderEdge[]) => FlowBuilderEdge[]
    ): FlowBuilderEdge[] => {
      let nextEdges: FlowBuilderEdge[] = [];
      setEdges((previous) => {
        const updated = updater(previous);
        edgesRef.current = updated;
        nextEdges = updated;
        return updated;
      });
      return nextEdges;
    },
    [setEdges]
  );

  const buildGraphPayload = useCallback(
    (
      overrideNodes?: FlowBuilderNode[],
      overrideEdges?: FlowBuilderEdge[]
    ): FlowGraphPayload => {
      const referenceNodes = overrideNodes ?? nodesRef.current;
      const referenceEdges = overrideEdges ?? edgesRef.current;

      // Deduplicar nodos por id (filtro de seguridad)
      const nodeIds = new Set<string>();
      const uniqueNodes: FlowBuilderNode[] = [];
      for (const node of referenceNodes) {
        if (!nodeIds.has(node.id)) {
          uniqueNodes.push(node);
          nodeIds.add(node.id);
        }
      }

      return {
        botId,
        nodes: uniqueNodes.map(toSerializedNode),
        edges: referenceEdges.map<SerializedEdge>((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label:
            typeof edge.label === 'string'
              ? edge.label
              : edge.label != null
              ? String(edge.label)
              : null,
          data: edge.data,
        })),
        deleteMissing: true,
      };
    },
    [botId]
  );

  const persistGraph = useCallback(
    async (
      nextNodes?: FlowBuilderNode[],
      nextEdges?: FlowBuilderEdge[]
    ): Promise<void> => {
      const payload = buildGraphPayload(nextNodes, nextEdges);

      try {
        const response = await saveFlowGraph(payload);

        // Mapear los nuevos flowId a los nodos locales
        if (response && Array.isArray(response.nodes)) {
          setNodes((prevNodes) => {
            const idToFlowId = new Map(
              response.nodes.map(({ reactId, flowId }) => [reactId, flowId])
            );

            const updated = prevNodes.map((node) => {
              const newFlowId = idToFlowId.get(node.id);
              if (newFlowId && node.data.flowId !== newFlowId) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    flowId: newFlowId,
                  },
                };
              }
              return node;
            });
            return updated;
          });
        }

        setHasPendingChanges(false);
      } catch (err) {
        console.error('Error al guardar flujo:', err);
      }
    },
    [buildGraphPayload, setNodes]
  );

  // Guardar ref de persistGraph para usarlo en el useEffect de auto-guardado
  useEffect(() => {
    persistGraphRef.current = persistGraph;
  }, [persistGraph]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  // Cargar nodos y edges usando el grafo persistido
  const loadNodesAndEdges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { nodes: nodesFromApi, edges: edgesFromApi } = await getFlowGraph(
        botId
      );
      const normalizedNodes = Array.isArray(nodesFromApi)
        ? nodesFromApi.map(normalizeNodeFromServer)
        : [];
      const normalizedEdges: FlowBuilderEdge[] = Array.isArray(edgesFromApi)
        ? edgesFromApi.map(
            (edge) =>
              ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                data: edge.data,
                label: edge.label ?? undefined,
                type: DEFAULT_NODE_TYPE,
              } as FlowBuilderEdge)
          )
        : [];
      setNodes(normalizedNodes);
      nodesRef.current = normalizedNodes;
      setSelectedNodeId((previous) => {
        if (previous && normalizedNodes.some((node) => node.id === previous)) {
          return previous;
        }
        return normalizedNodes[0]?.id ?? null;
      });
      setEdges(normalizedEdges);
      edgesRef.current = normalizedEdges;
    } catch (err) {
      console.error('Failed to load nodes/edges', err);
      setError('No se pudo cargar el flujo guardado.');
      setNodes([]);
      setEdges([]);
      nodesRef.current = [];
      edgesRef.current = [];
      setSelectedNodeId(null);
    } finally {
      setLoading(false);
    }
  }, [botId, setNodes, setEdges]);

  useEffect(() => {
    void loadNodesAndEdges();
  }, [loadNodesAndEdges]);

  // Auto-guardar cambios con debounce
  useEffect(() => {
    if (!hasPendingChanges || loading || !persistGraphRef.current) return;

    const timer = setTimeout(() => {
      void persistGraphRef.current?.();
    }, 2000); // Guardar 2 segundos después del último cambio

    return () => clearTimeout(timer);
  }, [hasPendingChanges, loading]);

  const syncEdgesForNode = useCallback(
    (node: FlowBuilderNode): FlowBuilderEdge[] => {
      return updateEdgesState((previousEdges: FlowBuilderEdge[]) => {
        if (node.data.type === 'TEXT') {
          const options = (node.data as TextNodeData).options;
          const optionMap = new Map(
            options.map((option) => [option.id, option])
          );
          const nextEdges: FlowBuilderEdge[] = [];

          previousEdges.forEach((edge) => {
            if (edge.source !== node.id) {
              nextEdges.push(edge);
              return;
            }

            const optionId = edge.data?.optionId;
            if (optionId) {
              const option = optionMap.get(optionId);
              if (option && option.targetId) {
                nextEdges.push({
                  ...edge,
                  target: option.targetId,
                  label: option.trigger || option.label,
                  data: { optionId },
                });
              }
              return;
            }
          });

          const existingOptionIds = new Set(
            nextEdges
              .filter((edge) => edge.source === node.id)
              .map((edge) => edge.data?.optionId)
              .filter((value): value is string => Boolean(value))
          );

          const additions: FlowBuilderEdge[] = [];

          options.forEach((option) => {
            if (!option.targetId || existingOptionIds.has(option.id)) return;
            additions.push({
              id: `edge-${option.id}`,
              source: node.id,
              target: option.targetId,
              data: { optionId: option.id },
              label: option.trigger || option.label,
              type: DEFAULT_NODE_TYPE,
            });
          });

          return [...nextEdges, ...additions];
        }

        if (node.data.type === 'CONDITIONAL') {
          const conditionalNode = node.data as ConditionalNodeData;
          const conditionOutputs = new Map<
            string,
            { label: string; targetId: string | null }
          >();
          conditionalNode.evaluations.forEach((evaluation) => {
            conditionOutputs.set(evaluation.id, {
              label: evaluation.label || evaluation.value,
              targetId: evaluation.targetId ?? null,
            });
          });
          const defaultConditionId =
            conditionalNode.defaultConditionId &&
            conditionalNode.defaultConditionId.length
              ? conditionalNode.defaultConditionId
              : `default-${node.id}`;
          conditionOutputs.set(defaultConditionId, {
            label: conditionalNode.defaultLabel || 'Otro',
            targetId: conditionalNode.defaultTargetId ?? null,
          });

          const nextEdges: FlowBuilderEdge[] = [];
          previousEdges.forEach((edge) => {
            if (edge.source !== node.id) {
              nextEdges.push(edge);
              return;
            }

            const conditionId = edge.data?.conditionId;
            if (conditionId) {
              const output = conditionOutputs.get(conditionId);
              if (output && output.targetId) {
                nextEdges.push({
                  ...edge,
                  target: output.targetId,
                  label: output.label,
                  data: { conditionId },
                });
              }
              return;
            }
          });

          const existingConditionIds = new Set(
            nextEdges
              .filter((edge) => edge.source === node.id)
              .map((edge) => edge.data?.conditionId)
              .filter((value): value is string => Boolean(value))
          );

          const additions: FlowBuilderEdge[] = [];
          conditionOutputs.forEach((output, conditionId) => {
            if (!output.targetId || existingConditionIds.has(conditionId)) {
              return;
            }
            additions.push({
              id: `edge-${conditionId}`,
              source: node.id,
              target: output.targetId,
              data: { conditionId },
              label: output.label,
              type: DEFAULT_NODE_TYPE,
            });
          });

          return [...nextEdges, ...additions];
        }

        return previousEdges;
      });
    },
    [updateEdgesState]
  );

  const handleNodeUpdate = useCallback(
    (updatedNode: FlowBuilderNode) => {
      updateNodesState((previousNodes) =>
        previousNodes.map((node) =>
          node.id === updatedNode.id ? updatedNode : node
        )
      );
      syncEdgesForNode(updatedNode);
      setHasPendingChanges(true);
    },
    [updateNodesState, syncEdgesForNode]
  );

  // Agrega un nodo del tipo especificado y persiste el grafo completo
  const addNode = useCallback(
    (type: FlowNodeType) => {
      let position = { ...DEFAULT_POSITION };
      if (reactFlowInstance.current && reactFlowWrapper.current) {
        const bounds = reactFlowWrapper.current.getBoundingClientRect();
        position = reactFlowInstance.current.screenToFlowPosition({
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2,
        });
      }
      const node = createNode(type, position);
      updateNodesState((prev) => prev.concat(node));
      setSelectedNodeId(node.id);
      setHasPendingChanges(true);
    },
    [updateNodesState]
  );

  // Conexión entre nodos según su tipo
  const nodeTypes = useMemo(
    () => ({
      conditionalNode: ConditionalNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      deleteable: DeleteableEdge,
    }),
    []
  );

  const renderedNodes = useMemo(
    () =>
      nodes.map((node) => {
        const isCaptureNode = (node.data as any)?.isCaptureNode === true;
        const nodeType =
          node.data.type === 'CONDITIONAL'
            ? 'conditionalNode'
            : DEFAULT_NODE_TYPE;

        // Generar clases para color-coding y forma
        const nodeDataType = node.data.type || 'default';
        const baseClass = isCaptureNode
          ? 'capture'
          : nodeDataType.toLowerCase();
        const shapeClass = getNodeShapeClass(nodeDataType);

        return {
          ...node,
          type: nodeType,
          className: `flow-node-type-${baseClass} node-${baseClass} ${shapeClass}`,
        };
      }),
    [nodes]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const sourceNode = nodesRef.current.find(
        (candidate) => candidate.id === connection.source
      );
      if (!sourceNode) return;

      // Conexiones especiales para TEXT: agregan una nueva opción
      if (sourceNode.data.type === 'TEXT') {
        const newOption = {
          id: uuidv4(),
          label: '',
          trigger: '',
          targetId: connection.target,
        };

        const options = [
          ...(sourceNode.data as TextNodeData).options,
          newOption,
        ];
        const updatedNode: FlowBuilderNode = {
          ...sourceNode,
          data: {
            ...(sourceNode.data as TextNodeData),
            options,
          },
        };

        handleNodeUpdate(updatedNode);
        return;
      }

      // CAPTURE: conexión directa sin opciones, igual que START/END
      if (sourceNode.data.type === 'CAPTURE') {
        // Para CAPTURE, simplemente crearemos un edge al final del handleConnect
        // No necesitamos hacer nada especial aquí, dejamos que se cree el edge por defecto
        // Continuamos al código que crea el edge...
      }

      // Conexiones especiales para CONDITIONAL: asignan targetId a la evaluación disponible
      if (sourceNode.data.type === 'CONDITIONAL') {
        const conditionalNode = sourceNode.data as ConditionalNodeData & {
          evaluations: ConditionalEvaluation[];
        };
        const handleId = connection.sourceHandle;
        const defaultHandleId =
          conditionalNode.defaultConditionId &&
          conditionalNode.defaultConditionId.length
            ? conditionalNode.defaultConditionId
            : `default-${sourceNode.id}`;

        if (handleId && handleId === defaultHandleId) {
          const updatedNode: FlowBuilderNode = {
            ...sourceNode,
            data: {
              ...conditionalNode,
              defaultConditionId:
                conditionalNode.defaultConditionId ?? defaultHandleId,
              defaultTargetId: connection.target,
            },
          };
          handleNodeUpdate(updatedNode);
          return;
        }

        let targetEvaluation: ConditionalEvaluation | undefined;
        if (handleId) {
          targetEvaluation = conditionalNode.evaluations.find(
            (evaluation) => evaluation.id === handleId
          );
        } else {
          targetEvaluation = conditionalNode.evaluations.find(
            (evaluation) => !evaluation.targetId
          );
        }
        if (!targetEvaluation) return;

        const updatedEvaluations = conditionalNode.evaluations.map(
          (evaluation) =>
            evaluation.id === targetEvaluation!.id
              ? { ...evaluation, targetId: connection.target }
              : evaluation
        );

        const updatedNode: FlowBuilderNode = {
          ...sourceNode,
          data: {
            ...conditionalNode,
            evaluations: updatedEvaluations,
          },
        };

        handleNodeUpdate(updatedNode);
        return;
      }

      // Fallback general: crea un edge directo entre nodos (incluye START)
      let modified = false;
      updateEdgesState((previousEdges) => {
        let working = previousEdges;
        if (sourceNode.data.type === 'START') {
          const filtered = previousEdges.filter(
            (edge) => edge.source !== connection.source
          );
          if (filtered.length !== previousEdges.length) {
            modified = true;
          }
          working = filtered;
        } else {
          working = [...previousEdges];
        }

        const alreadyExists = working.some(
          (edge) =>
            edge.source === connection.source &&
            edge.target === connection.target
        );
        if (alreadyExists) {
          return working;
        }

        modified = true;
        const label = undefined; // Connection object does not have a label property
        return [
          ...working,
          {
            id: `edge-${connection.source}-${connection.target}-${uuidv4()}`,
            source: connection.source!,
            target: connection.target!,
            label,
            type: DEFAULT_NODE_TYPE,
          },
        ];
      });
      if (modified) setHasPendingChanges(true);
    },
    [handleNodeUpdate, updateEdgesState]
  );

  const handleNodesDelete = useCallback(
    (deleted: FlowBuilderNode[]) => {
      if (!deleted.length) return;
      const deletedIds = new Set(deleted.map((node) => node.id));
      const nodesToSync: FlowBuilderNode[] = [];

      updateEdgesState((previousEdges) =>
        previousEdges.filter(
          (edge) => !deletedIds.has(edge.source) && !deletedIds.has(edge.target)
        )
      );

      updateNodesState((previousNodes) => {
        const remaining = previousNodes.filter(
          (node) => !deletedIds.has(node.id)
        );

        return remaining.map((node) => {
          if (node.data.type === 'TEXT') {
            let modified = false;
            const nextOptions = (node.data as TextNodeData).options.map(
              (option) => {
                if (option.targetId && deletedIds.has(option.targetId)) {
                  modified = true;
                  return { ...option, targetId: null };
                }
                return option;
              }
            );
            if (modified) {
              const updatedNode: FlowBuilderNode = {
                ...node,
                data: { ...(node.data as TextNodeData), options: nextOptions },
              };
              nodesToSync.push(updatedNode);
              return updatedNode;
            }
          }

          if (node.data.type === 'CONDITIONAL') {
            let modified = false;
            const conditionalData = node.data as ConditionalNodeData;
            const nextEvaluations = conditionalData.evaluations.map(
              (evaluation) => {
                if (
                  evaluation.targetId &&
                  deletedIds.has(evaluation.targetId)
                ) {
                  modified = true;
                  return { ...evaluation, targetId: null };
                }
                return evaluation;
              }
            );
            let nextDefaultTargetId = conditionalData.defaultTargetId ?? null;
            if (nextDefaultTargetId && deletedIds.has(nextDefaultTargetId)) {
              modified = true;
              nextDefaultTargetId = null;
            }
            if (modified) {
              const updatedNode: FlowBuilderNode = {
                ...node,
                data: {
                  ...conditionalData,
                  evaluations: nextEvaluations,
                  defaultTargetId: nextDefaultTargetId,
                },
              };
              nodesToSync.push(updatedNode);
              return updatedNode;
            }
          }
          return node;
        });
      });

      nodesToSync.forEach((node) => {
        syncEdgesForNode(node);
      });

      setSelectedNodeId((current) =>
        current && deletedIds.has(current) ? null : current
      );

      setHasPendingChanges(true);
    },
    [updateEdgesState, updateNodesState, syncEdgesForNode]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      const targetNode = nodesRef.current.find((node) => node.id === nodeId);
      if (!targetNode) return;
      await handleNodesDelete([targetNode]);
    },
    [handleNodesDelete]
  );

  // Duplicar nodo: solo copiar campos válidos según el tipo discriminado
  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const originalNode = nodesRef.current.find((node) => node.id === nodeId);
      if (!originalNode) return;

      const { data: originalData, ...rest } = originalNode;
      let newData: typeof originalData;
      switch (originalData.type) {
        case 'TEXT':
          newData = {
            ...originalData,
            label: `${originalData.label} (copia)`,
            ...(originalData.buttonSettings
              ? { buttonSettings: { ...originalData.buttonSettings } }
              : {}),
            ...(originalData.listSettings
              ? { listSettings: { ...originalData.listSettings } }
              : {}),
          };
          break;
        case 'CONDITIONAL':
          newData = {
            ...originalData,
            label: `${originalData.label} (copia)`,
          };
          break;
        case 'DELAY':
        case 'SCHEDULE':
        case 'REDIRECT_BOT':
        case 'REDIRECT_AGENT':
        case 'AI':
        case 'SET_VARIABLE':
        case 'END':
        case 'START':
          newData = {
            ...originalData,
            label: `${originalData.label} (copia)`,
          };
          break;
        default:
          throw new Error(
            `Tipo de nodo no soportado en duplicación: ${
              typeof (originalData as { type?: string }).type === 'string'
                ? (originalData as { type: string }).type
                : 'unknown'
            }`
          );
      }

      const newNode: FlowBuilderNode = {
        ...rest,
        id: uuidv4(),
        position: {
          x: originalNode.position.x + 50,
          y: originalNode.position.y + 50,
        },
        data: newData,
      };

      updateNodesState((previous) => previous.concat(newNode));
      setSelectedNodeId(newNode.id);
      setHasPendingChanges(true);
    },
    [updateNodesState]
  );

  // Estado para el tipo de nodo a crear (debe estar dentro del componente)
  const [selectedNodeType, setSelectedNodeType] =
    useState<FlowNodeType>('TEXT');

  return (
    <div className="flow-builder-page">
      <FlowToolbar
        onBack={onBack}
        onTest={() => console.log('Probar flujo')}
        onUploadMedia={() => console.log('Cargar media')}
        onCreateBlock={() => void addNode(selectedNodeType)}
        onOpenPermissions={() => console.log('Permisos')}
        onSave={() => void persistGraph()}
        onSearch={(value) => {
          if (!value) return;
          const match = nodesRef.current.find(
            (node) =>
              node.data.flowId?.toString() === value ||
              node.id.toLowerCase().includes(value.toLowerCase())
          );
          if (match && reactFlowInstance.current) {
            reactFlowInstance.current.setCenter(
              match.position.x,
              match.position.y,
              { zoom: 1.2, duration: 800 }
            );
            setSelectedNodeId(match.id);
          }
        }}
        searchValue=""
        disableActions={loading}
        nodeTypes={[...FLOW_NODE_TYPES]}
        selectedNodeType={selectedNodeType}
        onNodeTypeChange={(type) => setSelectedNodeType(type as FlowNodeType)}
      />
      <div className="flow-builder">
        <div ref={reactFlowWrapper} className="flow-builder__canvas-wrapper">
          <ReactFlow
            nodes={renderedNodes}
            nodeTypes={nodeTypes}
            edges={edges.map((edge) => ({
              ...edge,
              type: 'deleteable',
            }))}
            edgeTypes={edgeTypes}
            onInit={(instance: ReactFlowInstance) => {
              reactFlowInstance.current = instance;
            }}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodesDelete={(deletedNodes) => {
              void handleNodesDelete(deletedNodes);
            }}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={handlePaneClick}
            fitView
            className="flow-builder__canvas"
          >
            <MiniMap />
            <Controls />
            <Background gap={20} />
          </ReactFlow>
          {loading && (
            <div className="flow-builder__overlay">
              <div className="flow-builder__overlay-text">
                Cargando flujos...
              </div>
            </div>
          )}
        </div>

        {!loading && selectedNode && (
          <NodeEditor
            node={selectedNode}
            onChange={(node) => {
              void handleNodeUpdate(node);
            }}
            onDeleteNode={(nodeId) => {
              void handleDeleteNode(nodeId);
            }}
            onDuplicateNode={(nodeId) => {
              void handleDuplicateNode(nodeId);
            }}
          />
        )}
      </div>
    </div>
  );
};

const FlowBuilder: React.FC<FlowBuilderProps> = (props) => (
  <ReactFlowProvider>
    <FlowBuilderInner {...props} />
  </ReactFlowProvider>
);

export default FlowBuilder;
