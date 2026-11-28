const DATE = /^\d{4}-\d{2}-\d{2}$/;
const WEEK_LENGTH = 7;
const MONDAY = 1;
const WEEKEND = [0, 6];

export interface CalendarGridOptions {
  /** JavaScript weekday number, Sunday = 0 through Saturday = 6. Defaults to Monday. */
  weekStartsOn?: number;
  /** Pad the grid to at least this many complete weeks. */
  minWeeks?: number;
}

function toUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function formatUtcDate(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

function parseDate(value?: string | null): string | null {
  const date = value?.trim();
  if (!date || !DATE.test(date)) return null;

  const utc = toUtcDate(date);
  return Number.isFinite(utc.getTime()) && formatUtcDate(utc) === date ? date : null;
}

/** Uses the viewer's local day, including when an instant is supplied for reference. */
function today(now = new Date()): string {
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthOf(date: string): string {
  return date.slice(0, -3);
}

function addDays(date: string, count: number): string {
  const utc = toUtcDate(date);
  utc.setUTCDate(utc.getUTCDate() + count);
  return formatUtcDate(utc);
}

function shiftMonth(month: string, count: number): string {
  const utc = toUtcDate(`${month}-01`);
  utc.setUTCMonth(utc.getUTCMonth() + count);
  return monthOf(formatUtcDate(utc));
}

function isWeekend(date: string, weekendDays: readonly number[] = WEEKEND): boolean {
  return weekendDays.includes(toUtcDate(date).getUTCDay());
}

/** Checks inclusive bounds on normalized date-only values. */
function isWithinBounds(date: string, minimum?: string | null, maximum?: string | null): boolean {
  return (!minimum || date >= minimum) && (!maximum || date <= maximum);
}

function openingMonth(value?: string | null, minimum?: string | null, maximum?: string | null, reference = today()): string {
  if (value) return monthOf(value);
  if (minimum && reference < minimum) return monthOf(minimum);
  if (maximum && reference > maximum) return monthOf(maximum);
  return monthOf(reference);
}

function weekOffset(date: Date, weekStartsOn: number): number {
  return (date.getUTCDay() - weekStartsOn + WEEK_LENGTH) % WEEK_LENGTH;
}

function weekStart(date: string, weekStartsOn = MONDAY): string {
  const utc = toUtcDate(date);
  utc.setUTCDate(utc.getUTCDate() - weekOffset(utc, weekStartsOn));
  return formatUtcDate(utc);
}

/** Includes the entire first and last weeks intersecting the month. */
function monthGrid(month: string, { weekStartsOn = MONDAY, minWeeks = 0 }: CalendarGridOptions = {}): string[] {
  const first = toUtcDate(`${month}-01`);
  const offset = weekOffset(first, weekStartsOn);
  const lastDay = toUtcDate(`${shiftMonth(month, 1)}-01`);
  lastDay.setUTCDate(0);
  const weeks = Math.max(minWeeks, Math.ceil((offset + lastDay.getUTCDate()) / WEEK_LENGTH));
  first.setUTCDate(1 - offset);

  return Array.from({ length: weeks * WEEK_LENGTH }, () => {
    const date = formatUtcDate(first);
    first.setUTCDate(first.getUTCDate() + 1);
    return date;
  });
}

function groupItems<T>(items: readonly T[], getDate: (item: T) => string | null | undefined): ReadonlyMap<string, readonly T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const date = parseDate(getDate(item));
    if (!date) continue;
    const sameDay = grouped.get(date);
    if (sameDay) sameDay.push(item);
    else grouped.set(date, [item]);
  }
  return grouped;
}

/** Returns a focus destination within the rendered grid, or null at its edge. */
function focusDate(dates: readonly string[], date: string, key: string): string | null {
  const index = dates.indexOf(date);
  if (index < 0) return null;

  const dayOfWeek = index % WEEK_LENGTH;
  switch (key) {
    case 'ArrowLeft': return dates[index - 1] ?? null;
    case 'ArrowRight': return dates[index + 1] ?? null;
    case 'ArrowUp': return dates[index - WEEK_LENGTH] ?? null;
    case 'ArrowDown': return dates[index + WEEK_LENGTH] ?? null;
    case 'Home': return dates[index - dayOfWeek] ?? null;
    case 'End': return dates[index + WEEK_LENGTH - 1 - dayOfWeek] ?? null;
    default: return null;
  }
}

/** Date-only helpers. Arithmetic is independent of the viewer's timezone. */
export const calendar = {
  toUtcDate,
  parseDate,
  today,
  monthOf,
  addDays,
  shiftMonth,
  isWeekend,
  isWithinBounds,
  openingMonth,
  weekStart,
  monthGrid,
  groupItems,
  focusDate,
};
