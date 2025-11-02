import { Request, Response } from 'express';

// These endpoints are deprecated - use platform-backend instead
export const listNodes = async (req: Request, res: Response) => {
  res.status(501).json({ error: 'Deprecated - use platform-backend' });
};

export const createNode = async (req: Request, res: Response) => {
  res.status(501).json({ error: 'Deprecated - use platform-backend' });
};
