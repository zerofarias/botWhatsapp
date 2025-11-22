/**
 * @swagger
 * /contacts:
 *   get:
 *     summary: Listar todos los contactos
 *     tags:
 *       - Contactos
 *     responses:
 *       200:
 *         description: Lista de contactos
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
 *                   phone:
 *                     type: string
 *                   dni:
 *                     type: string
 *   post:
 *     summary: Crear contacto
 *     tags:
 *       - Contactos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               dni:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contacto creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 dni:
 *                   type: string
 *       500:
 *         description: Error al crear contacto
 */
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
  const {
    name,
    phone,
    dni,
    areaId,
    address1,
    address2,
    obraSocial,
    obraSocial2,
    isVip,
    isProblematic,
    isChronic,
  } = req.body ?? {};

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
      address1: typeof address1 === 'string' ? address1 : null,
      address2: typeof address2 === 'string' ? address2 : null,
      obraSocial: typeof obraSocial === 'string' ? obraSocial : null,
      obraSocial2: typeof obraSocial2 === 'string' ? obraSocial2 : null,
      isVip: isVip === true,
      isProblematic: isProblematic === true,
      isChronic: isChronic === true,
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
      address1:
        req.body?.address1 === undefined
          ? undefined
          : typeof req.body.address1 === 'string'
          ? req.body.address1
          : null,
      address2:
        req.body?.address2 === undefined
          ? undefined
          : typeof req.body.address2 === 'string'
          ? req.body.address2
          : null,
      obraSocial:
        req.body?.obraSocial === undefined
          ? undefined
          : typeof req.body.obraSocial === 'string'
          ? req.body.obraSocial
          : null,
      obraSocial2:
        req.body?.obraSocial2 === undefined
          ? undefined
          : typeof req.body.obraSocial2 === 'string'
          ? req.body.obraSocial2
          : null,
      isVip:
        req.body?.isVip === undefined ? undefined : Boolean(req.body.isVip),
      isProblematic:
        req.body?.isProblematic === undefined
          ? undefined
          : Boolean(req.body.isProblematic),
      isChronic:
        req.body?.isChronic === undefined
          ? undefined
          : Boolean(req.body.isChronic),
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
