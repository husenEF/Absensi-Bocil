import {describe, expect, it} from 'vitest';
import {buildWhatsAppReport, buildWhatsAppReportCompact} from './report';

const weeks = [
  {title: '26 Oktober-1 November 2026', start: '2026-10-26', end: '2026-11-01'},
  {title: '2-8 November 2026', start: '2026-11-02', end: '2026-11-08'},
];
const classes = [
  {id: 1, title: 'Ngaji Pagi'},
  {id: 2, title: 'Tahfidz Sore'},
];
const pagi = {tanggal: '2026-10-26', peserta: ['Budi'], statuses: {budi: 'hadir' as const, aisyah: 'sakit' as const}, scheduleId: 1};
const pagiMoved = {tanggal: '2026-10-27', peserta: ['Budi'], scheduleId: 1};
const sore = {tanggal: '2026-10-28', peserta: ['Dewi'], scheduleId: 2};
const lepas = {tanggal: '2026-10-29', peserta: ['Nabila']};

const build = (records: Parameters<typeof buildWhatsAppReport>[0]['records']) =>
  buildWhatsAppReport({periodLabel: 'September - Oktober 2026', weeks, records, classes});

describe('buildWhatsAppReport', () => {
  it('reads as it always has when every session is from one class', () => {
    expect(build([pagi, pagiMoved])).toBe(
      [
        'Mohon untuk dikirimkan Laporan Kursus periode September - Oktober 2026',
        '',
        '26 Oktober-1 November 2026',
        '* Tgl Kursus : 26/10,',
        '* Peserta : Budi (H), Aisyah (S)',
        '* Tgl Kursus : 27/10',
        '* Peserta : Budi (H)',
        '',
        '2-8 November 2026',
        '* Tgl Kursus : -',
        '* Peserta : -',
        '',
      ].join('\n'),
    );
  });

  it('gives each class its own section once there is more than one', () => {
    const text = build([sore, pagi, lepas, pagiMoved]);
    const headings = text.split('\n').filter((l) => /^\*[^ ]/.test(l));

    // Classes in their listed order, classless sessions last.
    expect(headings).toEqual(['*Ngaji Pagi*', '*Tahfidz Sore*', '*Tanpa kelas*']);
    expect(text.match(/^Mohon untuk/gm)).toHaveLength(1);
  });

  it('keeps a session moved to another day inside its class section', () => {
    const text = build([pagi, pagiMoved, sore]);
    const pagiSection = text.slice(text.indexOf('*Ngaji Pagi*'), text.indexOf('*Tahfidz Sore*'));

    expect(pagiSection).toContain('* Tgl Kursus : 27/10');
    expect(pagiSection).not.toContain('Dewi');
  });

  it('treats a session from a deleted class as classless', () => {
    const text = build([pagi, {...sore, scheduleId: 9}]);
    expect(text).toContain('*Tanpa kelas*');
    expect(text).not.toContain('*Tahfidz Sore*');
  });
});

describe('buildWhatsAppReport with the newer fields', () => {
  it('is unchanged by a teacher mark or a teacher name', () => {
    const plain = build([pagi, pagiMoved]);
    const withGuru = buildWhatsAppReport({
      periodLabel: 'September - Oktober 2026',
      weeks,
      records: [{...pagi, guruStatus: 'sakit', guruKeterangan: 'x'}, pagiMoved],
      classes: [{id: 1, title: 'Ngaji Pagi', guru: 'Ust. Ahmad'}, classes[1]],
    });
    expect(withGuru).toBe(plain);
  });

  it('adds a Lainnya reason inside the bracket', () => {
    const text = build([
      {...pagi, statuses: {...pagi.statuses, fajar: 'etc' as const}, keterangan: {fajar: 'jemputan telat'}},
    ]);
    expect(text).toContain('* Peserta : Budi (H), Aisyah (S), Fajar (E: jemputan telat)');
  });
});

describe('buildWhatsAppReportCompact', () => {
  const guruClasses = [
    {id: 1, title: 'Ngaji Pagi', guru: 'Ust. Ahmad'},
    {id: 2, title: 'Tahfidz Sore'},
  ];
  const compact = (records: Parameters<typeof buildWhatsAppReportCompact>[0]['records']) =>
    buildWhatsAppReportCompact({
      periodLabel: 'September - Oktober 2026',
      weeks,
      records,
      classes: guruClasses,
    });

  it('lays one class out by status, with the teacher and a weekly total', () => {
    const first = {
      tanggal: '2026-10-26',
      peserta: ['Ubin', 'Budi'],
      statuses: {ubin: 'hadir', budi: 'hadir', aan: 'sakit', fajar: 'etc'} as const,
      keterangan: {fajar: 'terlambat jemputan'},
      guruStatus: 'hadir' as const,
      scheduleId: 1,
    };
    const second = {
      tanggal: '2026-10-28',
      peserta: ['Ubin'],
      statuses: {ubin: 'hadir', dewi: 'alpa'} as const,
      guruStatus: 'etc' as const,
      guruKeterangan: 'rapat',
      scheduleId: 1,
    };

    expect(compact([second, first])).toBe(
      [
        '*LAPORAN KURSUS*',
        'Periode: September - Oktober 2026',
        'Kelas: Ngaji Pagi',
        'Guru: Ust. Ahmad',
        '',
        '*26 Oktober-1 November 2026*',
        'Tgl 26/10 - Guru: Hadir',
        'Hadir (2): Budi, Ubin',
        'Sakit (1): Aan',
        'Lainnya (1): Fajar - terlambat jemputan',
        '',
        'Tgl 28/10 - Guru: Lainnya (rapat)',
        'Hadir (1): Ubin',
        'Tanpa keterangan (1): Dewi',
        '',
        'Total pekan ini: 3H / 1S / 0I / 1A / 1E',
        '',
        '*2-8 November 2026*',
        '-',
        '',
      ].join('\n'),
    );
  });

  it('leaves the teacher out when nobody recorded them', () => {
    const text = compact([sore]);
    expect(text).toContain('Kelas: Tahfidz Sore');
    expect(text).not.toContain('Guru');
    expect(text).toContain('Tgl 28/10\nHadir (1): Dewi');
  });

  it('gives each class a section, classless last', () => {
    const text = compact([sore, pagi, lepas]);
    const headings = text.split('\n').filter((l) => l.startsWith('*Kelas:'));
    expect(headings).toEqual(['*Kelas: Ngaji Pagi*', '*Kelas: Tahfidz Sore*', '*Kelas: Tanpa kelas*']);
    expect(text.match(/^\*LAPORAN KURSUS\*/gm)).toHaveLength(1);
  });

  it('omits the class line for classless sessions alone', () => {
    const text = compact([lepas]);
    expect(text).not.toContain('Kelas:');
    expect(text).toContain('Hadir (1): Nabila');
  });
});
