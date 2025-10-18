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
  FlowGraphPayload,
  FlowGraphResponse,
  FlowNodeData,
  FlowOption,
  SaveGraphResponse,
  SerializedEdge,
  SerializedNode,
  ButtonSettings,
  ListSettings,
} from './types';
import { getFlowGraph, saveFlowGraph } from '../../api/flows';
import './flow-builder.css';

const DEFAULT_POSITION: XYPosition = { x: 160, y: 120 };
const DEFAULT_NODE_TYPE = 'default';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizePosition(
  position?: { x: number; y: number } | null
): XYPosition {
  if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
    return { x: position.x, y: position.y };
  }
  return { ...DEFAULT_POSITION };
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return undefined;
}

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

function normalizeNodeFromServer(node: SerializedNode): FlowBuilderNode {
  const sanitizedOptions = sanitizeOptions(node.data?.options);
  const messageKind = (node.data?.messageKind as string | undefined) ?? 'TEXT';
  const buttonSettings = sanitizeButtonSettingsValue(
    node.data?.buttonSettings as ButtonSettings | undefined
  );
  const listSettings = sanitizeListSettingsValue(
    node.data?.listSettings as ListSettings | undefined
  );

  return {
    id: node.id,
    type: node.type ?? DEFAULT_NODE_TYPE,
    position: normalizePosition(node.position),
    data: {
      label: node.data?.label ?? 'Nodo',
      message: node.data?.message ?? '',
      type: node.data?.type ?? 'MENU',
      options: sanitizedOptions,
      flowId:
        typeof node.data?.flowId === 'number'
          ? node.data?.flowId
          : node.data?.flowId ?? null,
      messageKind:
        messageKind === 'BUTTONS' || messageKind === 'LIST'
          ? messageKind
          : 'TEXT',
      buttonSettings,
      listSettings,
    },
  };
}

function normalizeEdgeFromServer(edge: SerializedEdge): FlowBuilderEdge {
  const data =
    edge.data && typeof edge.data === 'object'
      ? edge.data
      : edge.data === undefined
      ? {}
      : {};

  return {
    id:
      typeof edge.id === 'string' && edge.id.length > 0
        ? edge.id
        : `edge-${edge.source}-${edge.target}-${Math.random()}`,
    source: edge.source,
    target: edge.target,
    label: edge.label ?? '',
    data,
    type: 'default',
  };
}

function toSerializedNode(node: FlowBuilderNode): SerializedNode {
  const buttonSettings = sanitizeButtonSettingsValue(node.data.buttonSettings);
  const listSettings = sanitizeListSettingsValue(node.data.listSettings);

  return {
    id: node.id,
    type: node.type ?? DEFAULT_NODE_TYPE,
    position: node.position ?? { ...DEFAULT_POSITION },
    data: {
      label: node.data.label,
      message: node.data.message,
      type: node.data.type,
      options: sanitizeOptions(node.data.options),
      flowId: node.data.flowId ?? null,
      messageKind: node.data.messageKind ?? 'TEXT',
      ...(buttonSettings ? { buttonSettings } : {}),
      ...(listSettings ? { listSettings } : {}),
    },
  };
}

function toSerializedEdge(edge: FlowBuilderEdge): SerializedEdge {
  const sanitizedData =
    edge.data && typeof edge.data === 'object' ? edge.data : undefined;
  const label = typeof edge.label === 'string' ? edge.label : '';

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label,
    data: sanitizedData,
  };
}

function createNode(position: XYPosition): FlowBuilderNode {
  return {
    id: uuidv4(),
    position,
    type: DEFAULT_NODE_TYPE,
    data: {
      label: 'Nuevo menu',
      message: '',
      type: 'MENU',
      options: [],
      flowId: null,
      messageKind: 'TEXT',
    },
  };
}

