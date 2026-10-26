import {participantLine, type StatusMap} from '../roster';
import {formatDateShort} from './date';

type ReportRecord = {
  tanggal: string;
  peserta: string[];
  statuses?: StatusMap;
  scheduleId?: number;
};

type ReportWeek = {title: string; start: string; end: string};

type ReportClass = {id?: number; title: string};

/** Heading for sessions filed under no class, or under one since deleted. */
export const NO_CLASS_TITLE = 'Tanpa kelas';

/** The weekly blocks for one set of sessions, exactly as the report has always read. */
function weekLines(weeks: readonly ReportWeek[], records: readonly ReportRecord[]): string[] {
  const lines: string[] = [];
  for (const week of weeks) {
    const inWeek = records
      .filter((r) => r.tanggal >= week.start && r.tanggal <= week.end)
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

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
export function buildWhatsAppReport({
  periodLabel,
  weeks,
  records,
  classes,
}: {
  periodLabel: string;
  weeks: readonly ReportWeek[];
  records: readonly ReportRecord[];
  classes: readonly ReportClass[];
}): string {
  // Verbatim: this is the report the coordinator reads, and its wording is a
  // contract with them, not UI copy. Do not 'improve' it.
  const lines = [`Mohon untuk dikirimkan Laporan Kursus periode ${periodLabel}`, ''];

  const known = new Set(classes.map((c) => c.id));
  const classOf = (r: ReportRecord) =>
    r.scheduleId !== undefined && known.has(r.scheduleId) ? r.scheduleId : undefined;

  const sections = [
    ...classes.map((c) => ({title: c.title, records: records.filter((r) => classOf(r) === c.id)})),
    {title: NO_CLASS_TITLE, records: records.filter((r) => classOf(r) === undefined)},
  ].filter((s) => s.records.length > 0);

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
