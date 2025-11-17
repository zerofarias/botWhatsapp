// Servicio principal para ejecutar nodos del Flow Builder
import { prisma } from '../config/prisma.js';
import type { ConversationContext } from './flow.service';
import { generateGroqResponse } from './groq.service.js';

/**
 * Interfaz para datos de contacto que se pueden obtener de la conversación
 */
export interface ContactGlobalData {
  userPhone?: string | null;
  contactName?: string | null;
  dni?: string | null;
  email?: string | null;
  areaId?: number | null;
  conversationStatus?: string | null;
}

/**
 * Enriquece el contexto con variables globales del contacto
 * Las variables globales son accesibles en todos los nodos del flujo
 */
export function enrichContextWithGlobalVariables(
  context: ConversationContext,
  contactData: ContactGlobalData
): ConversationContext {
  return {
    ...context,
    GLOBAL_numTelefono: contactData.userPhone ?? '',
    GLOBAL_nombre: contactData.contactName ?? '',
    GLOBAL_nombreContacto: contactData.contactName ?? '',
    GLOBAL_dni: contactData.dni ?? '',
    GLOBAL_email: contactData.email ?? '',
    GLOBAL_areaId: contactData.areaId ?? '',
    GLOBAL_conversationStatus: contactData.conversationStatus ?? '',
  };
}

type BuilderCondition = {
  id?: string;
  label?: string;
  match?: string;
  matchMode?: string;
  operator?: string;
  targetId?: string | null;
};

import {
  evaluateScheduleNode,
  type ScheduleEvaluationInput,
  type ScheduleWeekConfig,
} from './schedule.service.js';

type BuilderMetadata = {
  waitForResponse?: boolean;
  responseVariableName?: string;
  responseVariableType?: string;
  audioModel?: string | null;
  imageModel?: string | null;
  messageType?: string;
  buttonTitle?: string | null;
  buttonFooter?: string | null;
  listButtonText?: string | null;
  listTitle?: string | null;
  listDescription?: string | null;
  sourceVariable?: string | null;
  defaultLabel?: string | null;
  defaultTargetId?: string | null;
  defaultConditionId?: string | null;
  conditions?: BuilderCondition[];
  // SET_VARIABLE
  variable?: string;
  value?: string;
  // AI
  prompt?: string;
  model?: string;
  // SCHEDULE
  week?: ScheduleWeekConfig;
  timezone?: string | null;
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

const CONDITIONAL_OPERATOR_SET = new Set<ConditionOperator>([
  'EQUALS',
  'NOT_EQUALS',
  'CONTAINS',
  'STARTS_WITH',
  'ENDS_WITH',
  'GREATER_THAN',
  'LESS_THAN',
  'REGEX',
]);

export interface ExecuteNodeInput {
  botId: number;
  nodeId: number;
  context: ConversationContext;
  capturedVariableName?: string | null;
}

export interface ExecuteNodeResult {
  nextNodeId: number | null;
  updatedContext: ConversationContext;
  actions: Array<{ type: string; payload?: unknown }>;
}

export function extractBuilderMetadata(metadata: unknown): BuilderMetadata {
  let root: unknown = metadata;

  if (typeof root === 'string') {
    try {
      root = JSON.parse(root);
    } catch {
      return {};
    }
  }

  if (!root || typeof root !== 'object') {
    return {};
  }

  const builderValue = (root as Record<string, unknown>).builder;
  let builder: unknown = builderValue;

  if (typeof builderValue === 'string') {
    try {
      builder = JSON.parse(builderValue);
    } catch {
      builder = {};
    }
  }

  if (builder && typeof builder === 'object') {
    return builder as BuilderMetadata;
  }

  return {};
}

function normalizeToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

/**
 * Procesa contenido con imágenes base64
 * Si detecta imagen: retorna texto previo + "📸 ENVÍO UNA IMAGEN"
 * Si no hay imagen: retorna el contenido tal cual
 */
function processImageContent(content: string): string {
  if (!content || typeof content !== 'string') return '';

  const hasImageBase64 =
    content.includes('/9j/4AAQSkZJRg') || content.includes('data:image');

  if (!hasImageBase64) return content;

  // Patrones para detectar imágenes en base64
  const base64ImagePatterns = [
    /(\n)?\/9j\/4AAQSkZJRg[\w+/]*={0,2}/g, // JPEG
    /data:image\/[^;]*;base64,[A-Za-z0-9+/]*={0,2}/g, // data:image URIs
    /data:application\/pdf;base64,[A-Za-z0-9+/]*={0,2}/g, // PDFs
  ];

  for (const pattern of base64ImagePatterns) {
    const match = content.match(pattern);
    if (match && match.index !== undefined) {
      const textBefore = content.substring(0, match.index).trim();
      if (textBefore) {
        return `${textBefore}\n📸 ENVÍO UNA IMAGEN`;
      } else {
        return '📸 ENVÍO UNA IMAGEN';
      }
    }
  }

  return content;
}
function normalizeToNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  return null;
}

