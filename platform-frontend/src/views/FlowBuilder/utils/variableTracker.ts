import type { FlowBuilderNode, FlowBuilderEdge, FlowNodeData } from '../types';

/**
 * Información sobre una variable disponible en el flujo
 */
export interface AvailableVariable {
  name: string; // Nombre de la variable (ej: "nombre", "edad")
  createdByNodeId: string; // ID del nodo que la crea
  createdByNodeType: string; // Tipo de nodo (CAPTURE, TEXT, SET_VARIABLE)
  createdByNodeLabel: string; // Label del nodo para UI
}

/**
 * Mapa que indica qué variables están disponibles en cada nodo
 * Clave: nodeId, Valor: Array de variables disponibles hasta ese nodo
 */
export type VariableAvailabilityMap = Map<string, AvailableVariable[]>;

/**
 * Extrae el nombre de variable de un nodo que la crea
 */
function extractVariableFromNode(node: FlowBuilderNode): string | null {
  const data = node.data as FlowNodeData;

  if (data.type === 'CAPTURE') {
    return data.responseVariableName || null;
  }

  if (data.type === 'TEXT') {
    return data.responseVariableName || null;
  }

  if (data.type === 'SET_VARIABLE') {
    return data.variable || null;
  }

  return null;
}

/**
 * Construye un mapa de disponibilidad de variables para cada nodo
 * Recorre el flujo en orden topológico y rastrea qué variables existen en cada punto
 */
export function buildVariableAvailabilityMap(
  nodes: FlowBuilderNode[],
  edges: FlowBuilderEdge[]
): VariableAvailabilityMap {
  const availabilityMap: VariableAvailabilityMap = new Map();

  // Crear índice de nodos para búsqueda rápida
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Construir mapa de adyacencia del grafo (para orden topológico)
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((node) => {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  edges.forEach((edge) => {
    const source = edge.source;
    const target = edge.target;

    if (nodeMap.has(source) && nodeMap.has(target)) {
      const sourceNeighbors = adjacency.get(source);
      if (sourceNeighbors) {
        sourceNeighbors.push(target);
      }
      inDegree.set(target, (inDegree.get(target) || 0) + 1);
    }
  });

  // Topological sort (Kahn's algorithm)
  const queue: string[] = [];
  const sortedNodeIds: string[] = [];

  // Encontrar todos los nodos sin entrada (START node típicamente)
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId) break;

    sortedNodeIds.push(nodeId);

    const neighbors = adjacency.get(nodeId);
    if (neighbors) {
      neighbors.forEach((neighbor) => {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      });
    }
  }

  // Si no hay orden topológico válido (ciclos), usar orden original
  if (sortedNodeIds.length !== nodes.length) {
    sortedNodeIds.length = 0;
    nodes.forEach((n) => sortedNodeIds.push(n.id));
  }

  // Rastrear variables disponibles en cada nodo
  const currentVariables: AvailableVariable[] = [];

  sortedNodeIds.forEach((nodeId) => {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    // Inicializar con variables disponibles hasta este punto
    availabilityMap.set(nodeId, [...currentVariables]);

    // Si este nodo crea una variable, agregarla
    const variableName = extractVariableFromNode(node);
    if (variableName) {
      const availableVar: AvailableVariable = {
        name: variableName,
        createdByNodeId: nodeId,
        createdByNodeType: node.data.type,
        createdByNodeLabel: node.data.label,
      };
      currentVariables.push(availableVar);

      // Actualizar el mapa para este nodo incluyendo su propia variable
      availabilityMap.set(nodeId, [...currentVariables]);
    }
  });

  return availabilityMap;
}

/**
 * Obtiene todas las variables disponibles para un nodo específico
 */
export function getAvailableVariablesForNode(
  nodeId: string,
  availabilityMap: VariableAvailabilityMap
): AvailableVariable[] {
  return availabilityMap.get(nodeId) || [];
}

/**
 * Obtiene solo los nombres de las variables disponibles (para un SELECT)
 */
export function getAvailableVariableNames(
  nodeId: string,
  availabilityMap: VariableAvailabilityMap
): string[] {
  return getAvailableVariablesForNode(nodeId, availabilityMap).map(
    (v) => v.name
  );
}

/**
 * Detecta todas las referencias a variables en un string
 * Ejemplo: "Hola $$nombre, tu edad es $$edad" → ["nombre", "edad"]
 * Soporta: $$variableName
 */
export function extractVariableReferences(text: string): string[] {
  const regex = /\$\$(\w+)/g;
  const matches: string[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}

/**
 * Valida que todas las variables referenciadas en un texto existan y estén disponibles
 */
export function validateVariableReferences(
  text: string,
  availableVariableNames: string[]
): { valid: boolean; missingVariables: string[] } {
  const references = extractVariableReferences(text);
  const availableSet = new Set(availableVariableNames);
  const missingVariables = references.filter((ref) => !availableSet.has(ref));

  return {
    valid: missingVariables.length === 0,
    missingVariables: Array.from(new Set(missingVariables)), // Deduplicar
  };
}

/**
 * Interpola variables en un string (reemplaza {{variable}} con sus valores)
 * Usado para preview en el frontend
 */
export function interpolateVariables(
  text: string,
  variables: Record<string, string>
): string {
  let result = text;

  Object.entries(variables).forEach(([name, value]) => {
    const regex = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });

  return result;
}
