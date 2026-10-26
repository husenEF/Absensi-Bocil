/**
 * Raster the app icons from their SVG sources.
 *
 * Chromium is already a dev dependency through Playwright, so the icons are
 * rendered by the same engine that will display them rather than by adding an
 * image library to the project for four files.
 */
import {chromium} from '@playwright/test';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const PUBLIC = resolve(import.meta.dirname, '..', 'public');

const JOBS = [
  {from: 'icon.svg', to: 'icon-192.png', size: 192},
  {from: 'icon.svg', to: 'icon-512.png', size: 512},
  {from: 'icon-maskable.svg', to: 'icon-maskable-512.png', size: 512},
  // iOS ignores transparency and masks to its own squircle, so the home
  // screen icon comes from the full-bleed drawing.
  {from: 'icon-maskable.svg', to: 'apple-touch-icon.png', size: 180},
];

const browser = await chromium.launch();
for (const job of JOBS) {
  const svg = readFileSync(resolve(PUBLIC, job.from), 'utf8');
  const page = await browser.newPage({
    viewport: {width: job.size, height: job.size},
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<!doctype html><html><body style="margin:0">${svg.replace(
      /width="512" height="512"/,
      `width="${job.size}" height="${job.size}"`,
    )}</body></html>`,
  );
  const buf = await page.screenshot({omitBackground: true, type: 'png'});
  writeFileSync(resolve(PUBLIC, job.to), buf);
  await page.close();
  console.log(`${job.to} ${job.size}x${job.size} ${buf.length} bytes`);
}
await browser.close();
