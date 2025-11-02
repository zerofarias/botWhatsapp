import type { Edge, Node } from 'reactflow';

// Tipos de nodo unificados y alineados con backend/documentación
export const FLOW_NODE_TYPES = [
  'START',
  'TEXT',
  'CAPTURE',
  'CONDITIONAL',
  'DELAY',
  'SCHEDULE',
  'REDIRECT_BOT',
  'REDIRECT_AGENT',
  'AI',
  'SET_VARIABLE',
  'END',
] as const;

export type FlowNodeType = (typeof FLOW_NODE_TYPES)[number];

export const FLOW_NODE_TYPE_LABELS: Record<FlowNodeType, string> = {
  START: 'Inicio',
  TEXT: 'Mensaje de Texto',
  CAPTURE: 'Capturador de Respuesta',
  CONDITIONAL: 'Condicional',
  DELAY: 'Espera',
  SCHEDULE: 'Horario',
  REDIRECT_BOT: 'Redirigir a Bot',
  REDIRECT_AGENT: 'Redirigir a Agente',
  AI: 'Consulta IA',
  SET_VARIABLE: 'Setear Variable',
  END: 'Fin del Flujo',
};

export const FLOW_NODE_TYPE_DESCRIPTIONS: Record<FlowNodeType, string> = {
  START: 'Nodo de inicio del flujo, no editable.',
  TEXT: 'Envía un mensaje de texto, puede esperar respuesta y guardar en variable.',
  CAPTURE:
    'Captura la próxima respuesta del usuario y la guarda en una variable de contexto.',
  CONDITIONAL: 'Evalúa una condición y ramifica el flujo.',
  DELAY: 'Espera una cantidad de segundos antes de continuar.',
  SCHEDULE: 'Evalúa si la hora actual está dentro de un rango y ramifica.',
  REDIRECT_BOT: 'Transfiere la conversación a otro bot.',
  REDIRECT_AGENT: 'Asigna la conversación a un agente humano.',
  AI: 'Consulta un modelo de IA y procesa la respuesta.',
  SET_VARIABLE: 'Guarda o modifica una variable en el contexto.',
  END: 'Termina el flujo.',
};

export type FlowMessageKind = 'TEXT' | 'BUTTONS' | 'LIST';

export interface FlowOption {
  id: string;
  label: string;
  trigger: string;
  targetId: string | null;
}

export type FlowConditionMatchMode = 'EXACT' | 'CONTAINS' | 'REGEX';

export type FlowVariableType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';

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

// Interfaces discriminadas para cada tipo de nodo
export type FlowNodeData =
  | StartNodeData
  | TextNodeData
  | CaptureNodeData
  | ConditionalNodeData
  | DelayNodeData
  | ScheduleNodeData
  | RedirectBotNodeData
  | RedirectAgentNodeData
  | AINodeData
  | SetVariableNodeData
  | EndNodeData;

// Permite cargar nodos legacy 'MENU' como si fueran TEXT
export type LegacyMenuNodeData = Omit<TextNodeData, 'type'> & { type: 'MENU' };
export type FlowNodeDataWithLegacy = FlowNodeData | LegacyMenuNodeData;

export interface BaseNodeData {
  label: string;
  type: FlowNodeType;
  flowId?: number | null;
  parentId?: number | null;
}

export interface StartNodeData extends BaseNodeData {
  type: 'START';
}

export interface TextNodeData extends BaseNodeData {
  type: 'TEXT';
  message: string;
  messageKind: FlowMessageKind;
  options: FlowOption[];
  waitForResponse?: boolean;
  responseVariableName?: string | null;
  responseVariableType?: FlowVariableType;
  audioModel?: string | null;
  imageModel?: string | null;
  /**
   * Legacy field usado antes de introducir responseVariableName/Type.
   * Se mantiene por compatibilidad al normalizar nodos existentes.
   */
  saveResponseToVariable?: string | null;
  buttonSettings?: ButtonSettings;
  listSettings?: ListSettings;
}

export interface CaptureNodeData extends BaseNodeData {
  type: 'CAPTURE';
  message: string;
  responseVariableName: string;
  responseVariableType?: FlowVariableType;
  audioModel?: string | null;
  imageModel?: string | null;
  waitForResponse?: boolean; // Siempre true para capturadores
}

export interface ConditionalNodeData extends BaseNodeData {
  type: 'CONDITIONAL';
  sourceVariable: string;
  evaluations: ConditionalEvaluation[];
  defaultLabel?: string;
  defaultTargetId?: string | null;
  defaultConditionId?: string;
}

export type ConditionalOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'REGEX';

export interface ConditionalEvaluation {
  id: string;
  label: string;
  operator: ConditionalOperator;
  value: string;
  targetId?: string | null;
}

export interface DelayNodeData extends BaseNodeData {
  type: 'DELAY';
  seconds: number;
}

// Horarios por día: cada día puede tener varios rangos [{from, to}]
export type ScheduleDay = {
  from: string;
  to: string;
};

export type ScheduleWeek = {
  monday?: ScheduleDay[];
  tuesday?: ScheduleDay[];
  wednesday?: ScheduleDay[];
  thursday?: ScheduleDay[];
  friday?: ScheduleDay[];
  saturday?: ScheduleDay[];
  sunday?: ScheduleDay[];
};

export interface ScheduleNodeData extends BaseNodeData {
  type: 'SCHEDULE';
  week: ScheduleWeek;
}

export interface RedirectBotNodeData extends BaseNodeData {
  type: 'REDIRECT_BOT';
  targetBotId: number | '';
}

export interface RedirectAgentNodeData extends BaseNodeData {
  type: 'REDIRECT_AGENT';
  agentId: number | '';
}

export interface AINodeData extends BaseNodeData {
  type: 'AI';
  prompt: string;
  model: string;
}

export interface SetVariableNodeData extends BaseNodeData {
  type: 'SET_VARIABLE';
  variable: string;
  value: string;
}

export interface EndNodeData extends BaseNodeData {
  type: 'END';
}

export type FlowBuilderNode = Node<FlowNodeData>;

export type FlowBuilderEdge = Edge<{ optionId?: string; conditionId?: string }>;

export interface FlowGraphPayload {
  botId: number;
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
  data: FlowNodeDataWithLegacy;
}

export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string | null;
  data?: { optionId?: string; conditionId?: string };
}

export interface FlowGraphResponse {
  nodes: SerializedNode[];
  edges: SerializedEdge[];
}
