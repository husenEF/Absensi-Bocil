import {expect, test} from '@playwright/test';

/**
 * Installing the app.
 *
 * `src/pwa.test.ts` checks the source files agree with each other. This checks
 * the built site actually serves them: a manifest and an icon that live in
 * `public/` but never make it into `dist/` fail silently, and the install
 * prompt simply never appears.
 */

test.beforeEach(async ({page}) => {
  await page.goto('/');
});

test('the manifest is served and describes an installable app', async ({page, request}) => {
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();

  const response = await request.get(new URL(href as string, page.url()).toString());
  expect(response.status()).toBe(200);

  const manifest = await response.json();
  expect(manifest.short_name).toBe('ClassSync');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.length).toBeGreaterThan(0);
});

test('every icon the manifest promises is really there', async ({page, request}) => {
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifestUrl = new URL(href as string, page.url()).toString();
  const manifest = await (await request.get(manifestUrl)).json();

  for (const icon of manifest.icons as Array<{src: string; type: string}>) {
    const response = await request.get(new URL(icon.src, manifestUrl).toString());
    expect(response.status(), `${icon.src} is missing from the build`).toBe(200);
    // A launcher trusts the declared type. The old icon was a JPEG served
    // under a .png name, which is exactly the case this catches.
    expect(response.headers()['content-type'], `${icon.src} is served as the wrong type`).toContain(
      icon.type,
    );
  }
});

test('iOS gets its own square icon', async ({page, request}) => {
  const href = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect(href).toBeTruthy();

  const response = await request.get(new URL(href as string, page.url()).toString());
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/png');
});

test('nothing on the maskable icon falls outside the launcher’s crop', async ({page}) => {
  // A launcher cuts a maskable icon to its own shape and is only guaranteed
  // to keep the centred circle of 80% diameter. Whether the artwork clears
  // that is a question about pixels, so the rendered icon is sampled rather
  // than its markup read: everything outside the circle has to be plate.
  const url = new URL('icon-maskable-512.png', page.url()).toString();

  const strays = await page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();

    const size = image.naturalWidth;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    const {data} = ctx.getImageData(0, 0, size, size);

    const centre = size / 2;
    const safeRadius = size * 0.4;
    const plate = [0xf9, 0x73, 0x16];
    const found: Array<{x: number; y: number; rgb: number[]}> = [];

    // Every fourth pixel in each direction: enough to catch a shape poking
    // out, cheap enough to run on every build.
    for (let y = 0; y < size; y += 4) {
      for (let x = 0; x < size; x += 4) {
        if (Math.hypot(x - centre, y - centre) <= safeRadius) continue;
        const i = (y * size + x) * 4;
        const rgb = [data[i], data[i + 1], data[i + 2]];
        // Anti-aliasing along a curve shifts a channel by a few counts.
        if (rgb.every((c, k) => Math.abs(c - plate[k]) <= 8)) continue;
        if (found.length < 5) found.push({x, y, rgb});
      }
    }
    return {found, size};
  }, url);

  expect(strays.size).toBe(512);
  expect(
    strays.found,
    'these pixels are drawn outside the safe circle and a round launcher icon would cut them off',
  ).toEqual([]);
});

test('the browser chrome is told which colour to take, in either theme', async ({page}) => {
  const light = page.locator('meta[name="theme-color"][media*="light"]');
  const dark = page.locator('meta[name="theme-color"][media*="dark"]');

  await expect(light).toHaveAttribute('content', '#f5f5f3');
  await expect(dark).toHaveAttribute('content', '#2c2c2c');
});

test('the controls the browser draws itself follow the chosen theme', async ({page}) => {
  // Without this the native date picker and the scrollbar stay light while
  // the rest of the app is dark.
  const scheme = () => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);

  expect(await scheme()).toBe('light');

  await page.getByRole('button', {name: /tema gelap/i}).click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  expect(await scheme()).toBe('dark');
});
