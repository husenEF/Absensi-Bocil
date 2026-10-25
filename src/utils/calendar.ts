/**
 * Weekly schedules as a calendar file.
 *
 * A serverless PWA cannot fire a reliable reminder when it is closed: the
 * Notification Triggers API was abandoned, background sync is throttled and
 * Chromium-only, and Web Push needs a push server this app deliberately does
 * not have. So rather than promise a reminder the app cannot keep, it hands
 * the schedule to the phone's own calendar, which can.
 */

const DAY_TO_ICAL: Record<string, string> = {
  Minggu: 'SU',
  Senin: 'MO',
  Selasa: 'TU',
  Rabu: 'WE',
  Kamis: 'TH',
  Jumat: 'FR',
  Sabtu: 'SA',
};

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export type SchedulePayload = {
  id?: number;
  title: string;
  hari: string;
  waktu: string;
  remindMinutesBefore: number;
};

/** Escape the characters iCalendar gives meaning to. */
function escapeICal(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local "YYYYMMDDTHHMMSS", so the event lands at the stated wall-clock time. */
function localStamp(d: Date): string {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}00`
  );
}

/** The next occurrence of a weekday at a given time, today included. */
export function nextOccurrence(hari: string, waktu: string, from: Date = new Date()): Date | null {
  const dayIndex = INDO_DAYS.indexOf(hari);
  const [hh, mm] = (waktu ?? '').split(':').map((v) => parseInt(v, 10));
  if (dayIndex === -1 || !Number.isFinite(hh) || !Number.isFinite(mm)) return null;

  const result = new Date(from.getFullYear(), from.getMonth(), from.getDate(), hh, mm, 0, 0);
  let delta = (dayIndex - from.getDay() + 7) % 7;
  if (delta === 0 && result.getTime() <= from.getTime()) delta = 7;
  result.setDate(result.getDate() + delta);
  return result;
}

/**
 * One repeating event per schedule, each with an alarm at the teacher's
 * chosen lead time.
 */
export function buildICalendar(
  schedules: readonly SchedulePayload[],
  now: Date = new Date(),
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ClassSync//Jadwal//ID',
    'CALSCALE:GREGORIAN',
  ];

  schedules.forEach((s, index) => {
    const start = nextOccurrence(s.hari, s.waktu, now);
    const byDay = DAY_TO_ICAL[s.hari];
    if (!start || !byDay) return;

    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const uid = `classsync-${s.id ?? index}-${start.getTime()}@classsync`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${localStamp(now)}`,
      `DTSTART:${localStamp(start)}`,
      `DTEND:${localStamp(end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`,
      `SUMMARY:${escapeICal(s.title)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICal(s.title)}`,
      `TRIGGER:-PT${Math.max(0, Math.round(s.remindMinutesBefore || 0))}M`,
      'END:VALARM',
      'END:VEVENT',
    );
  });

  lines.push('END:VCALENDAR');
  // iCalendar wants CRLF line endings.
  return lines.join('\r\n');
}
