import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const listNodes = async (req: Request, res: Response) => {
  const { flowId } = req.params;
  try {
    const nodes = await prisma.node.findMany({
      where: { flowId: Number(flowId) },
    });
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener nodos' });
  }
};

export const createNode = async (req: Request, res: Response) => {
  const { flowId } = req.params;
  const { name, type, content, order_index, metadata, is_active } = req.body;
  try {
    await prisma.node.create({
      data: {
        flowId: Number(flowId),
        name,
        type,
        content,
        orderIndex: order_index ?? 0,
        metadata: metadata ?? undefined,
        isActive: is_active ?? true,
      },
    });
    res.status(201).json({ message: 'Nodo creado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear nodo' });
  }
};
