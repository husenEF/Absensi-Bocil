import {expect, test} from '@playwright/test';
import {seed} from './helpers';

/**
 * Jadwal and Sinkron.
 *
 * Both pages were rewritten from loose utility classes into the keyline
 * components, which moved every id, label and wrapper on them. Nothing here
 * tests how they look; it tests that the controls the rewrite touched still do
 * what they did — a schedule can be added and removed, and the sync page still
 * puts its methods on screen.
 */

test.beforeEach(async ({page}) => {
  await seed(page);
});

const openTab = (page: import('@playwright/test').Page, label: string) =>
  page.getByRole('button', {name: label, exact: true}).click();

test.describe('Jadwal', () => {
  test('a class can be added and shows when it recurs', async ({page}) => {
    await openTab(page, 'Jadwal');

    await page.getByLabel('Nama kelas').fill('Iqra sore');
    await page.getByLabel('Hari').selectOption('Kamis');
    await page.getByLabel('Jam mulai').fill('16:30');
    await page.getByLabel('Ingatkan saya').selectOption('30');
    await page.getByRole('button', {name: 'Simpan jadwal'}).click();

    const added = page.locator('li.cs-card').filter({hasText: 'Iqra sore'});
    await expect(added).toBeVisible();
    await expect(added).toContainText('Setiap Kamis, pukul 16:30');
    await expect(added).toContainText('diingatkan 30 menit sebelumnya');
  });

  test('a class can be removed, and the removal is confirmed first', async ({page}) => {
    await openTab(page, 'Jadwal');

    const row = page.locator('li.cs-card').filter({hasText: 'Ngaji Pagi'});
    await expect(row).toBeVisible();

    // Deleting a class is destructive and still goes through a confirmation.
    let asked = '';
    page.on('dialog', (dialog) => {
      asked = dialog.message();
      void dialog.accept();
    });

    await row.getByRole('button', {name: 'Hapus'}).click();

    await expect(row).toHaveCount(0);
    expect(asked).toContain('Ngaji Pagi');
  });

  test('a new class reaches the register as a choice of session', async ({page}) => {
    await openTab(page, 'Jadwal');
    await page.getByLabel('Nama kelas').fill('Tahsin malam');
    await page.getByRole('button', {name: 'Simpan jadwal'}).click();
    await expect(page.locator('li.cs-card').filter({hasText: 'Tahsin malam'})).toBeVisible();

    await openTab(page, 'Presensi');
    await expect(page.locator('.cs-group__btn').filter({hasText: 'Tahsin malam'})).toBeVisible();
  });
});

test.describe('Sinkron', () => {
  test('counts what would be sent and offers every way of sending it', async ({page}) => {
    await openTab(page, 'Sinkron');

    await expect(page.getByText('2 jadwal')).toBeVisible();
    await expect(page.getByText('0 presensi')).toBeVisible();

    for (const method of ['Tampilkan QR', 'Pindai QR', 'Salin tautan', 'Unduh cadangan']) {
      await expect(page.getByRole('button', {name: method})).toBeVisible();
    }
  });

  test('showing the QR puts a scannable barcode on screen', async ({page}) => {
    await openTab(page, 'Sinkron');
    await page.getByRole('button', {name: 'Tampilkan QR'}).click();

    const qr = page.locator('.cs-qr img');
    await expect(qr).toBeVisible();
    await expect(qr).toHaveAttribute('alt', /QR/i);
  });

  test('the sample data offer is hidden once there is real data to lose', async ({page}) => {
    await openTab(page, 'Sinkron');
    // The seed leaves two schedules behind, which is already enough to make
    // loading the sample destructive.
    await expect(page.getByRole('button', {name: 'Muat data contoh'})).toHaveCount(0);
  });
});

test('every tap target on every page is big enough to hit with a thumb', async ({page}) => {
  for (const tab of ['Presensi', 'Riwayat', 'Laporan', 'Jadwal', 'Sinkron']) {
    await openTab(page, tab);

    // Measured in one pass in the page: walking the controls one locator at a
    // time raced with the toast that appears on arriving at a tab, so the
    // count read at the start no longer matched the controls on screen.
    const short = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(
        '.cs-btn, .cs-tab, .cs-status__opt, .cs-group__btn, .cs-iconbtn',
      )]
        .map((el) => ({label: el.textContent?.trim() ?? '', height: el.getBoundingClientRect().height}))
        .filter((t) => t.height > 0 && t.height < 40),
    );

    expect(short, `${tab} has a control too short to hit`).toEqual([]);
  }
});
