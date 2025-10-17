import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMessages } from '../controllers/message.controller.js';

export const messageRouter = Router();

messageRouter.use(authenticate);
messageRouter.get('/', getMessages);
