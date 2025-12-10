import { FlowNodeType } from './types';

/**
 * Configuración de estilos por tipo de nodo
 * Incluye: color de fondo, color de borde, forma (circulo/cuadrado/rombo)
 */
export interface NodeStyleConfig {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  shape: 'circle' | 'square' | 'diamond' | 'rounded';
  borderWidth: number;
  icon?: string; // emoji o nombre de icono
}

export const NODE_STYLE_CONFIG: Record<FlowNodeType, NodeStyleConfig> = {
  START: {
    backgroundColor: '#4caf50',
    borderColor: '#2e7d32',
    textColor: '#ffffff',
    shape: 'circle',
    borderWidth: 3,
    icon: '▶️',
  },
  END: {
    backgroundColor: '#f44336',
    borderColor: '#c62828',
    textColor: '#ffffff',
    shape: 'circle',
    borderWidth: 3,
    icon: '⏹️',
  },
  END_CLOSED: {
    backgroundColor: '#7c3aed',
    borderColor: '#5b21b6',
    textColor: '#ffffff',
    shape: 'circle',
    borderWidth: 3,
    icon: '🔚',
  },
  TEXT: {
    backgroundColor: '#2196f3',
    borderColor: '#1565c0',
    textColor: '#ffffff',
    shape: 'rounded',
    borderWidth: 2,
    icon: '💬',
  },
  CAPTURE: {
    backgroundColor: '#ff9800',
    borderColor: '#e65100',
    textColor: '#ffffff',
    shape: 'rounded',
    borderWidth: 2,
    icon: '📥',
  },
  CONDITIONAL: {
    backgroundColor: '#9c27b0',
    borderColor: '#6a1b9a',
    textColor: '#ffffff',
    shape: 'diamond',
    borderWidth: 2,
    icon: '⚡',
  },
  DELAY: {
    backgroundColor: '#ffc107',
    borderColor: '#f57f17',
    textColor: '#000000',
    shape: 'rounded',
    borderWidth: 2,
    icon: '⏳',
  },
  SCHEDULE: {
    backgroundColor: '#607d8b',
    borderColor: '#37474f',
    textColor: '#ffffff',
    shape: 'rounded',
    borderWidth: 2,
    icon: '🕐',
  },
  REDIRECT_BOT: {
    backgroundColor: '#00bcd4',
    borderColor: '#00838f',
    textColor: '#ffffff',
    shape: 'rounded',
    borderWidth: 2,
    icon: '🤖',
  },
  REDIRECT_AGENT: {
    backgroundColor: '#00bcd4',
    borderColor: '#00838f',
    textColor: '#ffffff',
    shape: 'rounded',
    borderWidth: 2,
    icon: '👤',
  },
  AI: {
    backgroundColor: '#00bcd4',
    borderColor: '#00838f',
    textColor: '#ffffff',
    shape: 'rounded',
    borderWidth: 2,
    icon: '🧠',
  },
  HTTP: {
    backgroundColor: '#ff5722',
    borderColor: '#bf360c',
    textColor: '#ffffff',
    shape: 'rounded',
    borderWidth: 2,
    icon: '🌐',
  },
  SET_VARIABLE: {
    backgroundColor: '#81c784',
    borderColor: '#558b2f',
    textColor: '#ffffff',
    shape: 'rounded',
    borderWidth: 2,
    icon: '📝',
  },
  NOTE: {
    backgroundColor: '#fffde7',
    borderColor: '#fbc02d',
    textColor: '#000000',
    shape: 'rounded',
    borderWidth: 2,
    icon: '📌',
  },
  DATA_LOG: {
    backgroundColor: '#9575cd',
    borderColor: '#5e35b1',
    textColor: '#ffffff',
    shape: 'rounded',
    borderWidth: 2,
    icon: '💾',
  },
  ORDER: {
    backgroundColor: '#ec4899',
    borderColor: '#be185d',
    textColor: '#ffffff',
    shape: 'rounded',
    borderWidth: 2,
    icon: '\u{1F6D2}',
  },
};

/**
 * Obtiene la configuración de estilo para un tipo de nodo
 */
export function getNodeStyleConfig(nodeType: FlowNodeType): NodeStyleConfig {
  return NODE_STYLE_CONFIG[nodeType];
}

/**
 * Genera clases CSS dinámicas para un nodo
 */
export function getNodeClasses(nodeType: FlowNodeType): string {
  const config = getNodeStyleConfig(nodeType);
  return `node-${nodeType.toLowerCase()} node-shape-${config.shape}`;
}

/**
 * Genera estilos inline para un nodo
 */
export function getNodeInlineStyles(
  nodeType: FlowNodeType
): React.CSSProperties {
  const config = getNodeStyleConfig(nodeType);
  const baseStyles: React.CSSProperties = {
    backgroundColor: config.backgroundColor,
    borderColor: config.borderColor,
    color: config.textColor,
    borderWidth: config.borderWidth,
    borderStyle: 'solid',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.3s ease',
  };

  // Aplicar formas específicas
  if (config.shape === 'circle') {
    return {
      ...baseStyles,
      borderRadius: '50%',
      width: '50px',
      height: '50px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  }

  if (config.shape === 'diamond') {
    return {
      ...baseStyles,
      borderRadius: '0',
      transform: 'rotate(45deg)',
      width: '50px',
      height: '50px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  }

  if (config.shape === 'rounded') {
    return {
      ...baseStyles,
      borderRadius: '8px',
      padding: '12px 16px',
      minHeight: '45px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  }

  return {
    ...baseStyles,
    borderRadius: '4px',
  };
}
