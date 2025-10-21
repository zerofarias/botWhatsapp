import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  closeConversationHandler,
  getConversationMessagesHandler,
  listConversationsHandler,
  sendConversationMessageHandler,
  getCombinedChatHistoryHandler,
  createConversationNoteHandler,
  listConversationNotesHandler,
  listAllChatsByPhoneHandler,
  listAllChatsHandler,
} from '../controllers/conversation.controller.js';

export const conversationRouter = Router();
conversationRouter.use(authenticate);
// Endpoint para obtener todas las conversaciones del sistema
conversationRouter.get('/all', listAllChatsHandler);
// Historial combinado de chats por teléfono
conversationRouter.get('/history/:phone', getCombinedChatHistoryHandler);

// Nuevo endpoint: todos los chats de un número, abiertos y cerrados
conversationRouter.get('/all-by-phone/:phone', listAllChatsByPhoneHandler);

conversationRouter.get('/', listConversationsHandler);
conversationRouter.get('/:id/messages', getConversationMessagesHandler);
conversationRouter.post('/:id/messages', sendConversationMessageHandler);
conversationRouter.post(
  '/:id/close',
  authorize(['ADMIN', 'SUPERVISOR', 'OPERATOR']),
  closeConversationHandler
);

// Notas internas en la conversación
conversationRouter.post('/:id/notes', createConversationNoteHandler);
conversationRouter.get('/:id/notes', listConversationNotesHandler);
