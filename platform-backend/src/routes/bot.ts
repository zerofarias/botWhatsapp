import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getBotQr,
  getBotStatus,
  startBot,
  stopBot,
  togglePause,
  updateMetadata,
} from '../controllers/bot.controller.js';

export const botRouter = Router();

botRouter.use(authenticate);
botRouter.get('/status', getBotStatus);
botRouter.post('/start', startBot);
botRouter.post('/stop', stopBot);
botRouter.get('/qr', getBotQr);
botRouter.post('/pause', togglePause);
botRouter.patch('/metadata', updateMetadata);
