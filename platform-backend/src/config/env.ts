import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = ['DATABASE_URL', 'SESSION_SECRET'] as const;

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

function parseOrigins(value?: string) {
  if (!value) return [] as string[];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function parseSameSite(value?: string): 'lax' | 'strict' | 'none' {
  const normalized = value?.toLowerCase();
  if (normalized === 'strict' || normalized === 'none') {
    return normalized;
  }
  return 'lax';
}

const isProduction = process.env.NODE_ENV === 'production';

export const env = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL as string,
  sessionSecret: process.env.SESSION_SECRET as string,
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'wppconnect.sid',
  sessionCookieSecure:
    process.env.SESSION_COOKIE_SECURE === 'true' ||
    (process.env.SESSION_COOKIE_SECURE === undefined && isProduction),
  sessionCookieSameSite: parseSameSite(process.env.SESSION_COOKIE_SAMESITE),
  sessionMaxAgeMs: Number(process.env.SESSION_MAX_AGE) || 1000 * 60 * 60 * 12,
  sessionCleanupIntervalMs:
    Number(process.env.SESSION_CLEANUP_INTERVAL) || 60 * 1000,
  sessionRolling: process.env.SESSION_ROLLING === 'true',
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
  wppHeadless: process.env.WPP_HEADLESS !== 'false',
  wppAutoCloseMs:
    Number(process.env.WPP_AUTO_CLOSE) > 0
      ? Number(process.env.WPP_AUTO_CLOSE)
      : 0,
  autoCloseMinutes:
    Number(process.env.AUTO_CLOSE_MINUTES) > 0
      ? Number(process.env.AUTO_CLOSE_MINUTES)
      : 30,
  schedulerIntervalMs:
    Number(process.env.SCHEDULER_INTERVAL_MS) > 0
      ? Number(process.env.SCHEDULER_INTERVAL_MS)
      : 5 * 60 * 1000,
  autoCloseMessage:
    process.env.AUTO_CLOSE_MESSAGE ?? '🕒 Chat finalizado por inactividad',
};
