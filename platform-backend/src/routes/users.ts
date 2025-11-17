import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  createUserHandler,
  listUsersHandler,
  updateUserHandler,
} from '../controllers/user.controller.js';

export const userRouter = Router();

userRouter.use(authenticate, authorize(['ADMIN']));
userRouter.get('/', listUsersHandler);
userRouter.post('/', createUserHandler);
userRouter.put('/:id', updateUserHandler);
userRouter.patch('/:id', updateUserHandler);
