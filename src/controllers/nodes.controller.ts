import { Request, Response } from 'express';
import db from '../lib/db'; // Ajusta según tu conexión

export const listNodes = async (req: Request, res: Response) => {
  const { flowId } = req.params;
  try {
    const [nodes] = await db.query('SELECT * FROM nodes WHERE flow_id = ?', [
      flowId,
    ]);
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener nodos' });
  }
};

export const createNode = async (req: Request, res: Response) => {
  const { flowId } = req.params;
  const { name, type, content, order_index, metadata, is_active } = req.body;
  try {
    await db.query(
      'INSERT INTO nodes (flow_id, name, type, content, order_index, metadata, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        flowId,
        name,
        type,
        content,
        order_index ?? 0,
        metadata ?? '',
        is_active ?? 1,
      ]
    );
    res.status(201).json({ message: 'Nodo creado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear nodo' });
  }
};
