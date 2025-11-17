import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

const clampDays = (value: number | null | undefined) => {
  if (!value || Number.isNaN(value)) {
    return 7;
  }
  return Math.min(Math.max(value, 1), 90);
};

const toNumber = (value: bigint | number | null | undefined) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return value;
};

export async function getAdminAnalyticsSummary(req: Request, res: Response) {
  try {
    const daysParam = req.query.days
      ? parseInt(String(req.query.days), 10)
      : undefined;
    const days = clampDays(daysParam);
    const now = new Date();
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [
      totalContacts,
      newContacts,
      newNumbersRaw,
      hotMessageHoursRaw,
      hotOrderHoursRaw,
      messagesPerDayRaw,
      nightlyMessagesRaw,
      avgResponseRaw,
      avgOrderClosureRaw,
    ] = await Promise.all([
      prisma.contact.count(),
      prisma.contact.count({
        where: {
          createdAt: {
            gte: since,
          },
        },
      }),
      prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`
          SELECT COUNT(*) AS total
          FROM (
            SELECT user_phone, MIN(created_at) AS first_seen
            FROM conversations
            GROUP BY user_phone
            HAVING first_seen >= ${since}
          ) AS fresh_numbers;
        `
      ),
      prisma.$queryRaw<{ hour: number; total: bigint }[]>(
        Prisma.sql`
          SELECT HOUR(created_at) AS hour, COUNT(*) AS total
          FROM messages
          WHERE sender_type = 'contact'
            AND created_at >= ${since}
          GROUP BY HOUR(created_at)
          ORDER BY hour ASC;
        `
      ),
      prisma.$queryRaw<{ hour: number; total: bigint }[]>(
        Prisma.sql`
          SELECT HOUR(created_at) AS hour, COUNT(*) AS total
          FROM orders
          WHERE created_at >= ${since}
          GROUP BY HOUR(created_at)
          ORDER BY hour ASC;
        `
      ),
      prisma.$queryRaw<{ day: Date; total: bigint }[]>(
        Prisma.sql`
          SELECT DATE(created_at) AS day, COUNT(*) AS total
          FROM messages
          WHERE created_at >= ${since}
          GROUP BY DATE(created_at)
          ORDER BY day ASC;
        `
      ),
      prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`
          SELECT COUNT(*) AS total
          FROM messages
          WHERE sender_type = 'contact'
            AND created_at >= ${since}
            AND (HOUR(created_at) >= 22 OR HOUR(created_at) < 6);
        `
      ),
      prisma.$queryRaw<{ avgSeconds: number | bigint | null }[]>(
        Prisma.sql`
          SELECT AVG(response_seconds) AS avgSeconds
          FROM (
            SELECT TIMESTAMPDIFF(
              SECOND,
              contact_msg.created_at,
              (
                SELECT MIN(operator_msg.created_at)
                FROM messages operator_msg
                WHERE operator_msg.conversation_id = contact_msg.conversation_id
                  AND operator_msg.sender_type = 'operator'
                  AND operator_msg.created_at > contact_msg.created_at
              )
            ) AS response_seconds
            FROM messages contact_msg
            WHERE contact_msg.sender_type = 'contact'
              AND contact_msg.created_at >= ${since}
          ) AS response_data
          WHERE response_seconds IS NOT NULL;
        `
      ),
      prisma.$queryRaw<{ avgMinutes: number | bigint | null }[]>(
        Prisma.sql`
          SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, closed_at)) AS avgMinutes
          FROM orders
          WHERE closed_at IS NOT NULL
            AND created_at >= ${since};
        `
      ),
    ]);

    const summary = {
      range: {
        days,
        since: since.toISOString(),
        until: now.toISOString(),
      },
      contacts: {
        total: totalContacts,
        newInRange: newContacts,
        newNumbers: toNumber(newNumbersRaw[0]?.total),
      },
      messaging: {
        hotHours: hotMessageHoursRaw
          .map((row) => ({
            hour: Number(row.hour),
            total: toNumber(row.total),
          }))
          .sort((a, b) => b.total - a.total),
        nightlyMessages: toNumber(nightlyMessagesRaw[0]?.total),
        messagesPerDay: messagesPerDayRaw.map((row) => ({
          day: row.day ? new Date(row.day).toISOString().slice(0, 10) : '',
          total: toNumber(row.total),
        })),
        avgResponseSeconds:
          avgResponseRaw.length && avgResponseRaw[0]?.avgSeconds !== null
            ? toNumber(avgResponseRaw[0].avgSeconds ?? null)
            : null,
      },
      orders: {
        hotHours: hotOrderHoursRaw
          .map((row) => ({
            hour: Number(row.hour),
            total: toNumber(row.total),
          }))
          .sort((a, b) => b.total - a.total),
        avgClosureMinutes:
          avgOrderClosureRaw.length &&
          avgOrderClosureRaw[0]?.avgMinutes !== null
            ? toNumber(avgOrderClosureRaw[0].avgMinutes ?? null)
            : null,
      },
    };

    return res.json(summary);
  } catch (error) {
    console.error('Error generating analytics summary:', error);
    return res.status(500).json({ error: 'Failed to build analytics summary' });
  }
}
