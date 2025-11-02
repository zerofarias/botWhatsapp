/**
 * @copyright Copyright (c) 2025 zerofarias
 * @author zerofarias
 * @file Tipos extendidos para Express y autenticación
 */
import type { UserRole } from '@prisma/client';

export type SessionUser = {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  defaultAreaId: number | null;
  areaIds: number[];
};

declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export type AuthenticatedUser = SessionUser;
