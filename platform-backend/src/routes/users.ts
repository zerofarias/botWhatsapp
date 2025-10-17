import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  createUserHandler,
  listUsers,
} from '../controllers/user.controller.js';

export const userRouter = Router();

userRouter.use(authenticate, authorize(['ADMIN']));
userRouter.get('/', listUsers);
userRouter.post('/', createUserHandler);
