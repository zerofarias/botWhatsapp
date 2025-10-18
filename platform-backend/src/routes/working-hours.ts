import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  createWorkingHourHandler,
  deleteWorkingHourHandler,
  listWorkingHoursHandler,
  updateWorkingHourHandler,
} from '../controllers/working-hour.controller.js';

export const workingHourRouter = Router();

workingHourRouter.use(authenticate, authorize(['ADMIN']));

workingHourRouter.get('/', listWorkingHoursHandler);
workingHourRouter.post('/', createWorkingHourHandler);
workingHourRouter.patch('/:id', updateWorkingHourHandler);
workingHourRouter.delete('/:id', deleteWorkingHourHandler);
