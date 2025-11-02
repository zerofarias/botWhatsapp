/**
 * @swagger
 * /bots:
 *   get:
 *     summary: Listar todos los bots
 *     tags:
 *       - Bots
 *     responses:
 *       200:
 *         description: Lista de bots
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
 *                   status:
 *                     type: string
 *   post:
 *     summary: Crear un bot
 *     tags:
 *       - Bots
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bot creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 status:
 *                   type: string
 *       500:
 *         description: Error al crear bot
 */
import { Request, Response } from 'express';
import * as botService from '../services/bots.service.js';

export async function createBot(req: Request, res: Response) {
  try {
    const bot = await botService.create(req.body);
    res.status(201).json(bot);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: 'Error creating bot', error: error.message });
  }
}

export async function getAllBots(req: Request, res: Response) {
  try {
    const bots = await botService.findAll();
    res.status(200).json(bots);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: 'Error retrieving bots', error: error.message });
  }
}

export async function getBotById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const bot = await botService.findById(id);
    if (bot) {
      res.status(200).json(bot);
    } else {
      res.status(404).json({ message: 'Bot not found' });
    }
  } catch (error: any) {
    res
      .status(500)
      .json({ message: 'Error retrieving bot', error: error.message });
  }
}

export async function updateBot(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const bot = await botService.update(id, req.body);
    if (bot) {
      res.status(200).json(bot);
    } else {
      res.status(404).json({ message: 'Bot not found' });
    }
  } catch (error: any) {
    res
      .status(500)
      .json({ message: 'Error updating bot', error: error.message });
  }
}

export async function deleteBot(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const bot = await botService.remove(id);
    if (bot) {
      res.status(200).json({ message: 'Bot deleted successfully' });
    } else {
      res.status(404).json({ message: 'Bot not found' });
    }
  } catch (error: any) {
    res
      .status(500)
      .json({ message: 'Error deleting bot', error: error.message });
  }
}
