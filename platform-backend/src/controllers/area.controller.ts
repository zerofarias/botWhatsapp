/**
 * @swagger
 * /areas:
 *   get:
 *     summary: Listar todas las áreas
 *     tags:
 *       - Áreas
 *     responses:
 *       200:
 *         description: Lista de áreas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *   post:
 *     summary: Crear área
 *     tags:
 *       - Áreas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Área creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *       500:
 *         description: Error al crear área
 */
import type { Request, Response } from 'express';
import { createArea, listAreas, updateArea } from '../services/area.service.js';

export async function listAreasHandler(req: Request, res: Response) {
  const onlyActive =
    typeof req.query.active === 'string'
      ? req.query.active === 'true'
      : undefined;
  const areas = await listAreas(onlyActive);
  res.json(areas);
}

export async function createAreaHandler(req: Request, res: Response) {
  const { name, description, isActive } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ message: 'Name is required.' });
  }
  const area = await createArea({
    name,
    description: description ?? null,
    isActive: typeof isActive === 'boolean' ? isActive : true,
  });
  res.status(201).json(area);
}

export async function updateAreaHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'Invalid area id.' });
  }

  const { name, description, isActive } = req.body ?? {};
  if (name !== undefined && typeof name !== 'string') {
    return res.status(400).json({ message: 'Invalid name.' });
  }

  const area = await updateArea(id, {
    name,
    description: description ?? undefined,
    isActive: typeof isActive === 'boolean' ? isActive : undefined,
  });

  res.json(area);
}
