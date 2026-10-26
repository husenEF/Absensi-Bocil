import {expect, test} from '@playwright/test';
import {ROSTER, focusByKeyboard, mark, seed} from './helpers';

/**
 * The floor the interface is built to, asserted rather than assumed.
 *
 * Each of these has been broken at least once: a focus ring flattened to
 * `outline-style: none` by a rule that carried no specificity, marks that
 * leaned on colour alone, and a layout that overflowed a narrow phone.
 */

test.beforeEach(async ({page}) => {
  await seed(page);
});

test('every control shows a focus ring when it is reached by keyboard', async ({page}) => {
  // Save stays disabled until something is marked, and a disabled control
  // cannot take focus — so the register gets one mark before we tab around.
  await mark(page, ROSTER[0], 'Hadir');

  const controls = [
    page.getByRole('button', {name: /Ngaji Pagi/}),
    page.getByLabel('Cari nama santri'),
    page.getByRole('button', {name: /Tandai sisanya hadir/}),
    page.getByRole('button', {name: /Simpan presensi/}),
  ];

  for (const control of controls) {
    await focusByKeyboard(page, control);
    const ring = await control.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        style: style.outlineStyle,
        width: parseFloat(style.outlineWidth),
        offset: parseFloat(style.outlineOffset),
      };
    });

    expect(ring.style).not.toBe('none');
    // WCAG 2.4.13 asks for an indicator at least as thick as a 2px perimeter.
    expect(ring.width).toBeGreaterThanOrEqual(2);
    expect(ring.offset).toBeGreaterThan(0);
  }
});

test('a mark shows its ring through the label that carries the target', async ({page}) => {
  // The radio is visually hidden, so the ring is drawn on the label around it.
  const option = page.locator('label.cs-status__opt').first();
  await focusByKeyboard(page, option.locator('input[type=radio]'));

  const ring = await option.evaluate((el) => {
    const style = getComputedStyle(el);
    return {style: style.outlineStyle, width: parseFloat(style.outlineWidth)};
  });

  expect(ring.style).not.toBe('none');
  expect(ring.width).toBeGreaterThanOrEqual(2);
});

test('an attendance mark is operable from the keyboard', async ({page}) => {
  const row = page.locator('.cs-roster__row').first();
  const hadir = row.getByRole('radio', {name: 'Hadir'});

  await hadir.focus();
  await expect(hadir).toBeFocused();

  await page.keyboard.press('Space');
  await expect(hadir).toBeChecked();

  // Arrow keys move within the group, as a radio group should.
  await page.keyboard.press('ArrowRight');
  await expect(row.getByRole('radio', {name: 'Sakit'})).toBeChecked();
});

test('each mark carries a letter, so colour is never the only channel', async ({page}) => {
  const options = page.locator('.cs-roster__row').first().locator('label.cs-status__opt');

  await expect(options).toHaveCount(4);
  for (const [index, code] of ['h', 's', 'i', 'a'].entries()) {
    await expect(options.nth(index).locator('.cs-status__code')).toHaveText(
      new RegExp(`^${code}$`, 'i'),
    );
  }
});

test('the roster announces who a mark belongs to', async ({page}) => {
  await expect(
    page.getByRole('radiogroup', {name: `Status kehadiran ${ROSTER[0]}, belum ditandai`}),
  ).toBeVisible();
});

test('a 320px screen does not scroll sideways', async ({page}) => {
  // WCAG 1.4.10 Reflow. 320px is the narrowest phone the guideline covers.
  await page.setViewportSize({width: 320, height: 800});

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('every tap target is big enough to hit with a thumb', async ({page}) => {
  const targets = page.locator('.cs-status__opt, .cs-tab, .cs-btn');
  const count = await targets.count();

  for (let i = 0; i < count; i++) {
    const box = await targets.nth(i).boundingBox();
    if (!box) continue;
    expect(box.height, `target ${i} is too short`).toBeGreaterThanOrEqual(40);
  }
});

test('the interface works in both themes', async ({page}) => {
  const body = page.locator('body');
  const light = await body.evaluate((el) => getComputedStyle(el).backgroundColor);

  await page.getByRole('button', {name: /tema gelap/i}).click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  const dark = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(dark).not.toBe(light);
});
