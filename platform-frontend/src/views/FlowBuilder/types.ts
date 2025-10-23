import type { Edge, Node } from 'reactflow';

export const FLOW_NODE_TYPES = [
  'MENU',
  'MESSAGE',
  'ACTION',
  'REDIRECT',
  'END',
  'PREGUNTA_GUARDAR',
] as const;

export type FlowNodeType = (typeof FLOW_NODE_TYPES)[number];

export const FLOW_NODE_TYPE_LABELS: Record<FlowNodeType, string> = {
  MENU: 'Menú',
  MESSAGE: 'Mensaje',
  ACTION: 'Acción',
  REDIRECT: 'Agente',
  END: 'Finalizar',
  PREGUNTA_GUARDAR: 'Pregunta y Guarda',
};

export const FLOW_NODE_TYPE_DESCRIPTIONS: Record<FlowNodeType, string> = {
  MENU: 'Presenta opciones numéricas al contacto',
  MESSAGE: 'Envía un texto simple o interactivo',
  ACTION: 'Reserva para integraciones futuras',
  REDIRECT: 'Deriva la conversación a un agente/área',
  END: 'Finaliza la automatización en este punto',
  PREGUNTA_GUARDAR:
    'Pregunta al usuario y guarda la respuesta en una variable de contexto',
};

export type FlowMessageKind = 'TEXT' | 'BUTTONS' | 'LIST';

export interface FlowOption {
  id: string;
  label: string;
  trigger: string;
  targetId: string | null;
}

export type FlowConditionMatchMode = 'EXACT' | 'CONTAINS' | 'REGEX';

export interface FlowCondition {
  id: string;
  label: string;
  match: string;
  matchMode: FlowConditionMatchMode;
  targetId: string | null;
}

export interface ButtonSettings {
  title?: string;
  footer?: string;
}

export interface ListSettings {
  buttonText?: string;
  title?: string;
  description?: string;
}

export interface FlowNodeData {
  label: string;
  message: string;
  type: FlowNodeType;
  options: FlowOption[];
  conditions: FlowCondition[];
  areaId: number | null;
  flowId?: number | null;
  parentId?: number | null;
  messageKind: FlowMessageKind;
  saveResponseToVariable?: string | null;
  buttonSettings?: ButtonSettings;
  listSettings?: ListSettings;
}

export type FlowBuilderNode = Node<FlowNodeData>;

export type FlowBuilderEdge = Edge<{ optionId?: string; conditionId?: string }>;

export interface FlowGraphPayload {
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  deleteMissing?: boolean;
}

export interface SaveGraphResponse {
  success: boolean;
  nodes: Array<{ reactId: string; flowId: number }>;
  deletedFlowIds?: number[];
}

export interface SerializedNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: FlowNodeData;
}

export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
  label?: string | null;
  data?: { optionId?: string; conditionId?: string };
}

export interface FlowGraphResponse {
  nodes: SerializedNode[];
  edges: SerializedEdge[];
}
