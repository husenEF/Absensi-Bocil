import React from 'react';
import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it} from 'vitest';
import {AppProvider} from '../context/AppContext';
import {AttendanceInput} from './AttendanceInput';
import {db} from '../db';

/**
 * The check-in screen, driven through the real provider and a real (fake)
 * IndexedDB. The rules asserted here are the ones that were got wrong before:
 * a register that pre-marked everyone, and a class picker that quietly decided
 * who was allowed on screen.
 */

const ROSTER = [
  'Ahmad Fauzi',
  'Aisyah Putri',
  'Budi Santoso',
  'Dewi Lestari',
  'Fatimah Zahra',
  'Hasan Basri',
  'Ibrahim Malik',
  'Khadijah Nur',
  'Nabila Syifa',
];

async function seed({schedules = true}: {schedules?: boolean} = {}) {
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

  if (schedules) {
    await db.schedules.bulkAdd([
      {title: 'Ngaji Pagi', hari: 'Senin', waktu: '07:00', remindMinutesBefore: 10, createdAt: Date.now()},
      {title: 'Tahfidz Sore', hari: 'Rabu', waktu: '16:00', remindMinutesBefore: 15, createdAt: Date.now()},
    ]);
  }
}

function renderPage() {
  return render(
    <AppProvider>
      <AttendanceInput />
    </AppProvider>,
  );
}

/** The register rows, once the provider has read the roster out of the db. */
async function rosterNames(): Promise<string[]> {
  const list = await screen.findByRole('list', {name: ''}).catch(() => null);
  void list;
  await waitFor(() => expect(screen.getByText(ROSTER[0])).toBeInTheDocument());
  return ROSTER.filter((name) => screen.queryByText(name) !== null);
}

/** The four marks belonging to one santri. */
function marksFor(name: string) {
  const row = screen.getByText(name).closest('li') as HTMLElement;
  return within(row);
}

beforeEach(async () => {
  localStorage.clear();
  await seed();
});

describe('the register starts empty', () => {
  it('marks nobody when the screen opens', async () => {
    renderPage();
    await rosterNames();

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked();
    }
  });

  it('counts every santri as still waiting', async () => {
    renderPage();
    await rosterNames();

    expect(await screen.findByText(`0/${ROSTER.length} ditandai`)).toBeInTheDocument();
    expect(
      screen.getByText(`${ROSTER.length} santri menunggu ditandai`),
    ).toBeInTheDocument();
  });

  it('will not save until something has been marked', async () => {
    renderPage();
    await rosterNames();

    expect(screen.getByRole('button', {name: /Simpan presensi/})).toBeDisabled();
    expect(
      screen.getByText('Tandai kehadiran santri untuk menyimpan.'),
    ).toBeInTheDocument();
  });

  it('enables saving once one santri carries a mark', async () => {
    renderPage();
    await rosterNames();

    await userEvent.click(marksFor('Ahmad Fauzi').getByRole('radio', {name: 'Hadir'}));

    expect(screen.getByRole('button', {name: /Simpan presensi/})).toBeEnabled();
    expect(await screen.findByText(`1/${ROSTER.length} ditandai`)).toBeInTheDocument();
  });

  it('takes a mark off again when it is tapped twice', async () => {
    renderPage();
    await rosterNames();

    const sakit = marksFor('Budi Santoso').getByRole('radio', {name: 'Sakit'});
    await userEvent.click(sakit);
    expect(sakit).toBeChecked();

    await userEvent.click(sakit);
    await waitFor(() => expect(sakit).not.toBeChecked());
    expect(await screen.findByText(`0/${ROSTER.length} ditandai`)).toBeInTheDocument();
  });
});

