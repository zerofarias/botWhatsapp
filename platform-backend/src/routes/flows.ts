import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createOrUpdateFlow,
  getFlows,
  removeFlow,
} from '../controllers/flow.controller.js';

export const flowRouter = Router();

flowRouter.use(authenticate);
flowRouter.get('/', getFlows);
flowRouter.post('/', createOrUpdateFlow);
flowRouter.delete('/:id', removeFlow);
