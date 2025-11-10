import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  saveFlowData,
  getFlowDataByType,
  deleteFlowData,
} from '../controllers/flow-data.controller.js';

export const flowDataRouter = Router();

flowDataRouter.use(authenticate);
flowDataRouter.post('/save', saveFlowData);
flowDataRouter.get('/list', getFlowDataByType);
flowDataRouter.delete('/:id', deleteFlowData);
