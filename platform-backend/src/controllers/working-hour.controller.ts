import type { Request, Response } from 'express';
import {
  createWorkingHour,
  deleteWorkingHour,
  listWorkingHours,
  updateWorkingHour,
} from '../services/working-hour.service.js';

export async function listWorkingHoursHandler(req: Request, res: Response) {
  const areaIdParam = req.query.areaId;
  const areaId =
    typeof areaIdParam === 'string'
      ? Number.parseInt(areaIdParam, 10)
      : undefined;
  const records = await listWorkingHours(
    Number.isNaN(areaId) ? undefined : areaId
  );
  return res.json(records);
}

export async function createWorkingHourHandler(req: Request, res: Response) {
  const { areaId, startTime, endTime, days, message } = req.body ?? {};
  if (typeof areaId !== 'number') {
    return res.status(400).json({ message: 'El campo areaId es obligatorio.' });
  }

  try {
    const record = await createWorkingHour({
      areaId,
      startTime,
      endTime,
      days,
      message,
    });
    return res.status(201).json(record);
  } catch (error) {
    const messageText =
      error instanceof Error
        ? error.message
        : 'No fue posible crear el horario.';
    return res.status(400).json({ message: messageText });
  }
}

export async function updateWorkingHourHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'Identificador invalido.' });
  }

  try {
    const record = await updateWorkingHour(id, {
      startTime: req.body?.startTime,
      endTime: req.body?.endTime,
      days: req.body?.days,
      message: req.body?.message,
    });
    return res.json(record);
  } catch (error) {
    const messageText =
      error instanceof Error
        ? error.message
        : 'No fue posible actualizar el horario.';
    return res.status(400).json({ message: messageText });
  }
}

export async function deleteWorkingHourHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'Identificador invalido.' });
  }

  await deleteWorkingHour(id);
  return res.status(204).send();
}
