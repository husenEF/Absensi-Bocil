/**
 * Two-month reporting periods and their weekly blocks.
 *
 * Extracted from AppContext so the maths can be tested. Two bugs are fixed
 * here, and nothing else about the output changes:
 *
 * 1. Dates were parsed with `new Date("YYYY-MM-DD")`, which is UTC midnight,
 *    then read back with local getters. In Asia/Jakarta that happens to work;
 *    anywhere west of UTC it shifted every date back a day. Parsing is now
 *    component-wise and local, like formatIndonesianDate already did.
 *
 * 2. The report always emitted exactly 4 weekly blocks starting at the first
 *    session of the period. A two-month period is 59-62 days, so any session
 *    more than 27 days after the first one was silently dropped — it appeared
 *    in the UI, counted as selected, and then never reached the report.
 *
 *    The blocks are still anchored on the first session and there are still at
 *    least 4 of them, so for data that already fitted the output is unchanged.
 *    Extra blocks are only added when they are needed to carry a session that
 *    would otherwise have been lost.
 */

export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

const BI_MONTHLY_LABELS = [
  'Januari - Februari',
  'Maret - April',
  'Mei - Juni',
  'Juli - Agustus',
  'September - Oktober',
  'November - Desember',
] as const;

/** The minimum number of weekly blocks, kept so existing reports are unchanged. */
export const MIN_WEEK_BLOCKS = 4;

export type BiMonthlyPeriod = {
  year: number;
  blockIndex: number;
  label: string;
  key: string;
};

export type WeekBlock = {
  id: number;
  title: string;
  /** Inclusive "YYYY-MM-DD". */
  start: string;
  /** Inclusive "YYYY-MM-DD". */
  end: string;
  isWeek1: boolean;
};

/** Parse "YYYY-MM-DD" as a local date. Returns null if it is not that shape. */
export function parseYMD(dateStr: string): Date | null {
  const parts = dateStr?.split('-');
  if (!parts || parts.length !== 3) return null;
  const [y, m, d] = parts.map((p) => parseInt(p, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a local Date back to "YYYY-MM-DD" without going through UTC. */
export function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today in local time. The app used `toISOString()`, which is UTC. */
export function todayYMD(now: Date = new Date()): string {
  return formatYMD(now);
}

export function getBiMonthlyLabel(blockIndex: number, year: number): string {
  return `${BI_MONTHLY_LABELS[blockIndex]} ${year}`;
}

/** Which two-month block a date falls in. */
export function getRecordBiMonth(dateStr: string): {
  year: number;
  blockIndex: number;
  key: string;
} {
  const date = parseYMD(dateStr) ?? new Date(NaN);
  const year = date.getFullYear();
  const blockIndex = Math.floor(date.getMonth() / 2);
  return {year, blockIndex, key: `${year}-${blockIndex}`};
}

/** The first day of a period, "YYYY-MM-DD". */
export function periodStart(period: Pick<BiMonthlyPeriod, 'year' | 'blockIndex'>): string {
  const month = period.blockIndex * 2 + 1;
  return `${period.year}-${String(month).padStart(2, '0')}-01`;
}

function weekTitle(start: Date, end: Date): string {
  const startMonth = INDONESIAN_MONTHS[start.getMonth()];
  const endMonth = INDONESIAN_MONTHS[end.getMonth()];
  const startYear = start.getFullYear();

  return startMonth === endMonth
    ? `${start.getDate()}-${end.getDate()} ${startMonth} ${startYear}`
    : `${start.getDate()} ${startMonth}-${end.getDate()} ${endMonth} ${startYear}`;
}

/**
 * The weekly blocks a report is built from.
 *
 * @param period     the selected two-month period
 * @param recordDates every session date in that period, any order
 */
export function biMonthlyWeeks(
  period: Pick<BiMonthlyPeriod, 'year' | 'blockIndex'>,
  recordDates: readonly string[],
): WeekBlock[] {
  const sorted = [...recordDates].filter(Boolean).sort();
  const anchorStr = sorted.length > 0 ? sorted[0] : periodStart(period);
  const anchor = parseYMD(anchorStr);
  if (!anchor) return [];

  // Enough blocks to reach the last session, never fewer than before.
  let blocks = MIN_WEEK_BLOCKS;
  if (sorted.length > 0) {
    const last = parseYMD(sorted[sorted.length - 1]);
    if (last) {
      const days = Math.floor((last.getTime() - anchor.getTime()) / 86_400_000);
      blocks = Math.max(MIN_WEEK_BLOCKS, Math.floor(days / 7) + 1);
    }
  }

  const weeks: WeekBlock[] = [];
  for (let i = 0; i < blocks; i++) {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + i * 7);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);

    weeks.push({
      id: i + 1,
      title: weekTitle(start, end),
      start: formatYMD(start),
      end: formatYMD(end),
      isWeek1: i === 0,
    });
  }

  return weeks;
}
