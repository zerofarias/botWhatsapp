import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listQuickReplies,
  getQuickReplyById,
  getQuickReplyByShortcut,
  createQuickReply,
  updateQuickReply,
  deleteQuickReply,
  reorderQuickReplies,
} from '../services/quick-reply.service.js';

export const quickRepliesRouter = Router();

quickRepliesRouter.use(authenticate);

/**
 * GET /api/quick-replies
 * Lista respuestas rápidas disponibles para el usuario
 */
quickRepliesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.session.user!;
    const areaId =
      user.areaIds && user.areaIds.length > 0 ? user.areaIds[0] : undefined;

    const quickReplies = await listQuickReplies({
      userId: user.id,
      areaId,
      includeGlobal: true,
    });

    res.json(quickReplies);
  } catch (error) {
    console.error('Error listing quick replies:', error);
    res.status(500).json({ error: 'Error al listar respuestas rápidas' });
  }
});

/**
 * GET /api/quick-replies/:id
 * Obtiene una respuesta rápida por ID
 */
quickRepliesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const quickReply = await getQuickReplyById(id);
    if (!quickReply) {
      return res.status(404).json({ error: 'Respuesta rápida no encontrada' });
    }

    res.json(quickReply);
  } catch (error) {
    console.error('Error getting quick reply:', error);
    res.status(500).json({ error: 'Error al obtener respuesta rápida' });
  }
});

/**
 * GET /api/quick-replies/shortcut/:shortcut
 * Busca una respuesta rápida por shortcut
 */
quickRepliesRouter.get(
  '/shortcut/:shortcut',
  async (req: Request, res: Response) => {
    try {
      const { shortcut } = req.params;
      const quickReply = await getQuickReplyByShortcut(shortcut);

      if (!quickReply) {
        return res
          .status(404)
          .json({ error: 'Respuesta rápida no encontrada' });
      }

      res.json(quickReply);
    } catch (error) {
      console.error('Error getting quick reply by shortcut:', error);
      res.status(500).json({ error: 'Error al buscar respuesta rápida' });
    }
  }
);

/**
 * POST /api/quick-replies
 * Crea una nueva respuesta rápida
 */
quickRepliesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const user = req.session.user!;
    const data = req.body;

    // Solo admins pueden crear respuestas globales
    if (data.isGlobal && user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Solo administradores pueden crear respuestas globales',
      });
    }

    // Si no es global y no tiene userId, asignarle al usuario actual
    if (!data.isGlobal && !data.userId && !data.areaId) {
      data.userId = user.id;
    }

    const quickReply = await createQuickReply(data);
    res.status(201).json(quickReply);
  } catch (error: any) {
    console.error('Error creating quick reply:', error);
    if (error.message?.includes('shortcut')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error al crear respuesta rápida' });
  }
});

/**
 * PUT /api/quick-replies/:id
 * Actualiza una respuesta rápida existente
 */
quickRepliesRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const user = req.session.user!;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const existing = await getQuickReplyById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Respuesta rápida no encontrada' });
    }

    // Verificar permisos
    if (user.role !== 'ADMIN') {
      // Si es del usuario, puede editarla
      if (existing.userId !== user.id) {
        // Si es del área, solo admin/supervisor pueden editarla
        if (!['ADMIN', 'SUPERVISOR'].includes(user.role)) {
          return res
            .status(403)
            .json({ error: 'Sin permisos para editar esta respuesta' });
        }
      }
    }

    const data = req.body;

    // Solo admins pueden hacer una respuesta global
    if (data.isGlobal && user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Solo administradores pueden crear respuestas globales',
      });
    }

    const updated = await updateQuickReply(id, data);
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating quick reply:', error);
    if (error.message?.includes('shortcut')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error al actualizar respuesta rápida' });
  }
});

/**
 * DELETE /api/quick-replies/:id
 * Elimina una respuesta rápida
 */
quickRepliesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = req.session.user!;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const existing = await getQuickReplyById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Respuesta rápida no encontrada' });
    }

    // Verificar permisos
    if (user.role !== 'ADMIN') {
      // Solo puede eliminar si es suya
      if (existing.userId !== user.id) {
        return res
          .status(403)
          .json({ error: 'Sin permisos para eliminar esta respuesta' });
      }
    }

    await deleteQuickReply(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting quick reply:', error);
    res.status(500).json({ error: 'Error al eliminar respuesta rápida' });
  }
});

/**
 * POST /api/quick-replies/reorder
 * Reordena respuestas rápidas
 */
quickRepliesRouter.post('/reorder', async (req: Request, res: Response) => {
  try {
    const { updates } = req.body;
    await reorderQuickReplies(updates);
    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering quick replies:', error);
    res.status(500).json({ error: 'Error al reordenar respuestas rápidas' });
  }
});
