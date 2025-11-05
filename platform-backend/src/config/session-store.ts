import session from 'express-session';
import type { SessionData } from 'express-session';
import type { PrismaClient } from '@prisma/client';

function toDate(value: unknown) {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed;
    }
  }
  return undefined;
}

import { logSystem } from '../utils/log-system.js';

export class PrismaSessionStore extends session.Store {
  private ttlMs: number;

  constructor(
    private readonly prisma: PrismaClient,
    {
      ttlMs,
      cleanupIntervalMs = 60_000,
    }: {
      ttlMs: number;
      cleanupIntervalMs?: number;
    }
  ) {
    super();
    this.ttlMs = ttlMs;
    if (cleanupIntervalMs > 0) {
      setInterval(() => void this.cleanupExpired(), cleanupIntervalMs).unref();
    }
  }

  private async cleanupExpired() {
    try {
      await this.prisma.session.deleteMany({
        where: {
          expires: {
            lt: new Date(),
          },
        },
      });
    } catch {
      // ignore cleanup errors
    }
  }

  private computeExpiry(sessionData: SessionData) {
    const cookie = sessionData.cookie;
    const explicit = toDate(cookie?.expires);
    if (explicit) {
      return explicit;
    }
    const maxAge =
      typeof cookie?.maxAge === 'number' ? cookie.maxAge : this.ttlMs;
    return new Date(Date.now() + maxAge);
  }

  override async get(
    sid: string,
    callback: (err: unknown, session?: SessionData | null) => void
  ) {
    try {
      const record = await this.prisma.session.findUnique({
        where: { sid },
      });
      if (!record) {
        callback(null, null);
        return;
      }
      if (record.expires && record.expires < new Date()) {
        await this.prisma.session.delete({ where: { sid } });
        callback(null, null);
        return;
      }
      let data: SessionData | null = null;
      if (record.data) {
        try {
          data = JSON.parse(record.data) as SessionData;
        } catch (parseError) {
          logSystem(
            `Removing invalid session payload for sid=${sid}: ${
              parseError instanceof Error ? parseError.message : parseError
            }`
          );
          await this.prisma.session.delete({ where: { sid } });
          callback(null, null);
          return;
        }
      }

      callback(null, data ?? ({} as SessionData));
    } catch (error) {
      callback(error);
    }
  }

  override async set(
    sid: string,
    sessionData: SessionData,
    callback: (err?: unknown) => void
  ) {
    try {
      const expires = this.computeExpiry(sessionData);
      
      // Serializar de forma segura
      let dataStr: string;
      try {
        dataStr = JSON.stringify(sessionData);
      } catch (stringifyError) {
        logSystem(
          `Failed to stringify session data for sid=${sid}: ${
            stringifyError instanceof Error ? stringifyError.message : stringifyError
          }`
        );
        callback(stringifyError);
        return;
      }
      
      await this.prisma.session.upsert({
        where: { sid },
        create: {
          sid,
          data: dataStr,
          expires,
        },
        update: {
          data: dataStr,
          expires,
        },
      });
      callback();
    } catch (error) {
      callback(error);
    }
  }

  override async destroy(
    sid: string,
    callback: (err?: unknown) => void
  ) {
    try {
      await this.prisma.session.deleteMany({ where: { sid } });
      callback();
    } catch (error) {
      callback(error);
    }
  }

  override async touch(
    sid: string,
    sessionData: SessionData,
    callback: (err?: unknown) => void
  ) {
    try {
      const expires = this.computeExpiry(sessionData);
      await this.prisma.session.updateMany({
        where: { sid },
        data: { expires },
      });
      callback();
    } catch (error) {
      callback(error);
    }
  }

  override async clear(callback: (err?: unknown) => void) {
    try {
      await this.prisma.session.deleteMany();
      callback();
    } catch (error) {
      callback(error);
    }
  }

  override async length(callback: (err: unknown, length?: number) => void) {
    try {
      const count = await this.prisma.session.count();
      callback(null, count);
    } catch (error) {
      callback(error);
    }
  }
}
