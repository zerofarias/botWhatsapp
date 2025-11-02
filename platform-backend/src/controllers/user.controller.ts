/**
 * @swagger
 * /users:
 *   get:
 *     summary: Listar todos los usuarios
 *     tags:
 *       - Usuarios
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   username:
 *                     type: string
 *                   role:
 *                     type: string
 *   post:
 *     summary: Crear un usuario
 *     tags:
 *       - Usuarios
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 username:
 *                   type: string
 *                 role:
 *                   type: string
 *       500:
 *         description: Error al crear usuario
 */
import type { Request, Response } from 'express';
import {
  createUser,
  emailExists,
  listUsers,
  emailInUseByAnother,
  parseUserRole,
  updateUser,
  usernameExists,
} from '../services/user.service.js';

export async function listUsersHandler(_req: Request, res: Response) {
  const users = await listUsers();
  return res.json(users);
}

export async function createUserHandler(req: Request, res: Response) {
  const {
    name,
    username,
    email,
    password,
    role,
    defaultAreaId,
    areaIds,
    isActive,
  } = req.body ?? {};

  if (!name || !username || !password) {
    return res.status(400).json({
      message: 'Name, username and password are required.',
    });
  }

  if (await usernameExists(username)) {
    return res.status(400).json({ message: 'Username already in use.' });
  }

  if (email && (await emailExists(email))) {
    return res.status(400).json({ message: 'Email already in use.' });
  }

  const parsedRole = parseUserRole(role);
  if (role && !parsedRole) {
    return res.status(400).json({ message: 'Invalid role value.' });
  }

  const user = await createUser({
    name,
    username,
    email,
    password,
    role: parsedRole,
    defaultAreaId: defaultAreaId ?? null,
    areaIds: Array.isArray(areaIds) ? areaIds : undefined,
    isActive: typeof isActive === 'boolean' ? isActive : true,
  });

  return res.status(201).json(user);
}

export async function updateUserHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'Invalid user id.' });
  }

  const { name, email, password, role, defaultAreaId, areaIds, isActive } =
    req.body ?? {};

  if (email && (await emailInUseByAnother(email, id))) {
    return res.status(400).json({ message: 'Email already in use.' });
  }

  const parsedRole = parseUserRole(role);
  if (role && !parsedRole) {
    return res.status(400).json({ message: 'Invalid role value.' });
  }

  const updated = await updateUser(id, {
    name,
    email,
    password,
    role: parsedRole,
    defaultAreaId:
      defaultAreaId === undefined ? undefined : defaultAreaId ?? null,
    areaIds: Array.isArray(areaIds)
      ? areaIds.filter((value) => typeof value === 'number')
      : undefined,
    isActive: typeof isActive === 'boolean' ? isActive : undefined,
  });

  return res.json(updated);
}
