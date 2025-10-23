import { Router } from 'express';
import * as botController from '../controllers/bots.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Primero autenticación, luego autorización
router.use(authenticate);
router.use(authorize(['ADMIN', 'SUPERVISOR']));

router.post('/', botController.createBot);
router.get('/', botController.getAllBots);
router.get('/:id', botController.getBotById);
router.put('/:id', botController.updateBot);
router.delete('/:id', botController.deleteBot);

export default router;
