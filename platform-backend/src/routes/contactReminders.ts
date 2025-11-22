import { Router } from 'express';
import {
  createContactReminderHandler,
  deleteContactReminderHandler,
  listAllContactRemindersHandler,
  listContactRemindersHandler,
  listDueRemindersHandler,
  triggerReminderHandler,
  updateContactReminderHandler,
} from '../controllers/contactReminder.controller.js';

const router = Router();

router.get('/', (req, res) => {
  void listAllContactRemindersHandler(req, res);
});

router.get('/due', (req, res) => {
  void listDueRemindersHandler(req, res);
});

router.get('/:contactId', (req, res) => {
  void listContactRemindersHandler(req, res);
});

router.post('/:contactId', (req, res) => {
  void createContactReminderHandler(req, res);
});

router.patch('/:contactId/:reminderId', (req, res) => {
  void updateContactReminderHandler(req, res);
});

router.delete('/:contactId/:reminderId', (req, res) => {
  void deleteContactReminderHandler(req, res);
});

router.post('/trigger/:reminderId', (req, res) => {
  void triggerReminderHandler(req, res);
});

export const contactReminderRouter = router;
