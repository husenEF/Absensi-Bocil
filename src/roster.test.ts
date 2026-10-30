import {describe, expect, it} from 'vitest';
import {
  buildStatusMap,
  classFromHistory,
  splitByClass,
  participantLine,
  unmarkedNames,
  capitalizeWords,
  escapeHtml,
  nameKey,
  parseNameList,
  presentNames,
  pruneKeterangan,
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
  it('marks nobody on its own', () => {
    // Starting everyone at Hadir files a class the teacher never looked at.
    expect(buildStatusMap(['Budi', 'Siti'])).toEqual({});
  });

  it('keeps statuses the teacher already set, and only those', () => {
    const existing = {budi: 'sakit' as const};
    expect(buildStatusMap(['Budi', 'Siti'], existing)).toEqual({budi: 'sakit'});
  });

  it('keeps a recorded status for someone not on the current roster', () => {
    // Dropping these erased absences on the next save: a santri who was only
    // ever absent is in no record's `peserta`, so they were not on the roster.
    const existing = {budi: 'izin' as const, lama: 'alpa' as const};
    expect(buildStatusMap(['Budi'], existing)).toEqual({budi: 'izin', lama: 'alpa'});
  });
});

describe('unmarkedNames', () => {
  it('lists the santri still waiting for a mark, in roster order', () => {
    const statuses = {siti: 'izin' as const};
    expect(unmarkedNames(['Budi', 'Siti', 'Umar'], statuses)).toEqual(['Budi', 'Umar']);
  });

  it('lists everyone when the session has not been touched', () => {
    expect(unmarkedNames(['Budi', 'Siti'], {})).toEqual(['Budi', 'Siti']);
  });

  it('lists nobody once every santri carries a mark', () => {
    const statuses = {budi: 'hadir' as const, siti: 'alpa' as const};
    expect(unmarkedNames(['Budi', 'Siti'], statuses)).toEqual([]);
  });
});

describe('presentNames', () => {
  it('returns only those marked Hadir, in roster order', () => {
    const statuses = {budi: 'hadir' as const, siti: 'sakit' as const, umar: 'hadir' as const};
    expect(presentNames(['Budi', 'Siti', 'Umar'], statuses)).toEqual(['Budi', 'Umar']);
  });

  it('leaves an unmarked santri out rather than guessing they were present', () => {
    expect(presentNames(['Budi'], {})).toEqual([]);
  });

  it('excludes every kind of absence', () => {
    const statuses = {a: 'sakit' as const, b: 'izin' as const, c: 'alpa' as const};
    expect(presentNames(['A', 'B', 'C'], statuses)).toEqual([]);
  });
});

