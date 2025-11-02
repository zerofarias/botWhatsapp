import type { Request } from 'express';
import type { SessionUser } from './express';
import type { ParsedQs } from 'qs';

export interface AuthenticatedRequest<T = unknown> extends Request {
  user?: SessionUser;
  body: T;
  query: ParsedQs;
}

export interface ProcessMessageBody {
  conversationId: string;
  content: string;
}

export interface MarkReadBody {
  userPhone?: string;
  conversationId?: string;
}
