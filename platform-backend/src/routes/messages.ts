import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getMessages,
  markConversationMessagesAsRead,
  markAllMessagesAsReadByPhoneHandler,
} from '../controllers/message.controller.js';

export const messageRouter = Router();

messageRouter.use(authenticate);
messageRouter.get('/', getMessages);
messageRouter.post('/mark-read', (req, res) => {
  console.log('POST /messages/mark-read called');
  return markConversationMessagesAsRead(req, res);
});
messageRouter.post('/mark-read-by-phone', markAllMessagesAsReadByPhoneHandler);