describe('tally', () => {
  it('counts each status', () => {
    expect(
      tally({a: 'hadir', b: 'hadir', c: 'sakit', d: 'alpa', e: 'etc'}),
    ).toEqual({hadir: 2, sakit: 1, izin: 0, alpa: 1, etc: 1});
  });

  it('returns zeroes for an empty session', () => {
    expect(tally({})).toEqual({hadir: 0, sakit: 0, izin: 0, alpa: 0, etc: 0});
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


describe('participantLine', () => {
  it('names every marked santri with their status letter', () => {
    const line = participantLine({
      peserta: ['Ubin'],
      statuses: {ubin: 'hadir', aan: 'izin'},
    });
    expect(line).toBe('Ubin (H), Aan (I)');
  });

  it('puts those who came first, then the absences, by mark', () => {
    const line = participantLine({
      peserta: ['Ubin'],
      statuses: {
        ubin: 'hadir',
        aan: 'izin',
        'budi santoso': 'sakit',
        'dewi lestari': 'alpa',
      },
    });
    expect(line).toBe('Ubin (H), Budi Santoso (S), Aan (I), Dewi Lestari (A)');
  });

  it('sorts by name inside a single mark', () => {
    const line = participantLine({
      peserta: ['Umar', 'Budi', 'Ahmad'],
      statuses: {umar: 'hadir', budi: 'hadir', ahmad: 'hadir'},
    });
    expect(line).toBe('Ahmad (H), Budi (H), Umar (H)');
  });

  it('keeps the spelling the teacher typed rather than the matching key', () => {
    const line = participantLine({
      peserta: ['Siti Aminah'],
      statuses: {'siti aminah': 'hadir'},
    });
    expect(line).toBe('Siti Aminah (H)');
  });

  it('reads an old record that only ever listed who was present', () => {
    expect(participantLine({peserta: ['Budi', 'Siti']})).toBe('Budi (H), Siti (H)');
  });

  it('says so plainly when a session recorded nobody', () => {
    expect(participantLine({peserta: [], statuses: {}})).toBe('-');
  });

  it('puts Lainnya last and carries its reason', () => {
    const line = participantLine({
      peserta: ['Ubin'],
      statuses: {ubin: 'hadir', fajar: 'etc', aan: 'alpa'},
      keterangan: {fajar: '  terlambat jemputan '},
    });
    expect(line).toBe('Ubin (H), Aan (A), Fajar (E: terlambat jemputan)');
  });

  it('prints a bare E when no reason was written', () => {
    expect(participantLine({peserta: [], statuses: {fajar: 'etc'}})).toBe('Fajar (E)');
  });

  it('never prints a reason next to any other mark', () => {
    const line = participantLine({
      peserta: [],
      statuses: {aan: 'sakit'},
      keterangan: {aan: 'stale'},
    });
    expect(line).toBe('Aan (S)');
  });
});

describe('pruneKeterangan', () => {
  it('keeps only trimmed reasons whose santri is still Lainnya', () => {
    expect(
      pruneKeterangan(
        {fajar: ' rapat ', aan: 'old', budi: '   '},
        {fajar: 'etc', aan: 'hadir', budi: 'etc'},
      ),
    ).toEqual({fajar: 'rapat'});
  });

  it('returns undefined when nothing is left', () => {
    expect(pruneKeterangan({aan: 'x'}, {aan: 'sakit'})).toBeUndefined();
    expect(pruneKeterangan(undefined, {})).toBeUndefined();
  });
});

describe('classFromHistory', () => {
  it('places a santri seen only in one class', () => {
    const records = [
      {peserta: ['Budi'], scheduleId: 1},
      {peserta: [], statuses: {budi: 'sakit' as const}, scheduleId: 1},
    ];
    expect(classFromHistory(records, 'budi')).toBe(1);
  });

  it('leaves a santri seen in two classes for the teacher', () => {
    const records = [
      {peserta: ['Budi'], scheduleId: 1},
      {peserta: ['Budi'], scheduleId: 2},
    ];
    expect(classFromHistory(records, 'budi')).toBeUndefined();
  });

  it('ignores sessions filed under no class', () => {
    const records = [
      {peserta: ['Budi']},
      {peserta: ['Budi'], scheduleId: 3},
    ];
    expect(classFromHistory(records, 'budi')).toBe(3);
  });

  it('does not place a santri the class never marked', () => {
    const records = [{peserta: ['Siti'], scheduleId: 1}];
    expect(classFromHistory(records, 'budi')).toBeUndefined();
  });
});

describe('splitByClass', () => {
  const students = [
    {nameKey: 'aan', scheduleId: 1},
    {nameKey: 'budi', scheduleId: 2},
    {nameKey: 'siti'},
  ];

  it('puts members first and keeps everyone else', () => {
    expect(splitByClass(['Aan', 'Budi', 'Siti'], students, 1)).toEqual({
      members: ['Aan'],
      others: ['Budi', 'Siti'],
    });
  });

  it('treats every name as a member when no class is picked', () => {
    expect(splitByClass(['Aan', 'Budi', 'Siti'], students, undefined)).toEqual({
      members: ['Aan', 'Budi', 'Siti'],
      others: [],
    });
  });

  it('matches names however they are cased', () => {
    expect(splitByClass(['AAN'], students, 1).members).toEqual(['AAN']);
  });
});
