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
  takeConversationHandler,
  finishConversationHandler,
  startFlowHandler,
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

// Rutas para notas internas
conversationRouter.get('/:id/notes', listConversationNotesHandler);
conversationRouter.post('/:id/notes', createConversationNoteHandler);

conversationRouter.post(
  '/:id/close',
  authorize(['ADMIN', 'SUPERVISOR', 'OPERATOR']),
  closeConversationHandler
);

// Endpoint para tomar la conversación
conversationRouter.post(
  '/:id/take',
  authorize(['ADMIN', 'SUPERVISOR', 'OPERATOR']),
  takeConversationHandler
);

// Endpoint para finalizar la conversación
conversationRouter.post(
  '/:id/finish',
  authorize(['ADMIN', 'SUPERVISOR', 'OPERATOR']),
  finishConversationHandler
);

// Endpoint para iniciar el flujo
conversationRouter.post(
  '/:id/start-flow',
  authorize(['ADMIN', 'SUPERVISOR', 'OPERATOR']),
  startFlowHandler
);
