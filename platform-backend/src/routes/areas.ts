import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  createAreaHandler,
  listAreasHandler,
  updateAreaHandler,
} from '../controllers/area.controller.js';

export const areaRouter = Router();

areaRouter.use(authenticate);

areaRouter.get('/', listAreasHandler);
areaRouter.post('/', authorize(['ADMIN']), createAreaHandler);
areaRouter.put('/:id', authorize(['ADMIN']), updateAreaHandler);
