import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  createUserHandler,
  listUsersHandler,
  updateUserHandler,
} from '../controllers/user.controller.js';

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get(
  '/',
  authorize(['ADMIN', 'SUPERVISOR', 'OPERATOR', 'SUPPORT', 'SALES']),
  listUsersHandler
);
userRouter.post('/', authorize(['ADMIN']), createUserHandler);
userRouter.put('/:id', authorize(['ADMIN']), updateUserHandler);
userRouter.patch('/:id', authorize(['ADMIN']), updateUserHandler);
