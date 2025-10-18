import dayjs, { Dayjs } from 'dayjs';

export type WorkingHourLike = {
  startTime: string;
  endTime: string;
  days: string;
  message?: string | null;
};

function parseTimeToMinutes(value: string) {
  const match = value.match(/^([0-1]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

function parseDaysList(days: string) {
  return days
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
}

export function checkIfWithinWorkingHours(
  now: Dayjs,
  config: WorkingHourLike | WorkingHourLike[]
) {
  const ranges = Array.isArray(config) ? config : [config];
  if (!ranges.length) {
    return true;
  }

  const currentDay = now.day();
  const currentMinutes = now.hour() * 60 + now.minute();

  return ranges.some((range) => {
    const allowedDays = parseDaysList(range.days);
    if (!allowedDays.includes(currentDay)) {
      return false;
    }

    const startMinutes = parseTimeToMinutes(range.startTime);
    const endMinutes = parseTimeToMinutes(range.endTime);
    if (
      startMinutes === null ||
      endMinutes === null ||
      endMinutes <= startMinutes
    ) {
      return false;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  });
}

export function formatAfterHoursMessage(
  range: WorkingHourLike,
  fallback: string
) {
  return range.message?.trim()?.length ? range.message : fallback;
}

export function currentDayLabel(now: Dayjs = dayjs()) {
  return now.format('dddd');
}
