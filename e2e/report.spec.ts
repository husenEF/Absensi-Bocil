import {expect, test} from '@playwright/test';
import {mark, seed, savedConfirmation} from './helpers';

/**
 * The register is only half the job: what the coordinator receives on WhatsApp
 * is the other half, and it has an agreed shape.
 */

test('the WhatsApp report names every santri with their mark', async ({page}) => {
  await seed(page, {roster: ['Ubin', 'Aan', 'Budi Santoso', 'Dewi Lestari']});

  await mark(page, 'Ubin', 'Hadir');
  await mark(page, 'Aan', 'Izin');
  await mark(page, 'Budi Santoso', 'Sakit');
  await mark(page, 'Dewi Lestari', 'Alpa');
  await page.getByRole('button', {name: /Simpan presensi/}).click();
  await expect(savedConfirmation(page)).toBeVisible();

  await page.getByRole('button', {name: /Laporan/}).click();

  for (const box of await page.getByRole('checkbox').all()) {
    if (!(await box.isChecked())) await box.check();
  }
  await page.getByRole('button', {name: /Susun laporan/}).click();

  const report = await page.locator('textarea').first().inputValue();

  // Present first, then the absences, each carrying its letter — a
  // coordinator has to be able to tell "ill" from "never mentioned".
  expect(report).toContain('* Tgl Kursus : ');
  expect(report).toContain('* Peserta : Ubin (H), Budi Santoso (S), Aan (I), Dewi Lestari (A)');

  // The first week once used different labels from every other week.
  expect(report).not.toContain('Tgl kursus');
  expect(report).not.toContain('Peserta Hadir');
});

test('an empty week says so rather than being left out', async ({page}) => {
  await seed(page, {roster: ['Ubin']});

  await mark(page, 'Ubin', 'Hadir');
  await page.getByRole('button', {name: /Simpan presensi/}).click();
  await expect(savedConfirmation(page)).toBeVisible();

  await page.getByRole('button', {name: /Laporan/}).click();
  for (const box of await page.getByRole('checkbox').all()) {
    if (!(await box.isChecked())) await box.check();
  }
  await page.getByRole('button', {name: /Susun laporan/}).click();

  const report = await page.locator('textarea').first().inputValue();
  expect(report).toContain('* Tgl Kursus : -');
  expect(report).toContain('* Peserta : -');
});

test('exporting every class groups the report by class', async ({page}) => {
  await seed(page, {roster: ['Ubin', 'Aan']});

  for (const [kelas, who] of [['Ngaji Pagi', 'Ubin'], ['Tahfidz Sore', 'Aan']] as const) {
    await page.locator('.cs-group__btn').filter({hasText: kelas}).click();
    // Both in one period, whatever day the suite runs on.
    await page.getByLabel('Tanggal kegiatan').fill(kelas === 'Ngaji Pagi' ? '2026-09-07' : '2026-09-09');
    await mark(page, who, 'Hadir');
    await page.getByRole('button', {name: /Simpan presensi/}).click();
    await expect(savedConfirmation(page)).toBeVisible();
  }

  await page.getByRole('button', {name: /Laporan/}).click();
  await page.locator('#report_period').selectOption({label: 'September - Oktober 2026'});
  await page.getByRole('button', {name: /Susun laporan/}).click();
  const all = await page.locator('textarea').first().inputValue();

  expect(all.match(/^Mohon untuk dikirimkan Laporan Kursus periode /gm)).toHaveLength(1);
  const pagi = all.slice(all.indexOf('*Ngaji Pagi*'), all.indexOf('*Tahfidz Sore*'));
  expect(pagi).toContain('* Peserta : Ubin (H)');
  expect(pagi).not.toContain('Aan');
  expect(all.slice(all.indexOf('*Tahfidz Sore*'))).toContain('* Peserta : Aan (H)');

  // One class on its own reads as the report always has: no section heading.
  await page.locator('#report_schedule_filter').selectOption({label: 'Tahfidz Sore (Rabu)'});
  await page.getByRole('button', {name: /Susun laporan/}).click();
  const one = await page.locator('textarea').first().inputValue();
  expect(one).not.toContain('*Tahfidz Sore*');
  expect(one).toContain('* Peserta : Aan (H)');
  expect(one).not.toContain('Ubin');
});

test('the Excel sheet follows the class, with a draft of its own', async ({page}) => {
  await seed(page, {roster: ['Ubin', 'Aan', 'Budi Santoso']});

  for (const [kelas, tanggal, who] of [
    ['Ngaji Pagi', '2026-09-07', 'Ubin'],
    ['Tahfidz Sore', '2026-09-09', 'Aan'],
  ] as const) {
    await page.locator('.cs-group__btn').filter({hasText: kelas}).click();
    await page.getByLabel('Tanggal kegiatan').fill(tanggal);
    await mark(page, who, 'Hadir');
    await page.getByRole('button', {name: /Simpan presensi/}).click();
    await expect(savedConfirmation(page)).toBeVisible();
  }

  await page.getByRole('button', {name: /Laporan/}).click();
  await page.locator('#report_period').selectOption({label: 'September - Oktober 2026'});
  await page.getByRole('button', {name: /Format Excel/}).click();

  const names = () =>
    page
      .locator('table tbody tr td:nth-child(2) input')
      .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value).filter(Boolean));
  const guru = page.locator('label:has-text("Nama Guru") + input');

  await page.locator('#report_schedule_filter').selectOption({label: 'Ngaji Pagi (Senin)'});
  await expect.poll(names).toEqual(['Ubin']);
  await guru.fill('Ustadz Pagi');
  await page.getByRole('button', {name: /Simpan draf/}).click();

  await page.locator('#report_schedule_filter').selectOption({label: 'Tahfidz Sore (Rabu)'});
  await expect.poll(names).toEqual(['Aan']);
  await guru.fill('Ustadzah Sore');
  await page.getByRole('button', {name: /Simpan draf/}).click();

  await page.locator('#report_schedule_filter').selectOption({label: 'Ngaji Pagi (Senin)'});
  await expect(guru).toHaveValue('Ustadz Pagi');
});