describe('choosing a class', () => {
  it('leaves every santri on the register', async () => {
    renderPage();
    const before = await rosterNames();
    expect(before).toHaveLength(ROSTER.length);

    await userEvent.click(await screen.findByRole('button', {name: /Ngaji Pagi/}));

    // The class used to hide everyone outside it, which stranded a santri who
    // turned up to the wrong group and emptied the screen for a new teacher.
    const after = await rosterNames();
    expect(after).toEqual(before);
  });

  it('offers the catch-up dates for the weekday that class runs on', async () => {
    renderPage();
    await rosterNames();

    expect(screen.queryByLabelText(/Pindah ke sesi hari/)).not.toBeInTheDocument();

    await userEvent.click(await screen.findByRole('button', {name: /Ngaji Pagi/}));

    expect(await screen.findByLabelText(/Pindah ke sesi hari Senin/)).toBeInTheDocument();
  });

  it("moves today's date to the class's latest day", async () => {
    renderPage();
    await rosterNames();

    await userEvent.click(screen.getByRole('button', {name: /Tahfidz Sore/}));

    const value = (screen.getByLabelText('Tanggal kegiatan') as HTMLInputElement).value;
    const [y, m, d] = value.split('-').map(Number);
    expect(new Date(y, m - 1, d).getDay()).toBe(3); // Rabu
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(value <= today).toBe(true);
  });

  it('leaves a date the teacher chose alone', async () => {
    renderPage();
    await rosterNames();

    const date = screen.getByLabelText('Tanggal kegiatan');
    await userEvent.clear(date);
    await userEvent.type(date, '2026-09-08');
    await userEvent.click(screen.getByRole('button', {name: /Tahfidz Sore/}));

    expect(date).toHaveValue('2026-09-08');
  });

  it('marks itself as the chosen class, and only one at a time', async () => {
    renderPage();
    await rosterNames();

    const tanpa = screen.getByRole('button', {name: /Tanpa jadwal/});
    const pagi = screen.getByRole('button', {name: /Ngaji Pagi/});
    const sore = screen.getByRole('button', {name: /Tahfidz Sore/});

    expect(tanpa).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(sore);
    expect(sore).toHaveAttribute('aria-pressed', 'true');
    expect(pagi).toHaveAttribute('aria-pressed', 'false');
    expect(tanpa).toHaveAttribute('aria-pressed', 'false');
  });

  it('says nothing about classes when none have been set up', async () => {
    await seed({schedules: false});
    renderPage();
    await rosterNames();

    expect(screen.queryByText('Kelas')).not.toBeInTheDocument();
  });
});

describe('searching the register', () => {
  it('narrows the rows without touching the totals', async () => {
    renderPage();
    await rosterNames();

    await userEvent.type(screen.getByLabelText('Cari nama santri'), 'ah');

    await waitFor(() => expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument());
    expect(screen.getByText('Ahmad Fauzi')).toBeInTheDocument();
    expect(screen.getByText('Fatimah Zahra')).toBeInTheDocument();

    // Searching is a way of looking, not a change to what gets saved.
    expect(screen.getByText(`0/${ROSTER.length} ditandai`)).toBeInTheDocument();
  });

  it('keeps marks that were set while a search was active', async () => {
    renderPage();
    await rosterNames();

    await userEvent.type(screen.getByLabelText('Cari nama santri'), 'khadijah');
    await waitFor(() => expect(screen.queryByText('Ahmad Fauzi')).not.toBeInTheDocument());

    await userEvent.click(marksFor('Khadijah Nur').getByRole('radio', {name: 'Izin'}));

    await userEvent.click(screen.getByRole('button', {name: 'Hapus pencarian'}));

    await waitFor(() => expect(screen.getByText('Ahmad Fauzi')).toBeInTheDocument());
    expect(marksFor('Khadijah Nur').getByRole('radio', {name: 'Izin'})).toBeChecked();
    expect(screen.getByText(`1/${ROSTER.length} ditandai`)).toBeInTheDocument();
  });

  it('offers a way back when nothing matches', async () => {
    renderPage();
    await rosterNames();

    await userEvent.type(screen.getByLabelText('Cari nama santri'), 'zzz');

    expect(await screen.findByText('Tidak ada nama yang cocok')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: 'Tampilkan semua santri'}));
    await waitFor(() => expect(screen.getByText('Ahmad Fauzi')).toBeInTheDocument());
  });
});

describe('adding santri', () => {
  it('keeps the form folded away until it is asked for', async () => {
    renderPage();
    await rosterNames();

    expect(screen.queryByLabelText('Nama santri')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: 'Tambah santri'}));

    expect(screen.getByLabelText('Nama santri')).toBeInTheDocument();
  });

  it('puts a new santri straight onto the register', async () => {
    renderPage();
    await rosterNames();

    await userEvent.click(screen.getByRole('button', {name: 'Tambah santri'}));
    await userEvent.type(screen.getByLabelText('Nama santri'), 'zulfa amira');
    await userEvent.click(screen.getByRole('button', {name: 'Tambah'}));

    // Names are title-cased on the way in, as they always have been.
    expect(await screen.findByText('Zulfa Amira')).toBeInTheDocument();
    expect(await screen.findByText(`0/${ROSTER.length + 1} ditandai`)).toBeInTheDocument();
  });

  it('asks for a name rather than adding a blank one', async () => {
    renderPage();
    await rosterNames();

    await userEvent.click(screen.getByRole('button', {name: 'Tambah santri'}));
    await userEvent.click(screen.getByRole('button', {name: 'Tambah'}));

    expect(await screen.findByText('Masukkan nama santri.')).toBeInTheDocument();
  });
});

