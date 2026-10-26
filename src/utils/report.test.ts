import {describe, expect, it} from 'vitest';
import {buildWhatsAppReport} from './report';

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
