import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import {
  createUser,
  emailExists,
  findUserById,
  findUserForLogin,
  parseUserRole,
  toSessionUser,
  updateLastLogin,
  usernameExists,
} from '../services/user.service.js';

type LoginPayload = {
  identifier?: string;
  username?: string;
  email?: string;
  password?: string;
};

type RegisterPayload = {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  role?: string;
  defaultAreaId?: number | null;
  areaIds?: number[];
  isActive?: boolean;
};

function resolveIdentifier(payload: LoginPayload) {
  return (payload.identifier ?? payload.username ?? payload.email ?? '').trim();
}

function regenerateSession(req: Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function destroySession(req: Request) {
  if (!req.session) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export async function login(req: Request, res: Response) {
  const payload = req.body as LoginPayload;
  const identifier = resolveIdentifier(payload);
  const password = payload.password;

  if (!identifier || !password) {
    return res.status(400).json({
      message: 'Username/email and password are required.',
    });
  }

  const user = await findUserForLogin(identifier);
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  await regenerateSession(req);

  await updateLastLogin(user.id);

  const publicUser = await findUserById(user.id);
  if (!publicUser) {
    await destroySession(req);
    return res.status(500).json({ message: 'Unable to load user profile.' });
  }

  const sessionUser = toSessionUser({
    id: publicUser.id,
    name: publicUser.name,
    username: publicUser.username,
    role: publicUser.role,
    defaultAreaId: publicUser.defaultAreaId,
    areaIds: publicUser.areas
      .map((membership) => membership.id)
      .filter((id): id is number => typeof id === 'number'),
  });

  req.session.user = sessionUser;
  req.user = sessionUser;

  return res.json({
    user: publicUser,
  });
}

export async function logout(req: Request, res: Response) {
  await destroySession(req);
  res.clearCookie(env.sessionCookieName);
  return res.status(204).send();
}

export async function currentUser(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = await findUserById(req.user.id);
  if (!user) {
    await destroySession(req);
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const sessionUser = toSessionUser({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    defaultAreaId: user.defaultAreaId,
    areaIds: user.areas
      .map((membership) => membership.id)
      .filter((id): id is number => typeof id === 'number'),
  });
  req.session.user = sessionUser;
  req.user = sessionUser;

  return res.json({ user });
}

export async function register(req: Request, res: Response) {
  const payload = req.body as RegisterPayload;
  const { name, username, email, password } = payload;

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

  const role = parseUserRole(payload.role);
  if (payload.role && !role) {
    return res.status(400).json({ message: 'Invalid role value.' });
  }

  const user = await createUser({
    name,
    username,
    email,
    password,
    role,
    defaultAreaId: payload.defaultAreaId ?? null,
    areaIds: payload.areaIds,
    isActive: payload.isActive ?? true,
  });

  return res.status(201).json(user);
}
