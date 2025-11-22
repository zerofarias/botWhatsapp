import type { Request, Response } from 'express';
import {
  createReminder,
  deleteReminder,
  listAllReminders,
  listDueReminders,
  listRemindersByContact,
  markReminderTriggered,
  updateReminder,
} from '../services/contactReminder.service.js';

function parseDateQuery(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

export async function listAllContactRemindersHandler(
  req: Request,
  res: Response
) {
  const start = parseDateQuery(req.query.start);
  const end = parseDateQuery(req.query.end);
  const includeCompleted = req.query.includeCompleted === 'true';

  const reminders = await listAllReminders({
    start,
    end,
    includeCompleted,
  });
  return res.json(reminders);
}

export async function listContactRemindersHandler(req: Request, res: Response) {
  const contactId = Number(req.params.contactId);
  if (Number.isNaN(contactId)) {
    return res.status(400).json({ message: 'Identificador inválido.' });
  }

  const reminders = await listRemindersByContact(contactId);
  return res.json(reminders);
}

export async function createContactReminderHandler(
  req: Request,
  res: Response
) {
  const contactId = Number(req.params.contactId);
  if (Number.isNaN(contactId)) {
    return res.status(400).json({ message: 'Identificador inválido.' });
  }

  const { title, description, remindAt, repeatIntervalDays, repeatUntil } =
    req.body ?? {};
  if (!title || !remindAt) {
    return res
      .status(400)
      .json({ message: 'Los campos title y remindAt son obligatorios.' });
  }

  const reminder = await createReminder(contactId, {
    title,
    description,
    remindAt: new Date(remindAt),
    repeatIntervalDays:
      typeof repeatIntervalDays === 'number' ? repeatIntervalDays : null,
    repeatUntil: repeatUntil ? new Date(repeatUntil) : null,
  });
  return res.status(201).json(reminder);
}

export async function updateContactReminderHandler(
  req: Request,
  res: Response
) {
  const reminderId = Number(req.params.reminderId);
  if (Number.isNaN(reminderId)) {
    return res.status(400).json({ message: 'Identificador inválido.' });
  }

  const updates = await updateReminder(reminderId, {
    title: req.body?.title,
    description: req.body?.description,
    remindAt: req.body?.remindAt ? new Date(req.body.remindAt) : undefined,
    repeatIntervalDays:
      req.body?.repeatIntervalDays === undefined
        ? undefined
        : req.body.repeatIntervalDays,
    repeatUntil:
      req.body?.repeatUntil === undefined
        ? undefined
        : req.body.repeatUntil
        ? new Date(req.body.repeatUntil)
        : null,
    completedAt: req.body?.completedAt
      ? new Date(req.body.completedAt)
      : req.body?.completedAt === null
      ? null
      : undefined,
  });
  return res.json(updates);
}

export async function deleteContactReminderHandler(
  req: Request,
  res: Response
) {
  const reminderId = Number(req.params.reminderId);
  if (Number.isNaN(reminderId)) {
    return res.status(400).json({ message: 'Identificador inválido.' });
  }

  await deleteReminder(reminderId);
  return res.status(204).send();
}

export async function listDueRemindersHandler(req: Request, res: Response) {
  const dateParam = req.query.date;
  const targetDate =
    typeof dateParam === 'string' && dateParam.trim().length
      ? new Date(dateParam)
      : new Date();

  const reminders = await listDueReminders(targetDate);
  return res.json({
    date: targetDate.toISOString(),
    reminders,
  });
}

export async function triggerReminderHandler(req: Request, res: Response) {
  const reminderId = Number(req.params.reminderId);
  if (Number.isNaN(reminderId)) {
    return res.status(400).json({ message: 'Identificador inválido.' });
  }
  const reminder = await markReminderTriggered(reminderId);
  return res.json(reminder);
}
