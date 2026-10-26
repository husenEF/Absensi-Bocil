import {expect, test} from '@playwright/test';
import {ROSTER, mark, markFor, markRadio, rowFor, savedSessions, seed, savedConfirmation} from './helpers';

/**
 * Taking a register, start to finish, in a real browser against the built app.
 *
 * The journey these cover is the whole reason the app exists: open it in front
 * of a class, mark who is there, save, and have the record say what actually
 * happened.
 */

test.beforeEach(async ({page}) => {
  await seed(page);
});

test('a teacher marks a class and saves only what they marked', async ({page}) => {
  await expect(page.getByText(`0/${ROSTER.length} ditandai`)).toBeVisible();
  await expect(page.getByRole('button', {name: /Simpan presensi/})).toBeDisabled();

  await mark(page, 'Ahmad Fauzi', 'Hadir');
  await mark(page, 'Aisyah Putri', 'Hadir');
  await mark(page, 'Budi Santoso', 'Sakit');
  await mark(page, 'Dewi Lestari', 'Alpa');

  await expect(page.getByText(`4/${ROSTER.length} ditandai`)).toBeVisible();
  await expect(page.getByText(`4 ditandai · 5 belum ikut tersimpan`)).toBeVisible();

  await page.getByRole('button', {name: /Simpan presensi/}).click();
  await expect(savedConfirmation(page)).toBeVisible();

  const sessions = await savedSessions(page);
  expect(sessions).toHaveLength(1);
  expect(sessions[0].peserta).toEqual(['Ahmad Fauzi', 'Aisyah Putri']);
  expect(sessions[0].statuses).toEqual({
    'ahmad fauzi': 'hadir',
    'aisyah putri': 'hadir',
    'budi santoso': 'sakit',
    'dewi lestari': 'alpa',
  });

  // The five nobody looked at are not in the record at all.
  expect(Object.keys(sessions[0].statuses)).toHaveLength(4);
});

test('nothing is marked until the teacher marks it', async ({page}) => {
  const radios = page.getByRole('radio');
  const count = await radios.count();
  expect(count).toBe(ROSTER.length * 4);

  for (let i = 0; i < count; i++) {
    await expect(radios.nth(i)).not.toBeChecked();
  }
});

test('a mistapped mark can be taken off again', async ({page}) => {
  const alpa = markFor(page, 'Hasan Basri', 'Alpa');
  const radio = markRadio(page, 'Hasan Basri', 'Alpa');

  await alpa.click();
  await expect(radio).toBeChecked();

  await alpa.click();
  await expect(radio).not.toBeChecked();
  await expect(page.getByText(`0/${ROSTER.length} ditandai`)).toBeVisible();
});

test('choosing a class fills the date and keeps the whole register', async ({page}) => {
  const rows = page.locator('.cs-roster__row');
  await expect(rows).toHaveCount(ROSTER.length);

  await page.getByRole('button', {name: /Ngaji Pagi/}).click();

  // The class is about which session this is, not about who may be marked.
  await expect(rows).toHaveCount(ROSTER.length);
  await expect(page.getByLabel(/Pindah ke sesi hari Senin/)).toBeVisible();
  await expect(page.getByText('Ngaji Pagi · setiap Senin, 07:00')).toBeVisible();

  await mark(page, 'Nabila Syifa', 'Hadir');
  await page.getByRole('button', {name: /Simpan presensi/}).click();
  await expect(savedConfirmation(page)).toBeVisible();

  const sessions = await savedSessions(page);
  expect(sessions[0].scheduleId).toBeDefined();
});

test('searching narrows the rows but not what gets saved', async ({page}) => {
  await page.getByLabel('Cari nama santri').fill('khadijah');

  await expect(rowFor(page, 'Khadijah Nur')).toBeVisible();
  await expect(rowFor(page, 'Ahmad Fauzi')).toHaveCount(0);

  await mark(page, 'Khadijah Nur', 'Izin');

  await page.getByRole('button', {name: 'Hapus pencarian'}).click();
  await expect(page.locator('.cs-roster__row')).toHaveCount(ROSTER.length);

  // The mark survived the filter, and the count was never scoped to it.
  await expect(markRadio(page, 'Khadijah Nur', 'Izin')).toBeChecked();
  await expect(page.getByText(`1/${ROSTER.length} ditandai`)).toBeVisible();
});

test('the shortcut fills only the santri still waiting', async ({page}) => {
  await mark(page, 'Dewi Lestari', 'Alpa');
  await page.getByRole('button', {name: /Tandai sisanya hadir/}).click();

  await expect(page.getByText(`${ROSTER.length}/${ROSTER.length} ditandai`)).toBeVisible();
  await expect(markRadio(page, 'Dewi Lestari', 'Alpa')).toBeChecked();
  await expect(markRadio(page, 'Ahmad Fauzi', 'Hadir')).toBeChecked();
});

test('a santri added mid-session appears on the register straight away', async ({page}) => {
  await page.getByRole('button', {name: 'Tambah santri', exact: true}).click();
  await page.getByLabel('Nama santri', {exact: true}).fill('zulfa amira');
  await page.getByRole('button', {name: 'Tambah', exact: true}).click();

  await expect(rowFor(page, 'Zulfa Amira')).toBeVisible();
  await expect(page.getByText(`0/${ROSTER.length + 1} ditandai`)).toBeVisible();
});

test('saving over an existing session says what it is replacing', async ({page}) => {
  await mark(page, 'Ahmad Fauzi', 'Hadir');
  await page.getByRole('button', {name: /Simpan presensi/}).click();
  await expect(savedConfirmation(page)).toBeVisible();

  await page.getByRole('button', {name: 'Catat sesi lain'}).click();
  await mark(page, 'Hasan Basri', 'Hadir');
  await page.getByRole('button', {name: /Simpan presensi/}).click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Perbarui presensi hari ini?');

  await dialog.getByRole('button', {name: 'Perbarui presensi'}).click();

  const sessions = await savedSessions(page);
  expect(sessions).toHaveLength(1);
});
