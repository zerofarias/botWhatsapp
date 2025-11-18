import type { Prisma, SystemSettings } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export type ReceivingWindow = {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
};

export const WEEK_DAYS: string[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const DEFAULT_RECEIVING_WINDOWS: ReceivingWindow[] = WEEK_DAYS.map(
  (day) => ({
    day,
    enabled: day !== 'saturday' && day !== 'sunday',
    start: '08:00',
    end: '20:00',
  })
);

export const DEFAULT_SYSTEM_SETTINGS = {
  timezone: 'America/Buenos_Aires',
  language: 'es',
  dateFormat: 'DD/MM/YYYY',
  autoCloseMinutes: 30,
  notificationsEmail: true,
  notificationsWeb: true,
  notificationsPush: false,
};
const DEFAULT_QUIET_HOURS_JSON: Prisma.InputJsonValue =
  DEFAULT_RECEIVING_WINDOWS;

type SystemSettingsPayload = {
  timezone?: string;
  language?: string;
  dateFormat?: string;
  autoCloseMinutes?: number;
  notificationsEmail?: boolean;
  notificationsWeb?: boolean;
  notificationsPush?: boolean;
  quietHours?: ReceivingWindow[];
};

let cachedSettings: SystemSettings | null = null;
let lastLoadedAt = 0;
const SETTINGS_CACHE_TTL_MS = 30_000;

function toJsonQuietHours(windows?: ReceivingWindow[]): Prisma.InputJsonValue {
  if (!windows || !Array.isArray(windows)) {
    return DEFAULT_QUIET_HOURS_JSON;
  }
  return windows.map((entry) => ({
    day: entry.day,
    enabled: Boolean(entry.enabled),
    start: entry.start,
    end: entry.end,
  })) as Prisma.InputJsonValue;
}

export function mapQuietHours(
  value: Prisma.JsonValue | null | undefined
): ReceivingWindow[] {
  if (!value) return DEFAULT_RECEIVING_WINDOWS;
  if (!Array.isArray(value)) return DEFAULT_RECEIVING_WINDOWS;
  const normalized = value
    .map((entry) => {
      if (
        typeof entry !== 'object' ||
        entry === null ||
        typeof (entry as { day?: unknown }).day !== 'string'
      ) {
        return null;
      }
      const day = ((entry as { day: string }).day || '').toLowerCase();
      if (!WEEK_DAYS.includes(day)) {
        return null;
      }
      const start = (entry as { start?: string }).start ?? '08:00';
      const end = (entry as { end?: string }).end ?? '20:00';
      const enabled = Boolean((entry as { enabled?: boolean }).enabled);
      return { day, start, end, enabled };
    })
    .filter(Boolean) as ReceivingWindow[];
  if (!normalized.length) return DEFAULT_RECEIVING_WINDOWS;
  return normalized;
}

export async function ensureSystemSettings(): Promise<SystemSettings> {
  const found = await prisma.systemSettings.findUnique({
    where: { id: 1 },
  });
  if (found) return found;
  return prisma.systemSettings.create({
    data: {
      id: 1,
      timezone: DEFAULT_SYSTEM_SETTINGS.timezone,
      language: DEFAULT_SYSTEM_SETTINGS.language,
      dateFormat: DEFAULT_SYSTEM_SETTINGS.dateFormat,
      autoCloseMinutes: DEFAULT_SYSTEM_SETTINGS.autoCloseMinutes,
      notificationsEmail: DEFAULT_SYSTEM_SETTINGS.notificationsEmail,
      notificationsWeb: DEFAULT_SYSTEM_SETTINGS.notificationsWeb,
      notificationsPush: DEFAULT_SYSTEM_SETTINGS.notificationsPush,
      quietHours: DEFAULT_QUIET_HOURS_JSON,
    },
  });
}

export async function getSystemSettingsCached(
  refresh = false
): Promise<SystemSettings> {
  if (
    !refresh &&
    cachedSettings &&
    Date.now() - lastLoadedAt < SETTINGS_CACHE_TTL_MS
  ) {
    return cachedSettings;
  }
  const settings = await ensureSystemSettings();
  cachedSettings = settings;
  lastLoadedAt = Date.now();
  return settings;
}

export function invalidateSystemSettingsCache() {
  cachedSettings = null;
  lastLoadedAt = 0;
}

export async function listSettingsAudit(limit = 20) {
  return prisma.settingsAudit.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  });
}

