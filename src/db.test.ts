import Dexie from 'dexie';
import {beforeEach, describe, expect, it} from 'vitest';
import type {AbsensiRecord, StudentRecord} from './db';

const DB_NAME = 'AttendanceDatabase';

/** Build a database at the old v3 shape and fill it with realistic records. */
async function seedV3(records: Array<Partial<AbsensiRecord>>) {
  const old = new Dexie(DB_NAME);
  old.version(3).stores({
    absensi: '++id, tanggal, createdAt',
    schedules: '++id, tanggal, waktu, notified',
    excelReports: '++id, periodKey',
  });
  await old.open();
  await old.table('absensi').bulkAdd(
    records.map((r, i) => ({
      tanggal: r.tanggal ?? '2026-09-07',
      peserta: r.peserta ?? [],
      createdAt: r.createdAt ?? 1_700_000_000_000 + i,
      ...(r.scheduleId !== undefined ? {scheduleId: r.scheduleId} : {}),
    })),
  );
  old.close();
}

/** Open through the app's own class, running the v3 -> v4 upgrade. */
async function openUpgraded() {
  const {db} = await import('./db');
  if (db.isOpen()) db.close();
  await db.open();
  return db;
}

describe('v3 -> v4 upgrade', () => {
  beforeEach(async () => {
    await Dexie.delete(DB_NAME);
    // Each test re-imports db.ts so the singleton reopens against a fresh store.
    const mod = await import('./db');
    if (mod.db.isOpen()) mod.db.close();
  });

  it('keeps every existing record and its participants', async () => {
    await seedV3([
      {tanggal: '2026-09-07', peserta: ['Husen', 'Budi']},
      {tanggal: '2026-09-14', peserta: ['Siti']},
    ]);

    const db = await openUpgraded();
    const records = await db.absensi.orderBy('tanggal').toArray();

    expect(records).toHaveLength(2);
    expect(records[0].tanggal).toBe('2026-09-07');
    expect(records[0].peserta).toEqual(['Husen', 'Budi']);
    expect(records[1].peserta).toEqual(['Siti']);
  });

  it('seeds the roster from every name ever recorded', async () => {
    await seedV3([
      {tanggal: '2026-09-07', peserta: ['Husen', 'Budi']},
      {tanggal: '2026-09-14', peserta: ['Ahmad', 'budi']},
    ]);

    const db = await openUpgraded();
    const students = await db.students.toArray();

    expect(students.map((s: StudentRecord) => s.name).sort()).toEqual([
      'Ahmad',
      'Budi',
      'Husen',
    ]);
    expect(students.every((s: StudentRecord) => s.active)).toBe(true);
  });

  it('does not create two santri for the same name typed differently', async () => {
    await seedV3([
      {tanggal: '2026-09-07', peserta: ['Budi']},
      {tanggal: '2026-09-14', peserta: ['BUDI']},
      {tanggal: '2026-09-21', peserta: ['budi']},
    ]);

    const db = await openUpgraded();
    expect(await db.students.count()).toBe(1);
  });

  it('marks everyone a record listed as present', async () => {
    await seedV3([{tanggal: '2026-09-07', peserta: ['Husen', 'Budi']}]);

    const db = await openUpgraded();
    const record = await db.absensi.toCollection().first();

    expect(record?.statuses).toEqual({husen: 'hadir', budi: 'hadir'});
  });

  it('does not invent absences for santri an old record never mentioned', async () => {
    await seedV3([
      {tanggal: '2026-09-07', peserta: ['Husen', 'Budi', 'Siti']},
      {tanggal: '2026-09-14', peserta: ['Husen']},
    ]);

    const db = await openUpgraded();
    const second = await db.absensi.where('tanggal').equals('2026-09-14').first();

    // Budi and Siti are on the roster but this record said nothing about them.
    expect(second?.statuses).toEqual({husen: 'hadir'});
  });

  it('leaves peserta authoritative, so older builds still read attendance', async () => {
    await seedV3([{tanggal: '2026-09-07', peserta: ['Husen', 'Budi']}]);

    const db = await openUpgraded();
    const record = await db.absensi.toCollection().first();

    const present = Object.entries(record?.statuses ?? {})
      .filter(([, s]) => s === 'hadir')
      .map(([k]) => k)
      .sort();
    expect(present).toEqual([...record!.peserta].map((n) => n.toLowerCase()).sort());
  });

  it('upgrades an empty database without error', async () => {
    await seedV3([]);

    const db = await openUpgraded();
    expect(await db.absensi.count()).toBe(0);
    expect(await db.students.count()).toBe(0);
  });

  it('indexes scheduleId, which the app already queried on', async () => {
    await seedV3([
      {tanggal: '2026-09-07', peserta: ['Husen'], scheduleId: 1},
      {tanggal: '2026-09-14', peserta: ['Budi'], scheduleId: 2},
    ]);

    const db = await openUpgraded();
    // Before v4 this property was unindexed, so the query threw and the
    // "previous names" feature silently showed nothing.
    const forSchedule = await db.absensi.where('scheduleId').equals(1).toArray();

    expect(forSchedule).toHaveLength(1);
    expect(forSchedule[0].peserta).toEqual(['Husen']);
  });

  it('is idempotent across repeated opens', async () => {
    await seedV3([{tanggal: '2026-09-07', peserta: ['Husen']}]);

    const db = await openUpgraded();
    db.close();
    await db.open();

    expect(await db.students.count()).toBe(1);
    expect(await db.absensi.count()).toBe(1);
  });
});

describe('upsertStudent', () => {
  beforeEach(async () => {
    await Dexie.delete(DB_NAME);
    const mod = await import('./db');
    if (mod.db.isOpen()) mod.db.close();
  });

  it('adds a santri once and returns the same one thereafter', async () => {
    const {upsertStudent, db} = await import('./db');
    await db.open();

    const first = await upsertStudent('Zaid');
    const second = await upsertStudent('zaid');

    expect(first?.id).toBe(second?.id);
    expect(await db.students.count()).toBe(1);
  });

  it('ignores an empty name', async () => {
    const {upsertStudent, db} = await import('./db');
    await db.open();

    expect(await upsertStudent('   ')).toBeUndefined();
    expect(await db.students.count()).toBe(0);
  });
});
