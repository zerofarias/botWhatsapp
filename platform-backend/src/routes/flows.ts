import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createOrUpdateFlow,
  getFlows,
  getFlowGraph,
  removeFlow,
  saveFlowGraph,
} from '../controllers/flow.controller.js';

export const flowRouter = Router();

flowRouter.use(authenticate);
flowRouter.get('/', getFlows);
flowRouter.get('/graph', getFlowGraph);
flowRouter.post('/save-graph', saveFlowGraph);
flowRouter.post('/', createOrUpdateFlow);
flowRouter.delete('/:id', removeFlow);
