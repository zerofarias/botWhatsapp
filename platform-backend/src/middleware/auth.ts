/**
 * @copyright Copyright (c) 2025 zerofarias
 * @author zerofarias
 * @file Middleware de autenticación para Express
 */
import type { Request, Response, NextFunction } from 'express';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const sessionUser = req.session?.user;

  if (!sessionUser) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  req.user = sessionUser;
  return next();
}
