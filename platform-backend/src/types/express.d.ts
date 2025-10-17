import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: Role;
        name: string;
      };
    }
  }
}

export type JwtPayload = {
  sub: number;
  email: string;
  role: Role;
  name: string;
};

export type AuthenticatedUser = JwtPayload;
