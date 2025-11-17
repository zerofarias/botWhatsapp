export type ScheduleDayKey =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export interface ScheduleRangeConfig {
  from?: string | null;
  to?: string | null;
}

export type ScheduleWeekConfig = Partial<
  Record<ScheduleDayKey, ScheduleRangeConfig[] | null | undefined>
>;

export interface ScheduleEvaluationInput {
  week?: ScheduleWeekConfig | null;
  timezone?: string | null;
  referenceDate?: Date;
}

export type ScheduleEvaluationResult = 'open' | 'closed';

const DAY_KEY_BY_INDEX: Record<number, ScheduleDayKey> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

function parseTimeToMinutes(value?: string | null): number | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

function getDateInTimezone(
  timezone?: string | null,
  referenceDate?: Date
): Date {
  const now = referenceDate ?? new Date();
  if (!timezone) {
    return now;
  }
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now).reduce((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value;
      }
      return acc;
    }, {} as Record<string, string>);
    const isoString = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
    return new Date(isoString);
  } catch {
    return now;
  }
}

export function evaluateScheduleNode({
  week,
  timezone,
  referenceDate,
}: ScheduleEvaluationInput): ScheduleEvaluationResult {
  if (!week) {
    return 'closed';
  }

  const now = getDateInTimezone(timezone, referenceDate);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const dayKey = DAY_KEY_BY_INDEX[now.getDay()];
  const dayRanges = week[dayKey];
  if (!Array.isArray(dayRanges) || !dayRanges.length) {
    return 'closed';
  }

  for (const range of dayRanges) {
    const start = parseTimeToMinutes(range?.from);
    const end = parseTimeToMinutes(range?.to);
    if (start === null || end === null) continue;
    if (minutesNow >= start && minutesNow <= end) {
      return 'open';
    }
  }

  return 'closed';
}
