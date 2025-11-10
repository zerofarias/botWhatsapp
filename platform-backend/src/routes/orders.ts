import { Router } from 'express';
import {
  getOrdersHandler,
  getOrderHandler,
  completeOrderHandler,
  updateOrderHandler,
  deleteOrderHandler,
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Aplicar auth a todas las rutas de orders
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Pedidos
 *     description: Endpoints para gestión de pedidos
 */

// GET /orders - Listar todos los pedidos
router.get('/', getOrdersHandler);

// GET /orders/:id - Obtener detalles de un pedido
router.get('/:id', getOrderHandler);

// PATCH /orders/:id/complete - Completar un pedido
router.patch('/:id/complete', completeOrderHandler);

// PATCH /orders/:id - Actualizar un pedido
router.patch('/:id', updateOrderHandler);

// DELETE /orders/:id - Cancelar/Eliminar un pedido
router.delete('/:id', deleteOrderHandler);

export default router;
