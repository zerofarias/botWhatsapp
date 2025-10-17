import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';

export function authorize(roles: Role[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!roles.length || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ message: 'Forbidden' });
  };
}
