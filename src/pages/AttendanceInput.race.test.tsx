import React from 'react';
import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {AppProvider} from '../context/AppContext';
import {AttendanceInput} from './AttendanceInput';
import {db} from '../db';

/**
 * Marks must survive a slow database.
 *
 * The provider re-reads the saved session whenever `records` changes, so that
 * an import or a delete elsewhere shows up here. That read also lands a moment
 * after mount, and when it found no saved session for today it cleared the
 * whole form — throwing away every mark made while it was in flight.
 *
 * On a quick laptop the read won the race and nothing was noticed. CI was slow
 * enough to lose it, and so is a cheap phone in front of a class. These tests
 * put the delay in on purpose so the race is lost every time.
 */

const ROSTER = ['Ahmad Fauzi', 'Budi Santoso', 'Dewi Lestari'];

/** How long the attendance table takes to answer a read. */
let readDelayMs = 0;

beforeEach(async () => {
  localStorage.clear();
  await db.open();
  await Promise.all([db.absensi.clear(), db.schedules.clear(), db.students.clear()]);
  await db.students.bulkAdd(
    ROSTER.map((name) => ({
      name,
      nameKey: name.toLowerCase(),
      active: true,
      createdAt: Date.now(),
    })),
  );

  const realWhere = db.absensi.where.bind(db.absensi);
  vi.spyOn(db.absensi, 'where').mockImplementation(((...args: unknown[]) => {
    const clause = (realWhere as any)(...args);
    const realEquals = clause.equals.bind(clause);
    clause.equals = (value: unknown) => {
      const collection = realEquals(value);
      const realToArray = collection.toArray.bind(collection);
      collection.toArray = async () => {
        const rows = await realToArray();
        if (readDelayMs > 0) await new Promise((r) => setTimeout(r, readDelayMs));
        return rows;
      };
      return collection;
    };
    return clause;
  }) as typeof db.absensi.where);
});

afterEach(() => {
  readDelayMs = 0;
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <AppProvider>
      <AttendanceInput />
    </AppProvider>,
  );
}

function marksFor(name: string) {
  return within(screen.getByText(name).closest('li') as HTMLElement);
}

describe('a mark made while the database is still reading', () => {
  it('is not wiped when the read comes back empty', async () => {
    readDelayMs = 150;
    renderPage();
    await waitFor(() => expect(screen.getByText('Ahmad Fauzi')).toBeInTheDocument());

    const hadir = marksFor('Ahmad Fauzi').getByRole('radio', {name: 'Hadir'});
    await userEvent.click(hadir);
    expect(hadir).toBeChecked();

    // Long enough for every in-flight read to land.
    await new Promise((r) => setTimeout(r, 400));

    expect(hadir).toBeChecked();
    expect(screen.getByText(`1/${ROSTER.length} ditandai`)).toBeInTheDocument();
  });

  it('survives a mark being taken off again', async () => {
    readDelayMs = 150;
    renderPage();
    await waitFor(() => expect(screen.getByText('Budi Santoso')).toBeInTheDocument());

    const sakit = marksFor('Budi Santoso').getByRole('radio', {name: 'Sakit'});
    await userEvent.click(sakit);
    expect(sakit).toBeChecked();

    await userEvent.click(sakit);
    await waitFor(() => expect(sakit).not.toBeChecked());

    await new Promise((r) => setTimeout(r, 400));
    expect(sakit).not.toBeChecked();
  });

  it('keeps a whole register filled in during the wait', async () => {
    readDelayMs = 200;
    renderPage();
    await waitFor(() => expect(screen.getByText('Dewi Lestari')).toBeInTheDocument());

    await userEvent.click(marksFor('Ahmad Fauzi').getByRole('radio', {name: 'Hadir'}));
    await userEvent.click(marksFor('Budi Santoso').getByRole('radio', {name: 'Izin'}));
    await userEvent.click(marksFor('Dewi Lestari').getByRole('radio', {name: 'Alpa'}));

    await new Promise((r) => setTimeout(r, 500));

    expect(marksFor('Ahmad Fauzi').getByRole('radio', {name: 'Hadir'})).toBeChecked();
    expect(marksFor('Budi Santoso').getByRole('radio', {name: 'Izin'})).toBeChecked();
    expect(marksFor('Dewi Lestari').getByRole('radio', {name: 'Alpa'})).toBeChecked();
    expect(screen.getByText(`3/${ROSTER.length} ditandai`)).toBeInTheDocument();
  });

  it('still reads a saved session back when nothing has been marked yet', async () => {
    await db.absensi.add({
      tanggal: new Date().toISOString().slice(0, 10),
      peserta: ['Ahmad Fauzi'],
      statuses: {'ahmad fauzi': 'hadir', 'budi santoso': 'sakit'},
      createdAt: Date.now(),
    });

    readDelayMs = 100;
    renderPage();
    await waitFor(() => expect(screen.getByText('Ahmad Fauzi')).toBeInTheDocument());

    // The guard must not stop an untouched form from loading what is saved.
    await waitFor(() =>
      expect(marksFor('Budi Santoso').getByRole('radio', {name: 'Sakit'})).toBeChecked(),
    );
    expect(marksFor('Ahmad Fauzi').getByRole('radio', {name: 'Hadir'})).toBeChecked();
  });
});
