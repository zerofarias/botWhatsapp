import { Router } from 'express';
import {
  currentUser,
  login,
  logout,
  register,
} from '../controllers/auth.controller.js';
import { authorize } from '../middleware/authorize.js';
import { authenticate } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/logout', authenticate, logout);
authRouter.get('/me', authenticate, currentUser);
authRouter.post('/register', authenticate, authorize(['ADMIN']), register);
