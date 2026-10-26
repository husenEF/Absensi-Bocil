import {expect, test} from '@playwright/test';
import {mark, seed} from './helpers';

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
  await expect(page.getByText('Presensi tersimpan')).toBeVisible();

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
  await expect(page.getByText('Presensi tersimpan')).toBeVisible();

  await page.getByRole('button', {name: /Laporan/}).click();
  for (const box of await page.getByRole('checkbox').all()) {
    if (!(await box.isChecked())) await box.check();
  }
  await page.getByRole('button', {name: /Susun laporan/}).click();

  const report = await page.locator('textarea').first().inputValue();
  expect(report).toContain('* Tgl Kursus : -');
  expect(report).toContain('* Peserta : -');
});
