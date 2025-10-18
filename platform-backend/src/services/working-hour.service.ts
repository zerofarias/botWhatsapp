import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

const workingHourSelect = Prisma.validator<Prisma.WorkingHourSelect>()({
  id: true,
  areaId: true,
  startTime: true,
  endTime: true,
  days: true,
  message: true,
  createdAt: true,
  updatedAt: true,
  area: {
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  },
});

export type WorkingHourRecord = Prisma.WorkingHourGetPayload<{
  select: typeof workingHourSelect;
}>;

type WorkingHourInput = {
  areaId: number;
  startTime: string;
  endTime: string;
  days: string | number[];
  message?: string | null;
};

type WorkingHourUpdateInput = {
  startTime?: string;
  endTime?: string;
  days?: string | number[];
  message?: string | null;
};

const TIME_REGEX = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;

function normalizeTime(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!TIME_REGEX.test(trimmed)) {
    throw new Error('El horario debe tener el formato HH:mm.');
  }
  return trimmed.padStart(5, '0');
}

function normalizeDays(value: string | number[] | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const rawList = Array.isArray(value)
    ? value
    : value
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item));

  const sanitized = Array.from(
    new Set(
      rawList
        .filter((item) => item >= 0 && item <= 6)
        .map((item) => Number(item))
    )
  ).sort((a, b) => a - b);

  if (!sanitized.length) {
    throw new Error('Debe seleccionar al menos un dia valido (0-6).');
  }

  return sanitized.join(',');
}

async function ensureAreaExists(areaId: number) {
  const exists = await prisma.area.count({ where: { id: areaId } });
  if (!exists) {
    throw new Error('El area indicada no existe.');
  }
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map((part) => Number(part));
  return hours * 60 + minutes;
}

export async function listWorkingHours(areaId?: number) {
  return prisma.workingHour.findMany({
    where: areaId ? { areaId } : undefined,
    orderBy: [{ areaId: 'asc' }, { startTime: 'asc' }],
    select: workingHourSelect,
  });
}

export async function createWorkingHour(input: WorkingHourInput) {
  await ensureAreaExists(input.areaId);

  const startTime = normalizeTime(input.startTime);
  const endTime = normalizeTime(input.endTime);
  if (!startTime || !endTime) {
    throw new Error('Los horarios de inicio y fin son obligatorios.');
  }
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (endMinutes <= startMinutes) {
    throw new Error('El horario de fin debe ser mayor al horario de inicio.');
  }

  const days = normalizeDays(input.days);

  return prisma.workingHour.create({
    data: {
      areaId: input.areaId,
      startTime,
      endTime,
      days: days!,
      message: input.message?.trim() ?? null,
    },
    select: workingHourSelect,
  });
}

export async function updateWorkingHour(
  id: number,
  input: WorkingHourUpdateInput
) {
  const current = await prisma.workingHour.findUnique({
    where: { id },
    select: {
      startTime: true,
      endTime: true,
      days: true,
      message: true,
    },
  });

  if (!current) {
    throw new Error('Horario no encontrado.');
  }

  const data: Prisma.WorkingHourUpdateInput = {};

  if (input.startTime !== undefined) {
    const parsed = normalizeTime(input.startTime);
    if (!parsed) {
      throw new Error('El horario de inicio es obligatorio.');
    }
    data.startTime = parsed;
  }

  if (input.endTime !== undefined) {
    const parsed = normalizeTime(input.endTime);
    if (!parsed) {
      throw new Error('El horario de fin es obligatorio.');
    }
    data.endTime = parsed;
  }

  if (input.days !== undefined) {
    data.days = normalizeDays(input.days)!;
  }

  if (input.message !== undefined) {
    data.message = input.message?.trim() ? input.message.trim() : null;
  }

  const nextStart = (data.startTime as string | undefined) ?? current.startTime;
  const nextEnd = (data.endTime as string | undefined) ?? current.endTime;
  const nextDays = (data.days as string | undefined) ?? current.days;

  if (timeToMinutes(nextEnd) <= timeToMinutes(nextStart)) {
    throw new Error('El horario de fin debe ser mayor al inicio.');
  }

  data.startTime = nextStart;
  data.endTime = nextEnd;
  data.days = nextDays;

  const record = await prisma.workingHour.update({
    where: { id },
    data,
    select: workingHourSelect,
  });

  return record;
}

export async function deleteWorkingHour(id: number) {
  await prisma.workingHour.delete({
    where: { id },
  });
}