const FlowBuilderInner: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<{ optionId?: string }>(
    []
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nodesRef = useRef<FlowBuilderNode[]>([]);
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: FlowGraphResponse = await getFlowGraph();
      const normalizedNodes = response.nodes.map(normalizeNodeFromServer);
      const normalizedEdges = response.edges.map(normalizeEdgeFromServer);

      setNodes(normalizedNodes);
      setEdges(normalizedEdges);
      nodesRef.current = normalizedNodes;

      setSelectedNodeId((previous) => {
        if (previous && normalizedNodes.some((node) => node.id === previous)) {
          return previous;
        }
        return normalizedNodes[0]?.id ?? null;
      });
    } catch (err) {
      console.error('Failed to load flow graph', err);
      setError('No se pudo cargar el flujo guardado.');
      setNodes([]);
      setEdges([]);
      nodesRef.current = [];
      setSelectedNodeId(null);
    } finally {
      setLoading(false);
    }
  }, [setEdges, setNodes]);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  const syncEdgesForNode = useCallback(
    (node: FlowBuilderNode) => {
      setEdges((previousEdges: FlowBuilderEdge[]) => {
        const optionMap = new Map(
          node.data.options.map((option) => [option.id, option])
        );

        const retainedEdges = previousEdges
          .filter((edge) => {
            if (edge.source !== node.id) return true;
            const optionId = edge.data?.optionId;
            if (!optionId) {
              return false;
            }
            const option = optionMap.get(optionId);
            return Boolean(option && option.targetId);
          })
          .map((edge) => {
            if (edge.source !== node.id) return edge;
            const option = optionMap.get(edge.data?.optionId ?? '');
            if (!option || !option.targetId) {
              return edge;
            }
            return {
              ...edge,
              target: option.targetId,
              label: option.trigger || option.label,
            };
          });

        const existingOptionIds = new Set(
          retainedEdges
            .filter((edge) => edge.source === node.id)
            .map((edge) => edge.data?.optionId)
            .filter((value): value is string => Boolean(value))
        );

        const additions: FlowBuilderEdge[] = [];
        node.data.options.forEach((option) => {
          if (!option.targetId) return;
          if (existingOptionIds.has(option.id)) return;
          additions.push({
            id: `edge-${option.id}`,
            source: node.id,
            target: option.targetId,
            data: { optionId: option.id },
            label: option.trigger || option.label,
            type: DEFAULT_NODE_TYPE,
          });
        });

        return [...retainedEdges, ...additions];
      });
    },
    [setEdges]
  );

  const handleNodeUpdate = useCallback(
    (updatedNode: FlowBuilderNode) => {
      setNodes((previousNodes) =>
        previousNodes.map((node) =>
          node.id === updatedNode.id ? updatedNode : node
        )
      );
      syncEdgesForNode(updatedNode);
    },
    [setNodes, syncEdgesForNode]
  );

  const addNode = useCallback(() => {
    let position = { ...DEFAULT_POSITION };

    if (reactFlowInstance.current && reactFlowWrapper.current) {
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      position = reactFlowInstance.current.screenToFlowPosition({
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      });
    }

    const node = createNode(position);
    setNodes((previous) => previous.concat(node));
    setSelectedNodeId(node.id);
  }, [setNodes]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const sourceNode = nodesRef.current.find(
        (candidate) => candidate.id === connection.source
      );
      if (!sourceNode) return;

      const newOption = {
        id: uuidv4(),
        label: '',
        trigger: '',
        targetId: connection.target,
      };

      const updatedNode: FlowBuilderNode = {
        ...sourceNode,
        data: {
          ...sourceNode.data,
          options: [...sourceNode.data.options, newOption],
        },
      };

      handleNodeUpdate(updatedNode);
    },
    [handleNodeUpdate]
  );

  const handleNodesDelete = useCallback(
    (deleted: FlowBuilderNode[]) => {
      const deletedIds = new Set(deleted.map((node) => node.id));
      const nodesToSync: FlowBuilderNode[] = [];

      setEdges((previousEdges) =>
        previousEdges.filter(
          (edge) => !deletedIds.has(edge.source) && !deletedIds.has(edge.target)
        )
      );

      setNodes((previousNodes) => {
        const remaining = previousNodes.filter(
          (node) => !deletedIds.has(node.id)
        );

        return remaining.map((node) => {
          let modified = false;
          const nextOptions = node.data.options.map((option) => {
            if (option.targetId && deletedIds.has(option.targetId)) {
              modified = true;
              return { ...option, targetId: null };
            }
            return option;
          });

          if (modified) {
            const updatedNode: FlowBuilderNode = {
              ...node,
              data: { ...node.data, options: nextOptions },
            };
            nodesToSync.push(updatedNode);
            return updatedNode;
          }

          return node;
        });
      });

      nodesToSync.forEach((node) => syncEdgesForNode(node));
      setSelectedNodeId((current) =>
        current && deletedIds.has(current) ? null : current
      );
    },
    [setEdges, setNodes, syncEdgesForNode]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const targetNode = nodesRef.current.find((node) => node.id === nodeId);
      if (!targetNode) return;
      handleNodesDelete([targetNode]);
    },
    [handleNodesDelete]
  );

  const handleSave = useCallback(async () => {
    const serializedNodes: SerializedNode[] = nodes.map(toSerializedNode);
    const serializedEdges: SerializedEdge[] = edges.map(toSerializedEdge);

    const payload: FlowGraphPayload = {
      nodes: serializedNodes,
      edges: serializedEdges,
      deleteMissing: true,
    };

    setSaving(true);
    try {
      const response: SaveGraphResponse = await saveFlowGraph(payload);
      if (Array.isArray(response?.nodes)) {
        setNodes((previousNodes) =>
          previousNodes.map((node) => {
            const mapping = response.nodes.find(
              (entry) => entry.reactId === node.id
            );
            if (!mapping) return node;
            if (node.data.flowId === mapping.flowId) return node;
            return {
              ...node,
              data: { ...node.data, flowId: mapping.flowId },
            };
          })
        );
      }
      await loadGraph();
      window.alert('Flujo guardado correctamente');
    } catch (error) {
      console.error('Error saving flow graph', error);
      window.alert('No se pudo guardar el flujo. Reintenta en unos segundos.');
    } finally {
      setSaving(false);
    }
  }, [edges, loadGraph, nodes, setNodes]);

  const isBusy = saving || loading;

  return (
    <div className="flow-builder">
      <aside className="flow-builder__sidebar">
        <h2 className="flow-builder__title">Flow Builder</h2>
        <button
          type="button"
          onClick={addNode}
          className="flow-builder__button flow-builder__button--primary"
          disabled={loading}
        >
          Nuevo nodo
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isBusy}
          className={`flow-builder__button flow-builder__button--success ${
            isBusy ? 'is-disabled' : ''
          }`}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={() => void loadGraph()}
          disabled={loading}
          className="flow-builder__button flow-builder__button--secondary"
        >
          {loading ? 'Cargando...' : 'Recargar'}
        </button>
        {error && (
          <p className="flow-builder__status flow-builder__status--error">
            {error}
          </p>
        )}
        {!loading && !error && nodes.length === 0 && (
          <p className="flow-builder__status">
            No hay flujos guardados. Crea un nodo para comenzar.
          </p>
        )}
        <p className="flow-builder__helper">
          Arrastra, conecta y edita cada nodo para modelar el flujo de
          conversacion. Usa el panel derecho para configurar mensajes y
          disparadores.
        </p>
      </aside>

      <div ref={reactFlowWrapper} className="flow-builder__canvas-wrapper">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onInit={(instance: ReactFlowInstance) => {
            reactFlowInstance.current = instance;
          }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodesDelete={handleNodesDelete}
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
            <div className="flow-builder__overlay-text">Cargando flujos...</div>
          </div>
        )}
      </div>

      {!loading && selectedNode && (
        <NodeEditor
          node={selectedNode}
          allNodes={nodes}
          onChange={handleNodeUpdate}
          onDeleteNode={handleDeleteNode}
        />
      )}
    </div>
  );
};

const FlowBuilder: React.FC = () => (
  <ReactFlowProvider>
    <FlowBuilderInner />
  </ReactFlowProvider>
);

export default FlowBuilder;
