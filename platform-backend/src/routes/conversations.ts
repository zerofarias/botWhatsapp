import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  closeConversationHandler,
  getConversationMessagesHandler,
  listConversationsHandler,
  sendConversationMessageHandler,
  getCombinedChatHistoryHandler,
} from '../controllers/conversation.controller.js';

export const conversationRouter = Router();
// Historial combinado de chats por teléfono
conversationRouter.get('/history/:phone', getCombinedChatHistoryHandler);

conversationRouter.use(authenticate);

conversationRouter.get('/', listConversationsHandler);
conversationRouter.get('/:id/messages', getConversationMessagesHandler);
conversationRouter.post('/:id/messages', sendConversationMessageHandler);
conversationRouter.post(
  '/:id/close',
  authorize(['ADMIN', 'SUPERVISOR', 'OPERATOR']),
  closeConversationHandler
);