function normalizeOperator(raw?: string): ConditionOperator {
  if (!raw) return 'EQUALS';
  const upper = raw.toUpperCase() as ConditionOperator;
  return CONDITIONAL_OPERATOR_SET.has(upper) ? upper : 'EQUALS';
}

/**
 * Reemplaza $$variableName con el valor de la variable en el contexto
 * Ejemplo: "Hola $$nombre" con context {nombre: "Juan"} -> "Hola Juan"
 */
export function interpolateVariables(
  message: string,
  context: ConversationContext
): string {
  if (!message || typeof message !== 'string') return message;

  return message.replace(/\$\$(\w+)/g, (match, varName) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (context as any)[varName];
    if (value === null || value === undefined) {
      return match; // Si no existe la variable, dejar como está
    }
    return normalizeToString(value);
  });
}

function evaluateConditional(
  actual: unknown,
  expectedValue: string,
  operator: ConditionOperator
): boolean {
  const expected = expectedValue ?? '';
  const actualStr = normalizeToString(actual);
  switch (operator) {
    case 'EQUALS':
      return actualStr === expected;
    case 'NOT_EQUALS':
      return actualStr !== expected;
    case 'CONTAINS':
      return actualStr.includes(expected);
    case 'STARTS_WITH':
      return actualStr.startsWith(expected);
    case 'ENDS_WITH':
      return actualStr.endsWith(expected);
    case 'REGEX':
      try {
        const regex = new RegExp(expected);
        return regex.test(actualStr);
      } catch {
        return false;
      }
    case 'GREATER_THAN': {
      const actualNum = normalizeToNumber(actual);
      const expectedNum = normalizeToNumber(expected);
      if (actualNum === null || expectedNum === null) {
        return actualStr > expected;
      }
      return actualNum > expectedNum;
    }
    case 'LESS_THAN': {
      const actualNum = normalizeToNumber(actual);
      const expectedNum = normalizeToNumber(expected);
      if (actualNum === null || expectedNum === null) {
        return actualStr < expected;
      }
      return actualNum < expectedNum;
    }
    default:
      return false;
  }
}

function extractHandleId(trigger?: string | null): string | null {
  if (!trigger || typeof trigger !== 'string') return null;
  if (trigger.includes('||')) {
    const [handleId] = trigger.split('||');
    return handleId || null;
  }
  if (trigger.startsWith('handle:')) {
    return trigger.slice('handle:'.length) || null;
  }
  return null;
}

function mapConnectionsByHandle(
  connections: Array<{ trigger: string | null; toId: number }>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const connection of connections) {
    const handleId = extractHandleId(connection.trigger);
    if (handleId) {
      map.set(handleId, connection.toId);
    }
  }
  return map;
}

