import type { Edge, Node } from 'reactflow';

export const FLOW_NODE_TYPES = [
  'MENU',
  'MESSAGE',
  'ACTION',
  'REDIRECT',
  'END',
] as const;

export type FlowNodeType = (typeof FLOW_NODE_TYPES)[number];

export type FlowMessageKind = 'TEXT' | 'BUTTONS' | 'LIST';

export interface FlowOption {
  id: string;
  label: string;
  trigger: string;
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
  flowId?: number | null;
  messageKind: FlowMessageKind;
  buttonSettings?: ButtonSettings;
  listSettings?: ListSettings;
}

export type FlowBuilderNode = Node<FlowNodeData>;

export type FlowBuilderEdge = Edge<{ optionId?: string }>;

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
  data?: { optionId?: string };
}

export interface FlowGraphResponse {
  nodes: SerializedNode[];
  edges: SerializedEdge[];
}
