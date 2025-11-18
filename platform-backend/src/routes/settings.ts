import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  exportSystemSettings,
  getSystemSettings,
  importSystemSettings,
  resetSystemSettings,
  updateSystemSettings,
} from '../controllers/settings.controller.js';

export const settingsRouter = Router();

settingsRouter.use(authenticate);
settingsRouter.get('/', getSystemSettings);
settingsRouter.put('/', updateSystemSettings);
settingsRouter.post('/export', exportSystemSettings);
settingsRouter.post('/import', importSystemSettings);
settingsRouter.post('/reset', resetSystemSettings);
