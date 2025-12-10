// Enum de tipos de nodo para TypeScript, debe estar sincronizado con schema.prisma
export type NodeType =
  | 'START'
  | 'TEXT'
  | 'SCHEDULE'
  | 'CONDITIONAL'
  | 'DELAY'
  | 'REDIRECT_BOT'
  | 'REDIRECT_AGENT'
  | 'AI'
  | 'SET_VARIABLE'
  | 'HTTP'
  | 'END'
  | 'END_CLOSED'
  | 'ORDER';
