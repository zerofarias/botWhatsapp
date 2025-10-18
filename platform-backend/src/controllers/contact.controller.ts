import type { Request, Response } from 'express';
import {
  createContact,
  deleteContact,
  getContactById,
  importContacts,
  listContacts,
  updateContact,
} from '../services/contact.service.js';

export async function listContactsHandler(_req: Request, res: Response) {
  const contacts = await listContacts();
  return res.json(contacts);
}

export async function createContactHandler(req: Request, res: Response) {
  const { name, phone, dni, areaId } = req.body ?? {};

  if (!name || !phone) {
    return res.status(400).json({
      message: 'Los campos name y phone son obligatorios.',
    });
  }

  try {
    const contact = await createContact({
      name,
      phone,
      dni,
      areaId: typeof areaId === 'number' ? areaId : null,
    });
    return res.status(201).json(contact);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No fue posible crear el contacto.';
    return res.status(400).json({ message });
  }
}

export async function updateContactHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'Identificador invalido.' });
  }

  try {
    const updated = await updateContact(id, {
      name: req.body?.name,
      phone: req.body?.phone,
      dni: req.body?.dni,
      areaId:
        req.body?.areaId === undefined
          ? undefined
          : typeof req.body.areaId === 'number'
          ? req.body.areaId
          : null,
    });
    return res.json(updated);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No fue posible actualizar el contacto.';
    return res.status(400).json({ message });
  }
}

export async function deleteContactHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'Identificador invalido.' });
  }

  await deleteContact(id);
  return res.status(204).send();
}

export async function importContactsHandler(req: Request, res: Response) {
  const { type, payload } = req.body ?? {};
  const importType = type === 'csv' ? 'csv' : 'json';
  try {
    const records = await importContacts(payload, importType);
    return res.status(201).json({
      imported: records.length,
      contacts: records,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No fue posible importar los contactos.';
    return res.status(400).json({ message });
  }
}

export async function getContactHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'Identificador invalido.' });
  }

  const contact = await getContactById(id);
  if (!contact) {
    return res.status(404).json({ message: 'Contacto no encontrado.' });
  }
  return res.json(contact);
}
