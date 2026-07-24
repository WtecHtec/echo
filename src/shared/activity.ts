import { StudyActivityDay } from './types';

const DAY_MS = 86_400_000;

const pad = (value: number) => String(value).padStart(2, '0');

export const toDateKey = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
};

export const fromDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const addDays = (dateKey: string, amount: number) => {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
};

const dateOrdinal = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
};

export const activityIntensity = (
  sentenceCount: number,
  wordCount: number,
  sessionCount: number,
  manualCheckIn: boolean,
): 0 | 1 | 2 | 3 | 4 => {
  const score =
    sentenceCount * 2 + wordCount + sessionCount * 3 + (manualCheckIn ? 1 : 0);
  if (score === 0) return 0;
  if (score <= 4) return 1;
  if (score <= 10) return 2;
  if (score <= 20) return 3;
  return 4;
};

export const calculateStreaks = (
  days: Pick<StudyActivityDay, 'date' | 'intensity'>[],
  now = new Date(),
) => {
  const activeDates = Array.from(
    new Set(days.filter((day) => day.intensity > 0).map((day) => day.date)),
  ).sort();
  const activeSet = new Set(activeDates);

  let cursor = toDateKey(now);
  if (!activeSet.has(cursor)) cursor = addDays(cursor, -1);
  let currentStreak = 0;
  while (activeSet.has(cursor)) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  let longestStreak = 0;
  let running = 0;
  let previousOrdinal: number | null = null;
  activeDates.forEach((dateKey) => {
    const ordinal = dateOrdinal(dateKey);
    running =
      previousOrdinal !== null && ordinal === previousOrdinal + 1
        ? running + 1
        : 1;
    longestStreak = Math.max(longestStreak, running);
    previousOrdinal = ordinal;
  });

  return { currentStreak, longestStreak };
};

export interface CalendarDay {
  date: string;
  dateValue: Date;
  inYear: boolean;
  weekIndex: number;
  dayIndex: number;
}

export const buildYearCalendar = (year: number): CalendarDay[] => {
  const firstDay = new Date(year, 0, 1);
  const lastDay = new Date(year, 11, 31);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());
  const end = new Date(lastDay);
  end.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const days: CalendarDay[] = [];
  const cursor = new Date(start);
  let index = 0;
  while (cursor <= end) {
    days.push({
      date: toDateKey(cursor),
      dateValue: new Date(cursor),
      inYear: cursor.getFullYear() === year,
      weekIndex: Math.floor(index / 7),
      dayIndex: index % 7,
    });
    cursor.setDate(cursor.getDate() + 1);
    index += 1;
  }
  return days;
};

export const getMonthWeekPositions = (year: number, days: CalendarDay[]) =>
  Array.from({ length: 12 }, (_, month) => {
    const date = toDateKey(new Date(year, month, 1));
    return {
      month,
      weekIndex: days.find((day) => day.date === date)?.weekIndex ?? 0,
    };
  });
