import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  createContactHandler,
  deleteContactHandler,
  getContactHandler,
  importContactsHandler,
  listContactsHandler,
  updateContactHandler,
} from '../controllers/contact.controller.js';

export const contactRouter = Router();

contactRouter.use(authenticate);

contactRouter.get('/', authorize(['ADMIN', 'SUPERVISOR']), listContactsHandler);
contactRouter.get(
  '/:id',
  authorize(['ADMIN', 'SUPERVISOR']),
  getContactHandler
);
contactRouter.post('/', authorize(['ADMIN']), createContactHandler);
contactRouter.post('/import', authorize(['ADMIN']), importContactsHandler);
contactRouter.patch('/:id', authorize(['ADMIN']), updateContactHandler);
contactRouter.put('/:id', authorize(['ADMIN']), updateContactHandler);
contactRouter.delete('/:id', authorize(['ADMIN']), deleteContactHandler);