export async function executeNode({
  botId,
  nodeId,
  context,
  capturedVariableName,
}: ExecuteNodeInput): Promise<ExecuteNodeResult> {
  const node = await prisma.flow.findUnique({
    where: { id: nodeId },
  });
  if (!node) {
    throw new Error(`Nodo ${nodeId} no encontrado`);
  }
  if (node.botId !== botId) {
    throw new Error('El nodo no pertenece al bot indicado');
  }

  const connections = await prisma.flowConnection.findMany({
    where: { fromId: nodeId },
    orderBy: { id: 'asc' },
  });
  const resolveNextNodeId = (): number | null =>
    connections.length ? connections[0]!.toId : null;

  const builderMeta = extractBuilderMetadata(node.metadata);
  const updatedContext: ConversationContext = { ...context };
  const actions: Array<{ type: string; payload?: unknown }> = [];
  let nextNodeId: number | null = null;

  const sendMessage = () => {
    if (!node.message) return;
    const interpolatedMessage = interpolateVariables(
      node.message,
      updatedContext
    );
    actions.push({
      type: 'send_message',
      payload: {
        message: interpolatedMessage,
        builder: builderMeta,
        nodeId: node.id,
        type: node.type,
      },
    });
  };

  switch (node.type) {
    case 'START': {
      sendMessage();
      nextNodeId = resolveNextNodeId();
      break;
    }
    case 'TEXT': {
      const shouldWait =
        Boolean(builderMeta.waitForResponse) &&
        typeof builderMeta.responseVariableName === 'string' &&
        builderMeta.responseVariableName.length > 0;

      const alreadyCaptured =
        shouldWait && capturedVariableName === builderMeta.responseVariableName;

      if (!alreadyCaptured) {
        sendMessage();
      }

      if (shouldWait && !alreadyCaptured) {
        updatedContext.waitingForInput = true;
        updatedContext.waitingVariable =
          builderMeta.responseVariableName ?? null;
        nextNodeId = node.id;
      } else {
        updatedContext.waitingForInput = false;
        updatedContext.waitingVariable = null;
        nextNodeId = resolveNextNodeId();
      }
      break;
    }
    case 'CAPTURE': {
      // CAPTURE es como TEXT que siempre espera respuesta
      sendMessage();

      const variableName =
        typeof builderMeta.responseVariableName === 'string'
          ? builderMeta.responseVariableName
          : null;

      updatedContext.waitingForInput = true;
      updatedContext.waitingVariable = variableName;
      nextNodeId = node.id;
      break;
    }
    case 'CONDITIONAL': {
      updatedContext.waitingForInput = false;
      updatedContext.waitingVariable = null;

      let sourceVariable =
        typeof builderMeta.sourceVariable === 'string'
          ? builderMeta.sourceVariable
          : '';

      // Si sourceVariable está vacío, intentar usar waitingVariable del contexto
      // (la variable que guardó el último CAPTURE)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (
        !sourceVariable &&
        typeof (updatedContext as any).waitingVariable === 'string'
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sourceVariable = (updatedContext as any).waitingVariable;
        console.log(
          `[CONDITIONAL] Node ${node.id}: sourceVariable estaba vacío, usando waitingVariable="${sourceVariable}"`
        );
      }

      // Buscar la variable en el contexto raíz (context.variableName)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const variableValue = sourceVariable
        ? (updatedContext as any)[sourceVariable]
        : undefined;

      console.log(
        `[CONDITIONAL] Node ${
          node.id
        }: sourceVariable="${sourceVariable}", variableValue="${variableValue}", context keys: ${Object.keys(
          updatedContext
        ).join(', ')}`
      );

      const evaluations = Array.isArray(builderMeta.conditions)
        ? builderMeta.conditions
        : [];

      let matchedConditionId: string | null = null;
      for (const condition of evaluations) {
        const conditionId =
          condition && typeof condition.id === 'string' ? condition.id : null;
        if (!conditionId) continue;
        const expected =
          typeof condition.match === 'string' ? condition.match : '';
        const operator = normalizeOperator(
          typeof condition.operator === 'string'
            ? condition.operator
            : typeof condition.matchMode === 'string'
            ? condition.matchMode
            : undefined
        );

        const isMatched = evaluateConditional(
          variableValue,
          expected,
          operator
        );

        if (isMatched) {
          matchedConditionId = conditionId;
          break;
        }
      }

      const conditionConnections = new Map<string, number>();
      connections.forEach((connection) => {
        if (typeof connection.trigger !== 'string') return;
        // Manejar triggers en dos formatos:
        // Formato antiguo: 'cond:UUID'
        // Formato nuevo: 'UUID||Label'
        let conditionId: string | null = null;
        if (connection.trigger.startsWith('cond:')) {
          conditionId = connection.trigger.slice(5);
        } else if (connection.trigger.includes('||')) {
          conditionId = connection.trigger.split('||')[0];
        }
        if (conditionId) {
          conditionConnections.set(conditionId, connection.toId);
        }
      });

      const fallbackConditionId =
        typeof builderMeta.defaultConditionId === 'string' &&
        builderMeta.defaultConditionId.length
          ? builderMeta.defaultConditionId
          : `default-${node.id}`;

      const targetConditionId = matchedConditionId ?? fallbackConditionId;
      let nextFromCondition: number | null = null;
      if (targetConditionId) {
        nextFromCondition = conditionConnections.get(targetConditionId) ?? null;
      }

      nextNodeId = nextFromCondition ?? resolveNextNodeId();
      break;
    }
    case 'NOTE': {
      // Nodo NOTE: solo registra una nota interna, no se envía al cliente
      let noteContent = (node.message ||
        (builderMeta as Record<string, unknown>)?.value ||
        '') as string;

      // Procesar imagen si existe (reemplazar por "ENVÍO UNA IMAGEN")
      noteContent = processImageContent(noteContent);

      // Interpolar variables en el contenido de la nota
      const interpolatedNote = interpolateVariables(
        noteContent,
        updatedContext
      );

      if (noteContent) {
        actions.push({
          type: 'save_note',
          payload: {
            nodeId: node.id,
            content: interpolatedNote,
            timestamp: new Date().toISOString(),
          },
        });
      }

      updatedContext.waitingForInput = false;
      updatedContext.waitingVariable = null;
      nextNodeId = resolveNextNodeId();
      break;
    }
    case 'SCHEDULE': {
      updatedContext.waitingForInput = false;
      updatedContext.waitingVariable = null;

      const scheduleInput: ScheduleEvaluationInput = {
        week: builderMeta.week,
        timezone:
          typeof builderMeta.timezone === 'string' &&
          builderMeta.timezone.length
            ? builderMeta.timezone
            : undefined,
      };

      const scheduleStatus = evaluateScheduleNode(scheduleInput);
      // Exponer resultado para nodos posteriores (por ejemplo, condicionales)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updatedContext as any).lastScheduleStatus = scheduleStatus;

      const handleId =
        scheduleStatus === 'open' ? 'schedule-open' : 'schedule-closed';
      const handleConnections = mapConnectionsByHandle(connections);
      nextNodeId = handleConnections.get(handleId) ?? resolveNextNodeId();

      if (!nextNodeId) {
        console.warn(
          `[SCHEDULE] Node ${node.id}: no se encontró conexión para handle "${handleId}", usando fallback.`
        );
      }

      break;
    }
    case 'END': {
      actions.push({
        type: 'end_flow',
        payload: {
          nodeId: node.id,
          shouldDeactivateBot: true,
          shouldCreateOrder: true, // Nueva bandera para crear orden
        },
      });
      updatedContext.waitingForInput = false;
      updatedContext.waitingVariable = null;
      nextNodeId = null;
      break;
    }
    case 'DELAY': {
      // Obtener los segundos del metadata
      const secondsRaw = (builderMeta as unknown as Record<string, unknown>)
        ?.seconds;
      const seconds = typeof secondsRaw === 'number' ? secondsRaw : 1;

      // Agregar action de delay
      actions.push({
        type: 'delay',
        payload: {
          seconds,
          nodeId: node.id,
        },
      });

      updatedContext.waitingForInput = false;
      updatedContext.waitingVariable = null;
      nextNodeId = resolveNextNodeId();
      break;
    }
    case 'SET_VARIABLE': {
      // SET_VARIABLE: Crear o modificar una variable con un valor específico
      const variableName =
        typeof builderMeta.variable === 'string'
          ? builderMeta.variable.trim()
          : null;
      const valueTemplate =
        typeof builderMeta.value === 'string' ? builderMeta.value : '';

      if (variableName && variableName.length > 0) {
        // Interpolar variables en el valor (en caso de que contenga referencias)
        const resolvedValue = interpolateVariables(
          valueTemplate,
          updatedContext
        );

        // Asignar la variable al contexto
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (updatedContext as any)[variableName] = resolvedValue;

        console.log(
          `[SET_VARIABLE] Node ${node.id}: Asignando "${variableName}" = "${resolvedValue}"`
        );

        // Agregar acción para logging/tracking
        actions.push({
          type: 'set_variable',
          payload: {
            variable: variableName,
            value: resolvedValue,
            nodeId: node.id,
          },
        });
      } else {
        console.warn(
          `[SET_VARIABLE] Node ${node.id}: Nombre de variable inválido o vacío`
        );
      }

      // Continuar al siguiente nodo sin esperar input
      updatedContext.waitingForInput = false;
      updatedContext.waitingVariable = null;
      nextNodeId = resolveNextNodeId();
      break;
    }
    case 'AI': {
      updatedContext.waitingForInput = false;
      updatedContext.waitingVariable = null;
      const promptTemplate =
        typeof builderMeta.prompt === 'string' && builderMeta.prompt.length
          ? builderMeta.prompt
          : typeof node.message === 'string'
          ? node.message
          : '';
      if (!promptTemplate) {
        console.warn(`[AI] Nodo ${node.id} sin prompt configurado.`);
        nextNodeId = resolveNextNodeId();
        break;
      }
      const interpolatedPrompt = interpolateVariables(
        promptTemplate,
        updatedContext
      );
      const model =
        typeof builderMeta.model === 'string' && builderMeta.model.length
          ? builderMeta.model
          : undefined;
      const responseVariableName =
        typeof builderMeta.responseVariableName === 'string' &&
        builderMeta.responseVariableName.length
          ? builderMeta.responseVariableName
          : null;
      try {
        const aiResponse =
          (await generateGroqResponse({
            prompt: interpolatedPrompt,
            model,
          })) ?? '';
        const finalResponse =
          aiResponse && aiResponse.trim().length
            ? aiResponse.trim()
            : '🧠 Estoy procesando tu información. Nuestro equipo te confirmará los detalles en breve.';
        if (responseVariableName) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (updatedContext as any)[responseVariableName] = finalResponse;
        }
        actions.push({
          type: 'send_message',
          payload: {
            message: finalResponse,
            builder: builderMeta,
            nodeId: node.id,
            type: node.type,
          },
        });
      } catch (error) {
        console.error('[AI] Error generando respuesta:', error);
        const fallbackMessage =
          '⚠️ No pude obtener ayuda de la IA en este momento, intenta de nuevo más tarde.';
        if (responseVariableName) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (updatedContext as any)[responseVariableName] = fallbackMessage;
        }
        actions.push({
          type: 'send_message',
          payload: {
            message: fallbackMessage,
            nodeId: node.id,
            type: node.type,
          },
        });
      }

      nextNodeId = resolveNextNodeId();
      break;
    }
    default: {
      // En esta etapa solo manejamos START/TEXT/CAPTURE/CONDITIONAL/NOTE/END/DELAY/SET_VARIABLE.
      // El resto avanza al siguiente nodo.
      nextNodeId = resolveNextNodeId();
      break;
    }
  }

  return {
    nextNodeId,
    updatedContext,
    actions,
  };
}

