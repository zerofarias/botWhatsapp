import { Router } from 'express';
import {
  createClassicFlow,
  getClassicFlow,
  updateClassicFlow,
} from '../controllers/classicFlow.controller';

const router = Router();

// Actualizar un flujo clásico por flowId
router.put('/:flowId', updateClassicFlow);
// Crear un flujo clásico
router.post('/', createClassicFlow);
// Obtener un flujo clásico por flowId
router.get('/:flowId', getClassicFlow);

export default router;
