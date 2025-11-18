import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';

export function authorize(roles: UserRole[] = []) {
  const normalizedRoles = roles.map((role) => role.toUpperCase());

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userRole = `${req.user.role}`.toUpperCase();

    if (!normalizedRoles.length || normalizedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({ message: 'Forbidden' });
  };
}
