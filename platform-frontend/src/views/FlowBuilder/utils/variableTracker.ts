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
  const data = node.data as any; // Type any para acceso seguro

  if (data.type === 'CAPTURE') {
    return data.responseVariableName || null;
  }

  if (data.type === 'TEXT') {
    return data.responseVariableName || null;
  }

  if (data.type === 'SET_VARIABLE') {
    const varName = data.variable;
    console.log(
      `[variableTracker] SET_VARIABLE node "${node.data.label}": variable="${varName}"`
    );
    return varName || null;
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

  // Construir mapa de adyacencia del grafo
  const adjacency = new Map<string, string[]>();

  nodes.forEach((node) => {
    adjacency.set(node.id, []);
  });

  edges.forEach((edge) => {
    const source = edge.source;
    const target = edge.target;

    if (nodeMap.has(source) && nodeMap.has(target)) {
      const sourceNeighbors = adjacency.get(source);
      if (sourceNeighbors) {
        sourceNeighbors.push(target);
      }
    }
  });

  // DFS para calcular variables disponibles en cada nodo
  // Este enfoque maneja ciclos correctamente
  const variablesAtNode = new Map<string, AvailableVariable[]>();
  const visited = new Set<string>();
  const visiting = new Set<string>(); // Para detectar ciclos

  function dfsVariables(nodeId: string): AvailableVariable[] {
    if (variablesAtNode.has(nodeId)) {
      return variablesAtNode.get(nodeId) || [];
    }

    if (visiting.has(nodeId)) {
      // Ciclo detectado, retornar vacío para evitar recursión infinita
      return [];
    }

    visiting.add(nodeId);

    // Obtener todos los nodos predecesores (que apuntan a este nodo)
    const predecessors: string[] = [];
    adjacency.forEach((neighbors, from) => {
      if (neighbors.includes(nodeId)) {
        predecessors.push(from);
      }
    });

    // Acumular variables de todos los predecesores
    const vars = new Map<string, AvailableVariable>();
    predecessors.forEach((predId) => {
      const predVars = dfsVariables(predId);
      predVars.forEach((v) => {
        vars.set(v.name, v);
      });

      // El predecesor también puede crear una variable
      const predNode = nodeMap.get(predId);
      if (predNode) {
        const varName = extractVariableFromNode(predNode);
        if (varName) {
          vars.set(varName, {
            name: varName,
            createdByNodeId: predId,
            createdByNodeType: predNode.data.type,
            createdByNodeLabel: predNode.data.label,
          });
        }
      }
    });

    visiting.delete(nodeId);
    visited.add(nodeId);

    const result = Array.from(vars.values());
    variablesAtNode.set(nodeId, result);
    return result;
  }

  // Calcular variables para cada nodo
  nodes.forEach((node) => {
    const vars = dfsVariables(node.id);
    availabilityMap.set(node.id, vars);
  });

  console.log(
    '[variableTracker] DFS completed, variable availability map ready'
  );

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