/**
 * Ejecuta una cadena de nodos automáticamente, respetando delays y esperando por input.
 * Continúa ejecutando nodos hasta:
 * - Encontrar un nodo que espere input (CAPTURE/TEXT con waitForResponse)
 * - Llegar a un nodo END
 * - No haber siguiente nodo
 */
export async function executeNodeChain({
  botId,
  nodeId,
  context,
  capturedVariableName,
}: ExecuteNodeInput): Promise<ExecuteNodeResult> {
  let currentNodeId: number | null = nodeId ?? null;
  let currentContext = context;
  let allActions: Array<{ type: string; payload?: unknown }> = [];
  let iterations = 0;
  const MAX_ITERATIONS = 100; // Prevenir loops infinitos
  let messageCount = 0; // Contador de mensajes enviados

  while (currentNodeId && iterations < MAX_ITERATIONS) {
    iterations++;

    // Si ya hemos enviado mensajes, agregar delay de 1 segundo entre ellos
    if (messageCount > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Ejecutar el nodo actual
    try {
      const result = await executeNode({
        botId,
        nodeId: currentNodeId,
        context: currentContext,
        capturedVariableName,
      });

      allActions = allActions.concat(result.actions);
      currentContext = result.updatedContext;
      capturedVariableName = null; // Solo usar en la primera iteración

      // Contar mensajes enviados
      const sendMessageActions = result.actions.filter(
        (a) => a.type === 'send_message'
      );
      if (sendMessageActions.length > 0) {
        messageCount++;
      }

      // Procesar delays
      console.log(
        `[executeNodeChain] Actions de node ${currentNodeId}:`,
        JSON.stringify(result.actions)
      );
      const delayAction = result.actions.find((a) => a.type === 'delay');
      console.log(
        `[executeNodeChain] DelayAction encontrado?`,
        !!delayAction,
        delayAction
      );

      if (
        delayAction &&
        delayAction.payload &&
        typeof (delayAction.payload as Record<string, unknown>).seconds ===
          'number'
      ) {
        const delaySeconds = (delayAction.payload as Record<string, unknown>)
          .seconds as number;
        console.log(
          `[executeNodeChain] ⏳ INICIANDO DELAY de ${delaySeconds} segundos (${new Date().toISOString()})`
        );
        // Esperar los segundos especificados
        await new Promise((resolve) =>
          setTimeout(resolve, delaySeconds * 1000)
        );
        console.log(
          `[executeNodeChain] ✅ DELAY completado (${new Date().toISOString()})`
        );
      } else {
        console.log(
          `[executeNodeChain] No delay action found or invalid format`
        );
      }

      // Si el contexto indica que espera input, detener la cadena
      if (currentContext.waitingForInput) {
        console.log(
          `[executeNodeChain] Esperando input para variable: ${currentContext.waitingVariable}`
        );
        break;
      }

      // Si no hay siguiente nodo, detener
      if (!result.nextNodeId) {
        console.log(`[executeNodeChain] No hay siguiente nodo, finalizando`);
        currentNodeId = null;
        break;
      }

      currentNodeId = result.nextNodeId;
    } catch (nodeError) {
      console.error(
        `[executeNodeChain] Error executing node ${currentNodeId}:`,
        nodeError instanceof Error
          ? {
              message: nodeError.message,
              stack: nodeError.stack,
              cause: (nodeError as any).cause,
            }
          : nodeError
      );
      // Stop the chain on error
      break;
    }
  }

  if (iterations >= MAX_ITERATIONS) {
    console.warn(
      `[executeNodeChain] Límite de iteraciones (${MAX_ITERATIONS}) alcanzado`
    );
  }

  // Filtrar acciones de delay - no deben enviarse al cliente
  const clientActions = allActions.filter((a) => a.type !== 'delay');

  return {
    nextNodeId: currentNodeId,
    updatedContext: currentContext,
    actions: clientActions,
  };
}
