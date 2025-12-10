import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

const reminderSelect = Prisma.validator<Prisma.ContactReminderSelect>()({
  id: true,
  contactId: true,
  title: true,
  description: true,
  remindAt: true,
  repeatIntervalDays: true,
  repeatUntil: true,
  lastTriggeredAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  contact: {
    select: {
      id: true,
      name: true,
      phone: true,
      obraSocial: true,
      obraSocial2: true,
      isVip: true,
      isProblematic: true,
      isChronic: true,
    },
  },
});

export type ReminderRecord = Prisma.ContactReminderGetPayload<{
  select: typeof reminderSelect;
}>;

export async function listRemindersByContact(contactId: number) {
  return prisma.contactReminder.findMany({
    where: { contactId },
    orderBy: { remindAt: 'asc' },
    select: reminderSelect,
  });
}

function generateOccurrences(
  startDate: Date,
  repeatIntervalDays: number,
  repeatUntil: Date | null
): Date[] {
  const occurrences: Date[] = [];
  let current = new Date(startDate);

  const endDate = repeatUntil || new Date(current.getTime() + 365 * 24 * 60 * 60 * 1000);

  while (current <= endDate) {
    occurrences.push(new Date(current));
    current = new Date(current.getTime() + repeatIntervalDays * 24 * 60 * 60 * 1000);
  }

  return occurrences;
}

export async function listAllReminders(options?: {
  start?: Date;
  end?: Date;
  includeCompleted?: boolean;
}) {
  const where: Prisma.ContactReminderWhereInput = {};

  if (!options?.includeCompleted) {
    where.completedAt = null;
  }

  // Obtener todos los recordatorios sin limite de fecha para procesarlos en memoria
  const allReminders = await prisma.contactReminder.findMany({
    where: {
      completedAt: !options?.includeCompleted ? null : undefined,
    },
    select: reminderSelect,
  });

  if (!options?.start || !options?.end) {
    return allReminders.sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime());
  }

  const rangeStart = new Date(options.start);
  const rangeEnd = new Date(options.end);

  // Filtrar y mapear recordatorios que tienen ocurrencias dentro del rango
  const remindersInRange = allReminders
    .filter((reminder) => {
      // Recordatorios no recurrentes
      if (!reminder.repeatIntervalDays) {
        return reminder.remindAt >= rangeStart && reminder.remindAt <= rangeEnd;
      }

      // Recordatorios recurrentes: verificar si tienen ocurrencias en el rango
      const occurrences = generateOccurrences(
        reminder.remindAt,
        reminder.repeatIntervalDays,
        reminder.repeatUntil
      );

      return occurrences.some((occ) => occ >= rangeStart && occ <= rangeEnd);
    })
    .sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime());

  return remindersInRange;
}

export async function createReminder(
  contactId: number,
  input: {
    title: string;
    description?: string | null;
    remindAt: Date;
    repeatIntervalDays?: number | null;
    repeatUntil?: Date | null;
  }
) {
  return prisma.contactReminder.create({
    data: {
      contactId,
      title: input.title.trim(),
      description: input.description ? input.description.trim() : null,
      remindAt: input.remindAt,
      repeatIntervalDays: input.repeatIntervalDays ?? null,
      repeatUntil: input.repeatUntil ?? null,
    },
    select: reminderSelect,
  });
}

export async function updateReminder(
  reminderId: number,
  input: {
    title?: string;
    description?: string | null;
    remindAt?: Date;
    repeatIntervalDays?: number | null;
    repeatUntil?: Date | null;
    completedAt?: Date | null;
  }
) {
  const data: Prisma.ContactReminderUpdateInput = {};
  if (typeof input.title === 'string') data.title = input.title.trim();
  if (input.description !== undefined)
    data.description = input.description ? input.description.trim() : null;
  if (input.remindAt !== undefined) data.remindAt = input.remindAt;
  if (input.repeatIntervalDays !== undefined)
    data.repeatIntervalDays = input.repeatIntervalDays;
  if (input.repeatUntil !== undefined) data.repeatUntil = input.repeatUntil;
  if (input.completedAt !== undefined)
    data.completedAt = input.completedAt ?? null;

  return prisma.contactReminder.update({
    where: { id: reminderId },
    data,
    select: reminderSelect,
  });
}

export async function deleteReminder(reminderId: number) {
  await prisma.contactReminder.delete({ where: { id: reminderId } });
}

export async function listDueReminders(targetDate: Date) {
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);

  return prisma.contactReminder.findMany({
    where: {
      remindAt: {
        gte: start,
        lte: end,
      },
      completedAt: null,
      OR: [
        {
          repeatUntil: null,
        },
        {
          repeatUntil: {
            gte: start,
          },
        },
      ],
    },
    orderBy: { remindAt: 'asc' },
    select: reminderSelect,
  });
}

export async function markReminderTriggered(reminderId: number) {
  const reminder = await prisma.contactReminder.findUnique({
    where: { id: reminderId },
  });
  if (!reminder) {
    throw new Error('Reminder not found');
  }

  const updates: Prisma.ContactReminderUpdateInput = {
    lastTriggeredAt: new Date(),
  };

  if (reminder.repeatIntervalDays) {
    const next = addDays(reminder.remindAt, reminder.repeatIntervalDays);
    const repeatUntil = reminder.repeatUntil
      ? new Date(reminder.repeatUntil)
      : null;
    if (repeatUntil && next > repeatUntil) {
      updates.completedAt = new Date();
    } else {
      updates.remindAt = next;
    }
  } else {
    updates.completedAt = new Date();
  }

  return prisma.contactReminder.update({
    where: { id: reminderId },
    data: updates,
    select: reminderSelect,
  });
}

export function isReminderDueToday(
  reminder: ReminderRecord,
  baseDate = new Date()
) {
  return isSameDay(reminder.remindAt, baseDate);
}