describe('removing santri', () => {
  const openManageList = async () => {
    await userEvent.click(
      screen.getByRole('button', {name: 'Kelola kelas & daftar santri'}),
    );
    return screen.findByRole('list', {name: 'Daftar santri tersimpan'});
  };

  it('keeps the list folded away until it is asked for', async () => {
    renderPage();
    await rosterNames();

    expect(
      screen.queryByRole('list', {name: 'Daftar santri tersimpan'}),
    ).not.toBeInTheDocument();

    await openManageList();

    expect(
      screen.getByRole('list', {name: 'Daftar santri tersimpan'}),
    ).toBeInTheDocument();
  });

  it('names the santri in each delete button, so the rows are told apart', async () => {
    renderPage();
    await rosterNames();
    await openManageList();

    // Nine identical "Hapus" buttons are nine identical announcements. The
    // visible label is still "Hapus", which the accessible name contains.
    expect(
      screen.getByRole('button', {name: `Hapus ${ROSTER[0]} dari daftar santri`}),
    ).toBeInTheDocument();
  });

  it('takes a santri off the register and off the count', async () => {
    renderPage();
    await rosterNames();
    await openManageList();

    await userEvent.click(
      screen.getByRole('button', {name: `Hapus ${ROSTER[0]} dari daftar santri`}),
    );

    await waitFor(() => expect(screen.queryByText(ROSTER[0])).not.toBeInTheDocument());
    // The undo that goes with this lives on the shared toast, which the app
    // shell owns rather than this page.
    expect(
      await screen.findByText(`0/${ROSTER.length - 1} ditandai`),
    ).toBeInTheDocument();
  });

  it('deletes a santri nobody has ever recorded outright', async () => {
    renderPage();
    await rosterNames();
    await openManageList();

    await userEvent.click(
      screen.getByRole('button', {name: `Hapus ${ROSTER[0]} dari daftar santri`}),
    );

    // No session mentions them, so there is nothing for the roster
    // reconciliation to rebuild them from and the row can simply go.
    await waitFor(async () =>
      expect(await db.students.where('nameKey').equals(ROSTER[0].toLowerCase()).count()).toBe(0),
    );
  });

  it('retires a santri who appears in a saved session, rather than deleting them', async () => {
    const key = ROSTER[0].toLowerCase();
    await db.absensi.add({
      tanggal: '2026-01-05',
      peserta: [ROSTER[0]],
      statuses: {[key]: 'hadir'},
      createdAt: Date.now(),
    });

    renderPage();
    await rosterNames();
    await openManageList();

    await userEvent.click(
      screen.getByRole('button', {name: `Hapus ${ROSTER[0]} dari daftar santri`}),
    );

    await waitFor(() => expect(screen.queryByText(ROSTER[0])).not.toBeInTheDocument());

    // The row has to survive: the roster is rebuilt from the records on every
    // load, so a deleted santri named in a session would simply reappear —
    // and that session would lose the name it was written with.
    const stored = await db.students.where('nameKey').equals(key).first();
    expect(stored).toBeDefined();
    expect(stored?.active).toBe(false);
  });

  it('drops a mark set for a santri who is then removed mid-session', async () => {
    renderPage();
    await rosterNames();

    await userEvent.click(marksFor(ROSTER[0]).getByRole('radio', {name: /Hadir/}));
    expect(await screen.findByText(`1/${ROSTER.length} ditandai`)).toBeInTheDocument();

    await openManageList();
    await userEvent.click(
      screen.getByRole('button', {name: `Hapus ${ROSTER[0]} dari daftar santri`}),
    );

    // buildStatusMap deliberately keeps statuses for names outside the
    // roster, so without clearing it the save would file a mark for a santri
    // the teacher had just taken off the list.
    expect(
      await screen.findByText(`0/${ROSTER.length - 1} ditandai`),
    ).toBeInTheDocument();
  });
});

