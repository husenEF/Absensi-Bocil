import {describe, expect, it} from 'vitest';
import {
  buildStatusMap,
  capitalizeWords,
  escapeHtml,
  nameKey,
  parseNameList,
  presentNames,
  rosterFromRecords,
  statusesFromPeserta,
  tally,
} from './roster';

describe('capitalizeWords', () => {
  it('title-cases each word', () => {
    expect(capitalizeWords('husen efendi')).toBe('Husen Efendi');
    expect(capitalizeWords('SITI')).toBe('Siti');
    expect(capitalizeWords('  budi  ')).toBe('Budi');
  });

  it('collapses runs of whitespace', () => {
    expect(capitalizeWords('siti   aminah')).toBe('Siti Aminah');
  });

  it('survives an empty string', () => {
    expect(capitalizeWords('')).toBe('');
  });
});

describe('nameKey', () => {
  it('matches the same santri however the teacher typed it', () => {
    expect(nameKey('Budi')).toBe(nameKey('budi'));
    expect(nameKey('Siti  Aminah')).toBe(nameKey('siti aminah'));
    expect(nameKey(' Umar ')).toBe('umar');
  });
});

describe('parseNameList', () => {
  it('splits on commas and title-cases', () => {
    expect(parseNameList('husen, budi ,ahmad')).toEqual(['Husen', 'Budi', 'Ahmad']);
  });

  it('drops blanks and trailing separators', () => {
    expect(parseNameList('Husen,,Budi, ,')).toEqual(['Husen', 'Budi']);
  });

  it('removes duplicates regardless of case', () => {
    expect(parseNameList('Budi, budi, BUDI')).toEqual(['Budi']);
  });

  it('returns nothing for an empty entry', () => {
    expect(parseNameList('')).toEqual([]);
    expect(parseNameList('   ')).toEqual([]);
  });
});

describe('buildStatusMap', () => {
  it('defaults every santri to Hadir', () => {
    expect(buildStatusMap(['Budi', 'Siti'])).toEqual({budi: 'hadir', siti: 'hadir'});
  });

  it('keeps statuses the teacher already set', () => {
    const existing = {budi: 'sakit' as const};
    expect(buildStatusMap(['Budi', 'Siti'], existing)).toEqual({
      budi: 'sakit',
      siti: 'hadir',
    });
  });

  it('keeps a recorded status for someone not on the current roster', () => {
    // Dropping these erased absences on the next save: a santri who was only
    // ever absent is in no record's `peserta`, so they were not on the roster.
    const existing = {budi: 'izin' as const, lama: 'alpa' as const};
    expect(buildStatusMap(['Budi'], existing)).toEqual({budi: 'izin', lama: 'alpa'});
  });
});

describe('presentNames', () => {
  it('returns only those marked Hadir, in roster order', () => {
    const statuses = {budi: 'hadir' as const, siti: 'sakit' as const, umar: 'hadir' as const};
    expect(presentNames(['Budi', 'Siti', 'Umar'], statuses)).toEqual(['Budi', 'Umar']);
  });

  it('treats a santri with no status as present, matching the default', () => {
    expect(presentNames(['Budi'], {})).toEqual(['Budi']);
  });

  it('excludes every kind of absence', () => {
    const statuses = {a: 'sakit' as const, b: 'izin' as const, c: 'alpa' as const};
    expect(presentNames(['A', 'B', 'C'], statuses)).toEqual([]);
  });
});

describe('tally', () => {
  it('counts each status', () => {
    expect(
      tally({a: 'hadir', b: 'hadir', c: 'sakit', d: 'alpa'}),
    ).toEqual({hadir: 2, sakit: 1, izin: 0, alpa: 1});
  });

  it('returns zeroes for an empty session', () => {
    expect(tally({})).toEqual({hadir: 0, sakit: 0, izin: 0, alpa: 0});
  });
});

describe('statusesFromPeserta', () => {
  it('marks everyone who was recorded as present', () => {
    expect(statusesFromPeserta(['Budi', 'Siti'])).toEqual({budi: 'hadir', siti: 'hadir'});
  });

  it('does not invent absences for santri the old record never mentioned', () => {
    // The pre-roster format only recorded attendance, so anyone missing from it
    // is unknown, not absent. Claiming otherwise would fabricate data.
    const statuses = statusesFromPeserta(['Budi']);
    expect(Object.keys(statuses)).toEqual(['budi']);
  });

  it('ignores blank entries', () => {
    expect(statusesFromPeserta(['Budi', '', '  '])).toEqual({budi: 'hadir'});
  });
});

describe('rosterFromRecords', () => {
  it('collects every distinct santri, sorted for Indonesian', () => {
    const records = [
      {peserta: ['Husen', 'Budi']},
      {peserta: ['Ahmad', 'budi']},
    ];
    expect(rosterFromRecords(records).map((s) => s.name)).toEqual([
      'Ahmad',
      'Budi',
      'Husen',
    ]);
  });

  it('keeps the first spelling it saw and matches case-insensitively', () => {
    const roster = rosterFromRecords([{peserta: ['Budi']}, {peserta: ['BUDI']}]);
    expect(roster).toHaveLength(1);
    expect(roster[0]).toEqual({name: 'Budi', nameKey: 'budi'});
  });

  it('copes with records that have no participants', () => {
    expect(rosterFromRecords([{peserta: []}])).toEqual([]);
  });

  it('includes a santri who was only ever absent', () => {
    const roster = rosterFromRecords([
      {peserta: ['Umar'], statuses: {umar: 'hadir', budi: 'alpa', siti: 'sakit'}},
    ]);
    expect(roster.map((s) => s.name).sort()).toEqual(['Budi', 'Siti', 'Umar']);
  });
});

describe('escapeHtml', () => {
  it('escapes the characters that corrupt the Excel export', () => {
    expect(escapeHtml('Budi & Ani')).toBe('Budi &amp; Ani');
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('He said "hi"')).toBe('He said &quot;hi&quot;');
  });

  it('handles null and undefined without printing them', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('leaves ordinary Indonesian names alone', () => {
    expect(escapeHtml("Siti Nur'aini")).toBe('Siti Nur&#39;aini');
    expect(escapeHtml('Ahmad')).toBe('Ahmad');
  });
});
