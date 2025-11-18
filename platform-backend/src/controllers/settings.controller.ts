import type { Request, Response } from 'express';
import {
  DEFAULT_RECEIVING_WINDOWS,
  ReceivingWindow,
  ensureSystemSettings,
  listSettingsAudit,
  resetSystemSettingsRecord,
  serializeSystemSettings,
  updateSystemSettingsRecord,
} from '../services/settings.service.js';

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function sanitizeQuietHours(input: unknown): ReceivingWindow[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const normalized: ReceivingWindow[] = [];
  for (const entry of input) {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      typeof (entry as { day?: unknown }).day !== 'string'
    ) {
      continue;
    }
    const day = ((entry as { day: string }).day || '').toLowerCase();
    if (!DEFAULT_RECEIVING_WINDOWS.some((base) => base.day === day)) {
      continue;
    }
    const start = (entry as { start?: string }).start ?? '08:00';
    const end = (entry as { end?: string }).end ?? '20:00';
    if (!isValidTime(start) || !isValidTime(end)) {
      continue;
    }
    normalized.push({
      day,
      start,
      end,
      enabled: Boolean((entry as { enabled?: boolean }).enabled),
    });
  }
  if (!normalized.length) return undefined;
  return normalized;
}

function extractSettingsPayload(body: any) {
  const timezone =
    typeof body?.timezone === 'string' && body.timezone.trim().length > 0
      ? body.timezone.trim()
      : undefined;

  const language =
    body?.language === 'es' || body?.language === 'en'
      ? body.language
      : undefined;

  const dateFormat =
    body?.dateFormat === 'MM/DD/YYYY' || body?.dateFormat === 'DD/MM/YYYY'
      ? body.dateFormat
      : undefined;

  const autoCloseMinutes =
    typeof body?.autoCloseMinutes === 'number' &&
    Number.isFinite(body.autoCloseMinutes)
      ? Math.min(Math.max(Math.round(body.autoCloseMinutes), 5), 480)
      : undefined;

  const notificationsSource = body?.notifications ?? body;
  const notificationsEmail =
    typeof notificationsSource?.notificationsEmail === 'boolean'
      ? notificationsSource.notificationsEmail
      : typeof notificationsSource?.email === 'boolean'
      ? notificationsSource.email
      : undefined;
  const notificationsWeb =
    typeof notificationsSource?.notificationsWeb === 'boolean'
      ? notificationsSource.notificationsWeb
      : typeof notificationsSource?.web === 'boolean'
      ? notificationsSource.web
      : undefined;
  const notificationsPush =
    typeof notificationsSource?.notificationsPush === 'boolean'
      ? notificationsSource.notificationsPush
      : typeof notificationsSource?.push === 'boolean'
      ? notificationsSource.push
      : undefined;

  const quietHours = sanitizeQuietHours(body?.quietHours);

  return {
    timezone,
    language,
    dateFormat,
    autoCloseMinutes,
    notificationsEmail,
    notificationsWeb,
    notificationsPush,
    quietHours,
  };
}

export async function getSystemSettings(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const record = await ensureSystemSettings();
  const audits = await listSettingsAudit();
  res.json({
    settings: serializeSystemSettings(record),
    audits: audits.map((entry) => ({
      id: entry.id,
      action: entry.action,
      description: entry.description,
      createdAt: entry.createdAt,
      user: entry.user
        ? {
            id: entry.user.id,
            name: entry.user.name,
            username: entry.user.username,
          }
        : null,
    })),
  });
}

export async function updateSystemSettings(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const payload = extractSettingsPayload(req.body);
  const updated = await updateSystemSettingsRecord(
    payload,
    req.user.id,
    'Actualizó las preferencias operativas'
  );
  res.json({ settings: serializeSystemSettings(updated) });
}

export async function exportSystemSettings(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const record = await ensureSystemSettings();
  res.json({ settings: serializeSystemSettings(record) });
}

export async function importSystemSettings(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const payload = extractSettingsPayload(req.body?.settings ?? req.body);
  if (
    !payload.timezone &&
    !payload.language &&
    !payload.dateFormat &&
    !payload.autoCloseMinutes &&
    !payload.notificationsEmail &&
    !payload.notificationsWeb &&
    !payload.notificationsPush &&
    !payload.quietHours
  ) {
    return res.status(400).json({
      message:
        'El archivo importado no contiene campos de configuración válidos.',
    });
  }
  const updated = await updateSystemSettingsRecord(
    payload,
    req.user.id,
    'Importó configuraciones del sistema'
  );
  res.json({ settings: serializeSystemSettings(updated) });
}

export async function resetSystemSettings(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const updated = await resetSystemSettingsRecord(req.user.id);
  res.json({ settings: serializeSystemSettings(updated) });
}
