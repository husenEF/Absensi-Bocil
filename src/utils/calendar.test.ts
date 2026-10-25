import {describe, expect, it} from 'vitest';
import {buildICalendar, nextOccurrence} from './calendar';

const SCHEDULE = {
  id: 1,
  title: 'Iqra sore',
  hari: 'Senin',
  waktu: '16:00',
  remindMinutesBefore: 15,
};

describe('nextOccurrence', () => {
  it('finds the coming weekday at the right time', () => {
    // Sunday 25 Oct 2026 -> Monday 26 Oct
    const from = new Date(2026, 9, 25, 9, 0);
    const next = nextOccurrence('Senin', '16:00', from);
    expect(next?.getDate()).toBe(26);
    expect(next?.getHours()).toBe(16);
    expect(next?.getMinutes()).toBe(0);
  });

  it('uses today when the class has not started yet', () => {
    const mondayMorning = new Date(2026, 9, 26, 9, 0);
    expect(nextOccurrence('Senin', '16:00', mondayMorning)?.getDate()).toBe(26);
  });

  it('skips to next week once today\'s class has passed', () => {
    const mondayEvening = new Date(2026, 9, 26, 18, 0);
    expect(nextOccurrence('Senin', '16:00', mondayEvening)?.getDate()).toBe(2);
  });

  it('returns null for a day or time it cannot read', () => {
    expect(nextOccurrence('Someday', '16:00')).toBeNull();
    expect(nextOccurrence('Senin', '')).toBeNull();
  });
});

describe('buildICalendar', () => {
  const now = new Date(2026, 9, 25, 9, 0);

  it('produces a calendar a phone will accept', () => {
    const ics = buildICalendar([SCHEDULE], now);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('\r\n');
  });

  it('repeats every week on the right day', () => {
    expect(buildICalendar([SCHEDULE], now)).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');
  });

  it('sets the alarm to the chosen lead time', () => {
    expect(buildICalendar([SCHEDULE], now)).toContain('TRIGGER:-PT15M');
    expect(
      buildICalendar([{...SCHEDULE, remindMinutesBefore: 0}], now),
    ).toContain('TRIGGER:-PT0M');
  });

  it('starts at the stated wall-clock time', () => {
    expect(buildICalendar([SCHEDULE], now)).toContain('DTSTART:20261026T160000');
  });

  it('escapes characters that would corrupt the file', () => {
    const ics = buildICalendar([{...SCHEDULE, title: 'Iqra; sore, kelas A'}], now);
    expect(ics).toContain('SUMMARY:Iqra\\; sore\\, kelas A');
  });

  it('skips a schedule it cannot place rather than writing a broken event', () => {
    const ics = buildICalendar([{...SCHEDULE, hari: 'Entahlah'}], now);
    expect(ics).not.toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('writes one event per schedule', () => {
    const ics = buildICalendar(
      [SCHEDULE, {...SCHEDULE, id: 2, title: 'Tadarus', hari: 'Kamis'}],
      now,
    );
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('BYDAY=TH');
  });

  it('gives each event a distinct id', () => {
    const ics = buildICalendar(
      [SCHEDULE, {...SCHEDULE, id: 2, hari: 'Kamis'}],
      now,
    );
    const uids = ics.match(/^UID:.*$/gm) ?? [];
    expect(new Set(uids).size).toBe(uids.length);
  });
});