describe('saving', () => {
  it('records only the santri who were marked', async () => {
    renderPage();
    await rosterNames();

    await userEvent.click(marksFor('Ahmad Fauzi').getByRole('radio', {name: 'Hadir'}));
    await userEvent.click(marksFor('Budi Santoso').getByRole('radio', {name: 'Sakit'}));
    await userEvent.click(screen.getByRole('button', {name: /Simpan presensi/}));

    await waitFor(async () => {
      const saved = await db.absensi.toArray();
      expect(saved).toHaveLength(1);
    });

    const [record] = await db.absensi.toArray();
    expect(record.peserta).toEqual(['Ahmad Fauzi']);
    expect(record.statuses).toEqual({'ahmad fauzi': 'hadir', 'budi santoso': 'sakit'});

    // The seven santri nobody looked at are absent from the record entirely,
    // rather than filed as present.
    expect(Object.keys(record.statuses ?? {})).toHaveLength(2);
  });

  it('files the session under the class that was chosen', async () => {
    renderPage();
    await rosterNames();

    await userEvent.click(await screen.findByRole('button', {name: /Tahfidz Sore/}));
    await userEvent.click(marksFor('Nabila Syifa').getByRole('radio', {name: 'Hadir'}));
    await userEvent.click(screen.getByRole('button', {name: /Simpan presensi/}));

    await waitFor(async () => {
      expect(await db.absensi.count()).toBe(1);
    });

    const [record] = await db.absensi.toArray();
    // `title` is not an index, so the lookup goes through the whole table.
    const sore = (await db.schedules.toArray()).find((s) => s.title === 'Tahfidz Sore');
    expect(record.scheduleId).toBe(sore?.id);
  });

  it('fills only the santri still waiting when the shortcut is used', async () => {
    renderPage();
    await rosterNames();

    await userEvent.click(marksFor('Dewi Lestari').getByRole('radio', {name: 'Alpa'}));
    await userEvent.click(screen.getByRole('button', {name: /Tandai sisanya hadir/}));

    await waitFor(() =>
      expect(screen.getByText(`${ROSTER.length}/${ROSTER.length} ditandai`)).toBeInTheDocument(),
    );

    // The one absence already recorded is not swept away by the shortcut.
    expect(marksFor('Dewi Lestari').getByRole('radio', {name: 'Alpa'})).toBeChecked();
    expect(marksFor('Ahmad Fauzi').getByRole('radio', {name: 'Hadir'})).toBeChecked();
  });
});

