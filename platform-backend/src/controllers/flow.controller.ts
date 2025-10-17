import type { Request, Response } from 'express';
import { deleteFlow, listFlows, upsertFlow } from '../services/flow.service.js';

export async function getFlows(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const flows = await listFlows(req.user.id);
  return res.json(flows);
}

export async function createOrUpdateFlow(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id, keyword, response } = req.body ?? {};
  if (!keyword || !response) {
    return res
      .status(400)
      .json({ message: 'Keyword and response are required.' });
  }

  const flow = await upsertFlow(req.user.id, keyword, response, id);
  return res.status(id ? 200 : 201).json(flow);
}

export async function removeFlow(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Invalid id' });
  }

  await deleteFlow(req.user.id, id);
  return res.status(204).send();
}
