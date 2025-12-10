import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getMessages,
  getTodayMessagesHandler,
  markAllMessagesAsReadByPhoneHandler,
} from '../controllers/message.controller';

export const messageRouter = Router();

messageRouter.use(authenticate);
messageRouter.get('/', getMessages);
messageRouter.get('/today', getTodayMessagesHandler);
messageRouter.post('/mark-read', (req, res) => {
  console.log('POST /messages/mark-read called');
  // return markConversationMessagesAsRead(req, res);
});
messageRouter.post('/mark-read-by-phone', markAllMessagesAsReadByPhoneHandler);