describe('a class with members', () => {
  /** Put Ahmad and Aisyah in Ngaji Pagi; everyone else has no class. */
  async function placeInPagi() {
    const pagi = (await db.schedules.toArray()).find((s) => s.title === 'Ngaji Pagi');
    await db.students
      .where('nameKey')
      .anyOf('ahmad fauzi', 'aisyah putri')
      .modify({scheduleId: pagi!.id});
  }

  async function pickPagi() {
    renderPage();
    await rosterNames();
    await userEvent.click(await screen.findByRole('button', {name: /Ngaji Pagi/}));
  }

  beforeEach(placeInPagi);

  it('lists the members and folds everyone else away', async () => {
    await pickPagi();

    const members = await screen.findByRole('list', {name: 'Santri Ngaji Pagi'});
    expect(within(members).getByText('Ahmad Fauzi')).toBeInTheDocument();
    expect(within(members).getByText('Aisyah Putri')).toBeInTheDocument();
    expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument();

    const fold = screen.getByRole('button', {name: `Santri lain (${ROSTER.length - 2})`});
    expect(fold).toHaveAttribute('aria-expanded', 'false');
  });

  it('still lets a visitor from outside the class be marked', async () => {
    await pickPagi();

    await userEvent.click(screen.getByRole('button', {name: /Santri lain/}));
    await userEvent.click(marksFor('Budi Santoso').getByRole('radio', {name: 'Hadir'}));

    expect(screen.getByText(`1/${ROSTER.length} ditandai`)).toBeInTheDocument();
  });

  it('opens the fold on a saved session that marked a visitor', async () => {
    await pickPagi();

    await userEvent.click(screen.getByRole('button', {name: /Santri lain/}));
    await userEvent.click(marksFor('Budi Santoso').getByRole('radio', {name: 'Sakit'}));
    await userEvent.click(screen.getByRole('button', {name: /Simpan presensi/}));
    await waitFor(async () => expect(await db.absensi.count()).toBe(1));

    // Saving clears the class; picking it again reopens the same session.
    await userEvent.click(await screen.findByRole('button', {name: /Ngaji Pagi/}));

    await waitFor(() =>
      expect(screen.getByRole('button', {name: /Santri lain/})).toHaveAttribute('aria-expanded', 'true'),
    );
    expect(marksFor('Budi Santoso').getByRole('radio', {name: 'Sakit'})).toBeChecked();
  });

  it('opens the fold when a search only matches outside the class', async () => {
    await pickPagi();

    await userEvent.type(screen.getByLabelText('Cari nama santri'), 'budi');

    expect(await screen.findByText('Budi Santoso')).toBeInTheDocument();
  });

  it('shows a santri added mid-session even though they have no class', async () => {
    await pickPagi();

    await userEvent.click(screen.getByRole('button', {name: 'Tambah santri'}));
    await userEvent.type(screen.getByLabelText('Nama santri'), 'zulfa amira');
    await userEvent.click(screen.getByRole('button', {name: 'Tambah'}));

    expect(await screen.findByText('Zulfa Amira')).toBeInTheDocument();
  });

  it("fills the class's time, and saves the time actually used", async () => {
    await pickPagi();

    const jam = screen.getByLabelText('Jam') as HTMLInputElement;
    await waitFor(() => expect(jam.value).toBe('07:00'));

    // The class ran late this week.
    await userEvent.clear(jam);
    await userEvent.type(jam, '09:30');
    await userEvent.click(marksFor('Ahmad Fauzi').getByRole('radio', {name: 'Hadir'}));
    await userEvent.click(screen.getByRole('button', {name: /Simpan presensi/}));

    await waitFor(async () => expect(await db.absensi.count()).toBe(1));
    expect((await db.absensi.toArray())[0].waktu).toBe('09:30');
  });

  it('keeps a time typed straight after moving the date', async () => {
    await pickPagi();

    // A new date starts a read of that session; the time typed while it is
    // in flight must survive it landing.
    const date = screen.getByLabelText('Tanggal kegiatan');
    await userEvent.clear(date);
    await userEvent.type(date, '2026-09-12');
    const jam = screen.getByLabelText('Jam');
    await userEvent.clear(jam);
    await userEvent.type(jam, '10:00');
    await new Promise((r) => setTimeout(r, 200));
    expect(jam).toHaveValue('10:00');

    await userEvent.click(marksFor('Ahmad Fauzi').getByRole('radio', {name: 'Hadir'}));
    await userEvent.click(screen.getByRole('button', {name: /Simpan presensi/}));
    await waitFor(async () => expect(await db.absensi.count()).toBe(1));
    expect((await db.absensi.toArray())[0]).toMatchObject({tanggal: '2026-09-12', waktu: '10:00'});
  });

  it('puts a santri added with the class picked into that class', async () => {
    await pickPagi();

    await userEvent.click(screen.getByRole('button', {name: 'Tambah santri'}));
    expect(screen.getByLabelText('Masukkan ke Ngaji Pagi')).toBeChecked();
    await userEvent.type(screen.getByLabelText('Nama santri'), 'zulfa amira');
    await userEvent.click(screen.getByRole('button', {name: 'Tambah'}));

    const members = await screen.findByRole('list', {name: 'Santri Ngaji Pagi'});
    await waitFor(() => expect(within(members).getByText('Zulfa Amira')).toBeInTheDocument());
  });

  it('places a santri in a class from the roster list', async () => {
    renderPage();
    await rosterNames();

    await userEvent.click(screen.getByRole('button', {name: 'Kelola kelas & daftar santri'}));
    await userEvent.selectOptions(screen.getByLabelText('Kelas Budi Santoso'), 'Tahfidz Sore');

    const sore = (await db.schedules.toArray()).find((s) => s.title === 'Tahfidz Sore');
    await waitFor(async () =>
      expect((await db.students.where('nameKey').equals('budi santoso').first())?.scheduleId).toBe(sore?.id),
    );
  });

  it('fills only the class when the shortcut is used', async () => {
    await pickPagi();

    await userEvent.click(screen.getByRole('button', {name: /Tandai sisanya hadir/}));

    await waitFor(() => expect(screen.getByText(`2/${ROSTER.length} ditandai`)).toBeInTheDocument());
    expect(marksFor('Ahmad Fauzi').getByRole('radio', {name: 'Hadir'})).toBeChecked();
  });
});
