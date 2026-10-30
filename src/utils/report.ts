import {markedEntries, participantLine, reasonFor, tally, type StatusMap} from '../roster';
import {STATUS_CODE, STATUS_ORDER, STATUS_REPORT_LABEL, type StatusKey} from '../styles/palette';
import {formatDateShort} from './date';

type ReportRecord = {
  tanggal: string;
  peserta: string[];
  statuses?: StatusMap;
  keterangan?: Record<string, string>;
  guruStatus?: StatusKey;
  guruKeterangan?: string;
  scheduleId?: number;
};

type ReportWeek = {title: string; start: string; end: string};

type ReportClass = {id?: number; title: string; guru?: string};

type ReportInput = {
  periodLabel: string;
  weeks: readonly ReportWeek[];
  records: readonly ReportRecord[];
  classes: readonly ReportClass[];
};

/** Heading for sessions filed under no class, or under one since deleted. */
export const NO_CLASS_TITLE = 'Tanpa kelas';

/** The two shapes the WhatsApp report can be written in. */
export type WaReportFormat = 'klasik' | 'rapi';

type Section = {title: string; guru?: string; isClass: boolean; records: ReportRecord[]};

/**
 * Sessions grouped by class, in the order the classes are listed, with the
 * classless sessions — and those whose class was deleted — last. Empty
 * sections are dropped.
 */
function sectionsOf(records: readonly ReportRecord[], classes: readonly ReportClass[]): Section[] {
  const known = new Set(classes.map((c) => c.id));
  const classOf = (r: ReportRecord) =>
    r.scheduleId !== undefined && known.has(r.scheduleId) ? r.scheduleId : undefined;

  return [
    ...classes.map((c) => ({
      title: c.title,
      guru: c.guru?.trim() || undefined,
      isClass: true,
      records: records.filter((r) => classOf(r) === c.id),
    })),
    {title: NO_CLASS_TITLE, isClass: false, records: records.filter((r) => classOf(r) === undefined)},
  ].filter((s) => s.records.length > 0);
}

const sessionsIn = (records: readonly ReportRecord[], week: ReportWeek) =>
  records
    .filter((r) => r.tanggal >= week.start && r.tanggal <= week.end)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

/** The weekly blocks for one set of sessions, exactly as the report has always read. */
function weekLines(weeks: readonly ReportWeek[], records: readonly ReportRecord[]): string[] {
  const lines: string[] = [];
  for (const week of weeks) {
    const inWeek = sessionsIn(records, week);

    lines.push(week.title);
    if (inWeek.length === 0) {
      lines.push(`* Tgl Kursus : -`);
      lines.push(`* Peserta : -`);
    } else {
      inWeek.forEach((rec, idx) => {
        // A comma after the date when another session follows in the same week.
        const trailingComma = idx < inWeek.length - 1 ? ',' : '';
        lines.push(`* Tgl Kursus : ${formatDateShort(rec.tanggal)}${trailingComma}`);
        lines.push(`* Peserta : ${participantLine(rec)}`);
      });
    }
    lines.push('');
  }
  return lines;
}

/**
 * The WhatsApp report for a period.
 *
 * Sessions from one class — or from no class — read exactly as the report
 * always has. Once they span more than one, each class gets its own section
 * under its name, in the order the classes are listed, with the classless
 * sessions last; a session moved to another day stays in its class's section.
 * Each section keeps the coordinator's format unchanged inside it.
 */
export function buildWhatsAppReport({periodLabel, weeks, records, classes}: ReportInput): string {
  // Verbatim: this is the report the coordinator reads, and its wording is a
  // contract with them, not UI copy. Do not 'improve' it.
  const lines = [`Mohon untuk dikirimkan Laporan Kursus periode ${periodLabel}`, ''];

  const sections = sectionsOf(records, classes);

  if (sections.length <= 1) {
    lines.push(...weekLines(weeks, records));
  } else {
    for (const section of sections) {
      lines.push(`*${section.title}*`, '');
      lines.push(...weekLines(weeks, section.records));
    }
  }

  return lines.join('\n').trim() + '\n';
}

/** "Guru: Sakit", or "Guru: Lainnya (rapat)", or nothing when it was not recorded. */
function guruPart(rec: ReportRecord): string {
  if (!rec.guruStatus) return '';
  const reason = rec.guruStatus === 'etc' ? (rec.guruKeterangan ?? '').trim() : '';
  return ` - Guru: ${STATUS_REPORT_LABEL[rec.guruStatus]}${reason ? ` (${reason})` : ''}`;
}

/** One line per status the session used: "Sakit (1): Aan". */
function statusLines(rec: ReportRecord): string[] {
  const entries = markedEntries(rec);
  if (entries.length === 0) return ['-'];

  const lines: string[] = [];
  for (const status of STATUS_ORDER) {
    const names = entries
      .filter((e) => e.status === status)
      .map((e) => {
        const reason = status === 'etc' ? reasonFor(rec.keterangan, e.key) : '';
        return reason ? `${e.name} - ${reason}` : e.name;
      });
    if (names.length > 0) {
      lines.push(`${STATUS_REPORT_LABEL[status]} (${names.length}): ${names.join(', ')}`);
    }
  }
  return lines;
}

function compactWeekLines(weeks: readonly ReportWeek[], records: readonly ReportRecord[]): string[] {
  const lines: string[] = [];
  for (const week of weeks) {
    const inWeek = sessionsIn(records, week);

    lines.push(`*${week.title}*`);
    if (inWeek.length === 0) {
      lines.push('-', '');
      continue;
    }

    const total = tally({});
    for (const rec of inWeek) {
      lines.push(`Tgl ${formatDateShort(rec.tanggal)}${guruPart(rec)}`);
      lines.push(...statusLines(rec), '');
      for (const e of markedEntries(rec)) total[e.status] += 1;
    }
    const summary = STATUS_ORDER.map((k) => `${total[k]}${STATUS_CODE[k]}`).join(' / ');
    lines.push(`Total pekan ini: ${summary}`, '');
  }
  return lines;
}

/**
 * The same report laid out to be read rather than parsed: a heading, the
 * class and its teacher, then each session as one line per status with its
 * count, and a weekly total. Offered next to the coordinator's format, never
 * instead of it.
 */
export function buildWhatsAppReportCompact({periodLabel, weeks, records, classes}: ReportInput): string {
  const lines = ['*LAPORAN KURSUS*', `Periode: ${periodLabel}`];

  const sections = sectionsOf(records, classes);
  const several = sections.length > 1;

  if (sections.length === 0) {
    lines.push('');
    lines.push(...compactWeekLines(weeks, records));
  }

  for (const section of sections) {
    if (several) {
      lines.push('', `*Kelas: ${section.title}*`);
    } else if (section.isClass) {
      lines.push(`Kelas: ${section.title}`);
    }
    if (section.guru) lines.push(`Guru: ${section.guru}`);
    lines.push('');
    lines.push(...compactWeekLines(weeks, section.records));
  }

  return lines.join('\n').trim() + '\n';
}
