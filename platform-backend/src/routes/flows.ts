import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getFlowGraph, saveFlowGraph } from '../controllers/flow.controller.js';

export const flowRouter = Router();

flowRouter.use(authenticate);
flowRouter.get('/graph', getFlowGraph);
flowRouter.post('/save-graph', saveFlowGraph);
