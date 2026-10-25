import {describe, expect, it} from 'vitest';
import {
  biMonthlyWeeks,
  formatYMD,
  getBiMonthlyLabel,
  getRecordBiMonth,
  parseYMD,
  periodStart,
  todayYMD,
} from './period';

/**
 * The algorithm as it shipped, kept so we can prove the new one produces the
 * same blocks whenever the old one was not losing data.
 */
function legacyWeeks(
  period: {year: number; blockIndex: number},
  recordDates: readonly string[],
) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const sorted = [...recordDates].sort();
  const base =
    sorted.length > 0
      ? sorted[0]
      : `${period.year}-${String(period.blockIndex * 2 + 1).padStart(2, '0')}-01`;

  const [by, bm, bd] = base.split('-').map(Number);
  const baseDate = new Date(by, bm - 1, bd);
  const out = [];

  for (let i = 0; i < 4; i++) {
    const start = new Date(by, bm - 1, bd + i * 7);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const startMonth = months[start.getMonth()];
    const endMonth = months[end.getMonth()];
    const title =
      startMonth === endMonth
        ? `${start.getDate()}-${end.getDate()} ${startMonth} ${start.getFullYear()}`
        : `${start.getDate()} ${startMonth}-${end.getDate()} ${endMonth} ${start.getFullYear()}`;
    out.push({id: i + 1, title, start: formatYMD(start), end: formatYMD(end), isWeek1: i === 0});
  }
  void baseDate;
  return out;
}

describe('parseYMD / formatYMD', () => {
  it('round-trips a date without drifting through UTC', () => {
    expect(formatYMD(parseYMD('2026-09-07') as Date)).toBe('2026-09-07');
    expect(formatYMD(parseYMD('2026-01-01') as Date)).toBe('2026-01-01');
    expect(formatYMD(parseYMD('2026-12-31') as Date)).toBe('2026-12-31');
  });

  it('parses in local time, so the day never shifts', () => {
    const d = parseYMD('2026-03-01') as Date;
    expect(d.getDate()).toBe(1);
    expect(d.getMonth()).toBe(2);
  });

  it('rejects anything that is not y-m-d', () => {
    expect(parseYMD('2026-09')).toBeNull();
    expect(parseYMD('')).toBeNull();
    expect(parseYMD('besok')).toBeNull();
  });
});

describe('todayYMD', () => {
  it('uses the local day, not the UTC day', () => {
    // 23:30 on 31 Dec local is still 31 Dec; toISOString() would say 1 Jan
    // for anyone east of UTC, which is what the app used to do.
    const lateNye = new Date(2026, 11, 31, 23, 30);
    expect(todayYMD(lateNye)).toBe('2026-12-31');
  });

  it('handles the early morning, where the old UTC version said "yesterday"', () => {
    const earlyMorning = new Date(2026, 9, 25, 1, 15);
    expect(todayYMD(earlyMorning)).toBe('2026-10-25');
  });
});

describe('getRecordBiMonth', () => {
  it.each([
    ['2026-01-15', 0],
    ['2026-02-28', 0],
    ['2026-03-01', 1],
    ['2026-05-24', 2],
    ['2026-09-07', 4],
    ['2026-10-19', 4],
    ['2026-11-01', 5],
  ])('puts %s in block %i', (date, blockIndex) => {
    expect(getRecordBiMonth(date).blockIndex).toBe(blockIndex);
  });

  it('builds a year-block key', () => {
    expect(getRecordBiMonth('2026-10-19').key).toBe('2026-4');
  });

  it('does not shift a first-of-month date into the previous block', () => {
    // The UTC parse made this the 28th of the previous month west of UTC.
    expect(getRecordBiMonth('2026-03-01').key).toBe('2026-1');
    expect(getRecordBiMonth('2026-09-01').key).toBe('2026-4');
  });
});

