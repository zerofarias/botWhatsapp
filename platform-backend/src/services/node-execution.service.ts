// Servicio principal para ejecutar nodos del Flow Builder
import { prisma } from '../config/prisma.js';
import type { ConversationContext } from './flow.service';

type BuilderCondition = {
  id?: string;
  label?: string;
  match?: string;
  matchMode?: string;
  operator?: string;
  targetId?: string | null;
};

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

function extractBuilderMetadata(metadata: unknown): BuilderMetadata {
  if (
    metadata &&
    typeof metadata === 'object' &&
    (metadata as Record<string, unknown>).builder
  ) {
    const builder = (metadata as Record<string, unknown>)
      .builder as BuilderMetadata;
    return builder ?? {};
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
function interpolateVariables(
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
    console.log(`[TEXT] Original message:`, node.message);
    console.log(`[TEXT] Context keys:`, Object.keys(updatedContext));
    console.log(`[TEXT] Interpolated message:`, interpolatedMessage);
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

      console.log(
        `[TEXT] Node ${node.id}: shouldWait=${shouldWait}, alreadyCaptured=${alreadyCaptured}, capturedVariableName=${capturedVariableName}, message="${node.message}"`
      );

      if (!alreadyCaptured) {
        sendMessage();
        console.log(`[TEXT] Sending message: "${node.message}"`);
      }

      if (shouldWait && !alreadyCaptured) {
        updatedContext.waitingForInput = true;
        updatedContext.waitingVariable =
          builderMeta.responseVariableName ?? null;
        nextNodeId = node.id;
        console.log(
          `[TEXT] Waiting for input for variable: ${builderMeta.responseVariableName}`
        );
      } else {
        updatedContext.waitingForInput = false;
        updatedContext.waitingVariable = null;
        nextNodeId = resolveNextNodeId();
        console.log(
          `[TEXT] Not waiting, advancing to next node: ${nextNodeId}`
        );
      }
      break;
    }
    case 'CAPTURE': {
      // CAPTURE es como TEXT que siempre espera respuesta
      sendMessage();
      console.log(
        `[CAPTURE] Node ${node.id}: Sending capture message: "${node.message}"`
      );

      const variableName =
        typeof builderMeta.responseVariableName === 'string'
          ? builderMeta.responseVariableName
          : null;

      updatedContext.waitingForInput = true;
      updatedContext.waitingVariable = variableName;
      nextNodeId = node.id;
      console.log(
        `[CAPTURE] Node ${node.id}: Waiting for input for variable: ${variableName}`
      );
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
        console.log(
          `[CONDITIONAL] Evaluating condition "${
            condition.label || conditionId
          }": ${variableValue} ${operator} ${expected} = ${isMatched}`
        );

        if (isMatched) {
          matchedConditionId = conditionId;
          console.log(`[CONDITIONAL] ✅ MATCHED condition: ${conditionId}`);
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

      console.log(
        `[CONDITIONAL] targetConditionId="${targetConditionId}", nextFromCondition=${nextFromCondition}, fallback=${fallbackConditionId}`
      );

      nextNodeId = nextFromCondition ?? resolveNextNodeId();
      console.log(`[CONDITIONAL] Final nextNodeId: ${nextNodeId}`);
      break;
    }
    case 'NOTE': {
      // Nodo NOTE: solo registra una nota interna, no se envía al cliente
      const noteContent =
        node.message || (builderMeta as Record<string, unknown>)?.value || '';
      console.log(`[NOTE] Node ${node.id}: Registering note: "${noteContent}"`);

      actions.push({
        type: 'save_note',
        payload: {
          nodeId: node.id,
          content: noteContent,
          timestamp: new Date().toISOString(),
        },
      });

      updatedContext.waitingForInput = false;
      updatedContext.waitingVariable = null;
      nextNodeId = resolveNextNodeId();
      break;
    }
    case 'END': {
      actions.push({ type: 'end_flow', payload: { nodeId: node.id } });
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

      console.log(
        `[DELAY] Node ${
          node.id
        }: Delaying ${seconds} seconds, metadata=${JSON.stringify(builderMeta)}`
      );

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
    default: {
      // En esta etapa solo manejamos START/TEXT/END. El resto avanza al siguiente nodo.
      console.log(
        `[executeNode] Node ${node.id}: tipo "${node.type}" no implementado, avanzando al siguiente`
      );
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
  startNodeId,
  context,
  capturedVariableName,
}: ExecuteNodeInput & { startNodeId?: number }): Promise<ExecuteNodeResult> {
  console.log(`[executeNodeChain] ⭐ INICIANDO CON startNodeId=${startNodeId}`);
  let currentNodeId = startNodeId ?? null;
  let currentContext = context;
  let allActions: Array<{ type: string; payload?: unknown }> = [];
  let iterations = 0;
  const MAX_ITERATIONS = 100; // Prevenir loops infinitos

  while (currentNodeId && iterations < MAX_ITERATIONS) {
    iterations++;
    console.log(
      `[executeNodeChain] Iteration ${iterations}: executing node ${currentNodeId}`
    );

    // Ejecutar el nodo actual
    const result = await executeNode({
      botId,
      nodeId: currentNodeId,
      context: currentContext,
      capturedVariableName,
    });

    allActions = allActions.concat(result.actions);
    currentContext = result.updatedContext;
    capturedVariableName = null; // Solo usar en la primera iteración

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
      await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
      console.log(
        `[executeNodeChain] ✅ DELAY completado (${new Date().toISOString()})`
      );
    } else {
      console.log(`[executeNodeChain] No delay action found or invalid format`);
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
