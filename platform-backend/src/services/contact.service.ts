import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { logSystem } from '../utils/log-system.js';

const contactSelect = Prisma.validator<Prisma.ContactSelect>()({
  id: true,
  name: true,
  phone: true,
  dni: true,
  areaId: true,
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

export type ContactRecord = Prisma.ContactGetPayload<{
  select: typeof contactSelect;
}>;

const DNI_REGEX = /^[0-9]{7,8}$/;

type ContactInput = {
  name: string;
  phone: string;
  dni?: string | null;
  areaId?: number | null;
};

type ContactUpdateInput = {
  name?: string;
  phone?: string;
  dni?: string | null;
  areaId?: number | null;
};

type ContactImportEntry = {
  name?: string | null;
  phone?: string | null;
  dni?: string | null;
  area?: string | number | null;
};

function normalizePhone(value: string) {
  return value.replace(/\s+/g, '').trim();
}

function normalizeName(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function sanitizeDni(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!DNI_REGEX.test(trimmed)) {
    throw new Error('El DNI debe contener 7 u 8 digitos numericos.');
  }
  return trimmed;
}

async function resolveAreaId(area: string | number | null | undefined) {
  if (typeof area === 'number' && Number.isInteger(area)) {
    const exists = await prisma.area.count({ where: { id: area } });
    return exists ? area : null;
  }
  const label = area?.toString().trim();
  if (!label) return null;

  const match = await prisma.area.findFirst({
    where: {
      name: { equals: label },
    },
    select: { id: true },
  });

  return match?.id ?? null;
}

export async function listContacts() {
  return prisma.contact.findMany({
    orderBy: [{ name: 'asc' }, { phone: 'asc' }],
    select: contactSelect,
  });
}

export async function getContactById(id: number) {
  return prisma.contact.findUnique({
    where: { id },
    select: contactSelect,
  });
}

export async function findContactByPhone(phone: string) {
  return prisma.contact.findUnique({
    where: { phone: normalizePhone(phone) },
    select: contactSelect,
  });
}

export async function createContact(input: ContactInput) {
  const phone = normalizePhone(input.phone);
  if (!phone) {
    throw new Error('El numero de telefono es obligatorio.');
  }

  const existing = await prisma.contact.findUnique({
    where: { phone },
    select: { id: true },
  });
  if (existing) {
    throw new Error('Ya existe un contacto con ese telefono.');
  }

  const dni = sanitizeDni(input.dni ?? null);

  return prisma.contact.create({
    data: {
      name: input.name.trim(),
      phone,
      dni,
      areaId: input.areaId ?? null,
    },
    select: contactSelect,
  });
}

export async function updateContact(id: number, input: ContactUpdateInput) {
  const data: Prisma.ContactUpdateInput = {};

  if (typeof input.name === 'string') {
    data.name = input.name.trim();
  }

  if (typeof input.phone === 'string') {
    const phone = normalizePhone(input.phone);
    if (!phone) {
      throw new Error('El numero de telefono es obligatorio.');
    }
    const exists = await prisma.contact.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (exists && exists.id !== id) {
      throw new Error('Ya existe un contacto con ese telefono.');
    }
    data.phone = phone;
  }

  if (input.dni !== undefined) {
    data.dni = sanitizeDni(input.dni);
  }

  if (input.areaId !== undefined) {
    data.area = input.areaId
      ? { connect: { id: input.areaId } }
      : { disconnect: true };
  }

  return prisma.contact.update({
    where: { id },
    data,
    select: contactSelect,
  });
}

export async function deleteContact(id: number) {
  await prisma.contact.delete({
    where: { id },
  });
}

export async function importContactsFromArray(entries: ContactImportEntry[]) {
  const results: ContactRecord[] = [];

  for (const entry of entries) {
    const phoneRaw = entry.phone?.trim();
    if (!phoneRaw) {
      // Skip invalid rows silently
      // eslint-disable-next-line no-continue
      continue;
    }
    const phone = normalizePhone(phoneRaw);
    const name = normalizeName(entry.name) || 'Sin nombre';

    const areaId = await resolveAreaId(entry.area ?? null);
    const dniValue = entry.dni ? sanitizeDni(entry.dni) : null;

    const record = await prisma.contact.upsert({
      where: { phone },
      update: {
        name,
        dni: dniValue,
        areaId,
      },
      create: {
        name,
        phone,
        dni: dniValue,
        areaId,
      },
      select: contactSelect,
    });

    results.push(record);
  }

  return results;
}

export async function importContactsFromCsv(csvContent: string) {
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length && !line.startsWith('#'));

  const entries: ContactImportEntry[] = [];

  for (const line of lines) {
    const cells = line.split(',').map((cell) => cell.trim());
    if (!cells.length) continue;

    const [name, phone, dni, area] = cells;
    entries.push({
      name,
      phone,
      dni,
      area: area ?? null,
    });
  }

  return importContactsFromArray(entries);
}

export async function importContacts(
  payload: unknown,
  type: 'csv' | 'json' = 'json'
) {
  if (type === 'csv') {
    if (typeof payload !== 'string') {
      throw new Error('El contenido CSV debe ser una cadena.');
    }
    return importContactsFromCsv(payload);
  }

  if (!Array.isArray(payload)) {
    throw new Error('El contenido JSON debe ser un arreglo de contactos.');
  }

  return importContactsFromArray(payload as ContactImportEntry[]);
}

export async function findOrCreateContactByPhone(
  phoneValue: string,
  defaults?: {
    name?: string | null;
    areaId?: number | null;
    dni?: string | null;
  }
) {
  const phone = normalizePhone(phoneValue);
  const existing = await prisma.contact.findUnique({
    where: { phone },
    select: contactSelect,
  });
  if (existing) {
    return { contact: existing, created: false };
  }

  const contact = await prisma.contact.create({
    data: {
      name: normalizeName(defaults?.name) || 'Desconocido',
      phone,
      dni: defaults?.dni ? sanitizeDni(defaults.dni) : null,
      areaId: defaults?.areaId ?? null,
    },
    select: contactSelect,
  });

  logSystem(`Nuevo contacto detectado: ${contact.name} (${contact.phone})`);
  return { contact, created: true };
}