export async function recordSettingsAudit(options: {
  userId: number | null;
  action: string;
  description?: string;
  changes?: Prisma.InputJsonValue;
}) {
  await prisma.settingsAudit.create({
    data: {
      userId: options.userId ?? null,
      action: options.action,
      description: options.description,
      changes: options.changes,
    },
  });
}

export async function updateSystemSettingsRecord(
  payload: SystemSettingsPayload,
  userId: number | null = null,
  description?: string
): Promise<SystemSettings> {
  const current = await ensureSystemSettings();
  const data: Prisma.SystemSettingsUpdateInput = {
    timezone: payload.timezone ?? current.timezone,
    language: payload.language ?? current.language,
    dateFormat: payload.dateFormat ?? current.dateFormat,
    autoCloseMinutes: payload.autoCloseMinutes ?? current.autoCloseMinutes,
    notificationsEmail:
      payload.notificationsEmail ?? current.notificationsEmail,
    notificationsWeb: payload.notificationsWeb ?? current.notificationsWeb,
    notificationsPush: payload.notificationsPush ?? current.notificationsPush,
  };

  if (payload.quietHours) {
    data.quietHours = toJsonQuietHours(payload.quietHours);
  }

  const updated = await prisma.systemSettings.update({
    where: { id: current.id },
    data,
  });

  await recordSettingsAudit({
    userId,
    action: 'update',
    description,
    changes: {
      before: {
        timezone: current.timezone,
        language: current.language,
        dateFormat: current.dateFormat,
        autoCloseMinutes: current.autoCloseMinutes,
        notificationsEmail: current.notificationsEmail,
        notificationsWeb: current.notificationsWeb,
        notificationsPush: current.notificationsPush,
        quietHours: mapQuietHours(current.quietHours),
      },
      after: {
        timezone: updated.timezone,
        language: updated.language,
        dateFormat: updated.dateFormat,
        autoCloseMinutes: updated.autoCloseMinutes,
        notificationsEmail: updated.notificationsEmail,
        notificationsWeb: updated.notificationsWeb,
        notificationsPush: updated.notificationsPush,
        quietHours: mapQuietHours(updated.quietHours),
      },
    },
  });

  invalidateSystemSettingsCache();
  return updated;
}

export async function resetSystemSettingsRecord(
  userId: number | null = null
): Promise<SystemSettings> {
  const updated = await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {
      timezone: DEFAULT_SYSTEM_SETTINGS.timezone,
      language: DEFAULT_SYSTEM_SETTINGS.language,
      dateFormat: DEFAULT_SYSTEM_SETTINGS.dateFormat,
      autoCloseMinutes: DEFAULT_SYSTEM_SETTINGS.autoCloseMinutes,
      notificationsEmail: DEFAULT_SYSTEM_SETTINGS.notificationsEmail,
      notificationsWeb: DEFAULT_SYSTEM_SETTINGS.notificationsWeb,
      notificationsPush: DEFAULT_SYSTEM_SETTINGS.notificationsPush,
      quietHours: DEFAULT_QUIET_HOURS_JSON,
    },
    create: {
      id: 1,
      timezone: DEFAULT_SYSTEM_SETTINGS.timezone,
      language: DEFAULT_SYSTEM_SETTINGS.language,
      dateFormat: DEFAULT_SYSTEM_SETTINGS.dateFormat,
      autoCloseMinutes: DEFAULT_SYSTEM_SETTINGS.autoCloseMinutes,
      notificationsEmail: DEFAULT_SYSTEM_SETTINGS.notificationsEmail,
      notificationsWeb: DEFAULT_SYSTEM_SETTINGS.notificationsWeb,
      notificationsPush: DEFAULT_SYSTEM_SETTINGS.notificationsPush,
      quietHours: DEFAULT_QUIET_HOURS_JSON,
    },
  });

  await recordSettingsAudit({
    userId,
    action: 'reset',
    description: 'Restableció la configuración a los valores predeterminados',
  });

  invalidateSystemSettingsCache();
  return updated;
}

export function serializeSystemSettings(record: SystemSettings) {
  return {
    id: record.id,
    timezone: record.timezone,
    language: record.language,
    dateFormat: record.dateFormat,
    autoCloseMinutes: record.autoCloseMinutes,
    notificationsEmail: record.notificationsEmail,
    notificationsWeb: record.notificationsWeb,
    notificationsPush: record.notificationsPush,
    quietHours: mapQuietHours(record.quietHours),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