describe('getBiMonthlyLabel / periodStart', () => {
  it('labels the six blocks', () => {
    expect(getBiMonthlyLabel(0, 2026)).toBe('Januari - Februari 2026');
    expect(getBiMonthlyLabel(4, 2026)).toBe('September - Oktober 2026');
    expect(getBiMonthlyLabel(5, 2025)).toBe('November - Desember 2025');
  });

  it('starts a period on the first of its first month', () => {
    expect(periodStart({year: 2026, blockIndex: 4})).toBe('2026-09-01');
    expect(periodStart({year: 2026, blockIndex: 0})).toBe('2026-01-01');
  });
});

describe('biMonthlyWeeks', () => {
  const sepOkt = {year: 2026, blockIndex: 4};

  it('anchors on the first session and runs in 7-day blocks', () => {
    const weeks = biMonthlyWeeks(sepOkt, ['2026-09-07']);
    expect(weeks[0].start).toBe('2026-09-07');
    expect(weeks[0].end).toBe('2026-09-13');
    expect(weeks[1].start).toBe('2026-09-14');
    expect(weeks[0].isWeek1).toBe(true);
    expect(weeks[1].isWeek1).toBe(false);
  });

  it('titles a block inside one month as "7-13 September 2026"', () => {
    expect(biMonthlyWeeks(sepOkt, ['2026-09-07'])[0].title).toBe('7-13 September 2026');
  });

  it('titles a block spanning two months as "28 September-4 Oktober 2026"', () => {
    const weeks = biMonthlyWeeks(sepOkt, ['2026-09-07']);
    expect(weeks[3].title).toBe('28 September-4 Oktober 2026');
  });

  it('falls back to the start of the period when there are no sessions', () => {
    const weeks = biMonthlyWeeks(sepOkt, []);
    expect(weeks[0].start).toBe('2026-09-01');
    expect(weeks).toHaveLength(4);
  });

  // The bug: a two-month period is 59-62 days, but only 4 blocks (28 days)
  // were ever produced.
  it('covers every session, including ones more than four weeks after the first', () => {
    const dates = [
      '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28',
      '2026-10-05', '2026-10-12', '2026-10-19',
    ];
    const weeks = biMonthlyWeeks(sepOkt, dates);

    for (const date of dates) {
      const covering = weeks.filter((w) => date >= w.start && date <= w.end);
      expect(covering, `${date} is in no week block`).toHaveLength(1);
    }
  });

  it('would have dropped three sessions before the fix', () => {
    const dates = [
      '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28',
      '2026-10-05', '2026-10-12', '2026-10-19',
    ];
    const old = legacyWeeks(sepOkt, dates);
    const dropped = dates.filter(
      (d) => !old.some((w) => d >= w.start && d <= w.end),
    );
    expect(dropped).toEqual(['2026-10-05', '2026-10-12', '2026-10-19']);
  });

  it('produces exactly the old blocks when the old ones already covered the data', () => {
    // Everything within 28 days of the first session: output must not change.
    const cases: string[][] = [
      ['2026-09-07'],
      ['2026-09-07', '2026-09-14'],
      ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'],
      ['2026-10-01', '2026-10-08'],
      [],
    ];
    for (const dates of cases) {
      expect(biMonthlyWeeks(sepOkt, dates)).toEqual(legacyWeeks(sepOkt, dates));
    }
  });

  it('never returns fewer than four blocks', () => {
    expect(biMonthlyWeeks(sepOkt, ['2026-09-07'])).toHaveLength(4);
    expect(biMonthlyWeeks(sepOkt, [])).toHaveLength(4);
  });

  it('adds only as many blocks as the data needs', () => {
    // First session 7 Sep, last 19 Oct = 42 days = 7 blocks.
    const weeks = biMonthlyWeeks(sepOkt, ['2026-09-07', '2026-10-19']);
    expect(weeks).toHaveLength(7);
    expect(weeks[6].end).toBe('2026-10-25');
  });

  it('counts a year boundary correctly', () => {
    const novDes = {year: 2026, blockIndex: 5};
    const weeks = biMonthlyWeeks(novDes, ['2026-12-28']);
    expect(weeks[0].title).toBe('28 Desember-3 Januari 2026');
    expect(weeks[0].end).toBe('2027-01-03');
  });

  it('ignores empty date strings', () => {
    expect(biMonthlyWeeks(sepOkt, ['', '2026-09-07'])[0].start).toBe('2026-09-07');
  });
});
