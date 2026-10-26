import React from 'react';
import {act, renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it} from 'vitest';
import {AppProvider, useApp} from './AppContext';
import {db} from '../db';

/**
 * Merging data from another phone. Class ids are local to each phone's
 * database, so a santri's class only means something here once it has been
 * translated through the schedules both phones share.
 */

const wrapper = ({children}: {children: React.ReactNode}) => <AppProvider>{children}</AppProvider>;

/** What the other phone sends: its "Ngaji Pagi" happens to be id 7. */
const incoming = {
  app: 'ClassSync',
  version: '2.2',
  exportedAt: 0,
  absensi: [],
  schedules: [{id: 7, title: 'Ngaji Pagi', hari: 'Senin', waktu: '07:00', remindMinutesBefore: 0, createdAt: 0}],
  students: [
    {name: 'Aan', nameKey: 'aan', active: true, scheduleId: 7, createdAt: 0},
    {name: 'Budi', nameKey: 'budi', active: true, scheduleId: 7, createdAt: 0},
    {name: 'Siti', nameKey: 'siti', active: true, scheduleId: 7, createdAt: 0},
  ],
};

async function merge() {
  const {result} = renderHook(() => useApp(), {wrapper});
  await act(() => result.current.handleSmartMergeImport(incoming));
  await waitFor(() => expect(result.current.pendingImport).not.toBeNull());
  await act(() => result.current.confirmPendingImport());
}

async function classOf(key: string) {
  return (await db.students.where('nameKey').equals(key).first())?.scheduleId;
}

beforeEach(async () => {
  localStorage.clear();
  await db.open();
  await Promise.all([db.absensi.clear(), db.schedules.clear(), db.students.clear()]);
});

describe('merging santri classes', () => {
  it('translates the class id to this phone and fills in what is missing', async () => {
    const pagi = await db.schedules.add({title: 'Ngaji Pagi', hari: 'Senin', waktu: '07:00', remindMinutesBefore: 0, createdAt: 0});
    const sore = await db.schedules.add({title: 'Tahfidz Sore', hari: 'Rabu', waktu: '16:00', remindMinutesBefore: 0, createdAt: 0});
    // Budi is known here without a class; Siti is known here in another one.
    await db.students.bulkAdd([
      {name: 'Budi', nameKey: 'budi', active: true, createdAt: 0},
      {name: 'Siti', nameKey: 'siti', active: true, scheduleId: sore, createdAt: 0},
    ]);

    await merge();

    await waitFor(async () => expect(await classOf('aan')).toBe(pagi));
    expect(await classOf('budi')).toBe(pagi);
    // The teacher's own placement wins over the other phone's.
    expect(await classOf('siti')).toBe(sore);
  });
});
