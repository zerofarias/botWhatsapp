import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { createUser } from '../services/user.service.js';

export async function listUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
  return res.json(users);
}

export async function createUserHandler(req: Request, res: Response) {
  const { name, email, password, role } = req.body ?? {};
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: 'Name, email and password are required.' });
  }

  const user = await createUser({ name, email, password, role });
  return res.status(201).json(user);
}
