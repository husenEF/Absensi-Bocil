import fs from 'fs';
import path from 'path';
import {describe, expect, it} from 'vitest';
import {dark, light} from './styles/palette';

/**
 * The installed app.
 *
 * None of this is reachable from the running app, so none of it is covered by
 * the other tests — and it drifted badly because of that. The manifest asked
 * for `#059669` while the page asked for `#ff5500`, neither of which this
 * product has used for some time, and `icon-512.png` was a 1024px JPEG served
 * under a .png name and declared at 192x192. A launcher given that either
 * ignores the icon or scales a photograph into a square.
 *
 * So these read the real files off disk and check the three things nobody
 * looks at until the app is already on someone's home screen: that an icon is
 * the image it says it is, that the colours match the ones the app actually
 * paints, and that the service worker caches everything the shell asks for.
 */

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

/** The icon's plate, which is also what a launcher crops down to. */
const PLATE = '#F97316';

const manifest = JSON.parse(
  fs.readFileSync(path.join(publicDir, 'manifest.json'), 'utf8'),
) as {
  name: string;
  short_name: string;
  description: string;
  lang: string;
  start_url: string;
  scope: string;
  background_color: string;
  theme_color: string;
  display: string;
  icons: Array<{src: string; sizes: string; type: string; purpose: string}>;
};

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8');

/** The pixel dimensions in a PNG's IHDR chunk, which starts at byte 16. */
function pngSize(file: string): {width: number; height: number} {
  const buf = fs.readFileSync(file);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(
    buf.subarray(0, 8).equals(signature),
    `${path.basename(file)} is not a PNG, whatever its name says`,
  ).toBe(true);
  return {width: buf.readUInt32BE(16), height: buf.readUInt32BE(20)};
}

/** The one light meta, or the one dark meta, from the document head. */
function themeColorMeta(scheme: 'light' | 'dark'): string | undefined {
  const pattern = new RegExp(
    `<meta\\s+name="theme-color"\\s+media="\\(prefers-color-scheme: ${scheme}\\)"\\s+content="([^"]+)"`,
  );
  return pattern.exec(indexHtml)?.[1];
}

describe('the web app manifest', () => {
  it('names the app the way the masthead does', () => {
    expect(manifest.short_name).toBe('ClassSync');
    expect(manifest.name).toContain('ClassSync');
    // The launcher only has room for short_name, and Android truncates past
    // roughly a dozen characters.
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
  });

  it('declares the language the app is actually written in', () => {
    expect(manifest.lang).toBe('id');
    expect(indexHtml).toMatch(/<html lang="id">/);
  });

  it('installs as a standalone app from wherever it is served', () => {
    expect(manifest.display).toBe('standalone');
    // Both deployments matter: Vercel serves it at the root, GitHub Pages
    // from a subdirectory. An absolute "/" start_url opens the wrong page on
    // the second one.
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
  });

  it('paints the splash and the task switcher in the app’s own colours', () => {
    expect(manifest.background_color).toBe(light.bg);
    expect(manifest.theme_color).toBe(light.bg);
  });
});

describe('the icons', () => {
  it('ships every file it promises', () => {
    for (const icon of manifest.icons) {
      expect(
        fs.existsSync(path.join(publicDir, icon.src)),
        `${icon.src} is listed in the manifest but not in public/`,
      ).toBe(true);
    }
  });

  it('is each the image it claims to be, at the size it claims', () => {
    for (const icon of manifest.icons.filter((i) => i.type === 'image/png')) {
      const {width, height} = pngSize(path.join(publicDir, icon.src));
      expect(`${width}x${height}`, `${icon.src} is not ${icon.sizes}`).toBe(icon.sizes);
    }
  });

  it('gives a launcher both a plain icon and one it can crop', () => {
    const png = manifest.icons.filter((i) => i.type === 'image/png');
    const any = png.filter((i) => i.purpose.split(' ').includes('any'));
    const maskable = png.filter((i) => i.purpose.split(' ').includes('maskable'));

    // Android wants a 192 for the launcher and a 512 for the splash screen.
    expect(any.map((i) => i.sizes)).toContain('192x192');
    expect(any.map((i) => i.sizes)).toContain('512x512');

    // A maskable icon is cropped to the launcher's shape, so the same drawing
    // cannot serve both purposes: a rounded plate loses its corners.
    expect(maskable.map((i) => i.sizes)).toContain('512x512');
    for (const m of maskable) {
      expect(
        any.some((a) => a.src === m.src),
        `${m.src} is declared both plain and maskable; one of the two will be cropped wrong`,
      ).toBe(false);
    }
  });

  it('draws both variants from one piece of artwork, in flat fills', () => {
    const svgs = ['icon.svg', 'icon-maskable.svg'].map((name) =>
      fs.readFileSync(path.join(publicDir, name), 'utf8'),
    );

    for (const svg of svgs) {
      expect(svg).toContain(PLATE);
      // Flat fills only. A gradient or a blur is what turned the previous
      // icon to mud at launcher size.
      expect(svg).not.toMatch(/linearGradient|radialGradient|feDropShadow|feGaussianBlur/);
    }

    // The two files are the same drawing on two different plates. Comparing
    // the shapes keeps them from drifting into two different icons.
    const shapes = (svg: string) => [
      ...[...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]),
      ...[...svg.matchAll(/<circle ([^/]*)\/>/g)].map((m) => m[1].trim()),
    ];
    expect(shapes(svgs[1])).toEqual(shapes(svgs[0]));
  });

  it('gives the maskable variant a plate that survives the crop', () => {
    const plain = fs.readFileSync(path.join(publicDir, 'icon.svg'), 'utf8');
    const maskable = fs.readFileSync(path.join(publicDir, 'icon-maskable.svg'), 'utf8');

    const plate = (svg: string) => /<rect width="124" height="124"([^/]*)\/>/.exec(svg)?.[1];

    // The plain icon keeps its rounded plate; the maskable one must not,
    // because a launcher cuts its own shape and rounded corners come out as
    // four bites in a square.
    expect(plate(plain), 'the plain icon has lost its rounded plate').toContain('rx=');
    expect(plate(maskable), 'a rounded maskable plate will be cropped wrong').not.toContain('rx=');

    // Whether the drawing itself clears the crop is a question about pixels,
    // not about markup — the artwork is a path, a circle and a rotated rect,
    // and reading corners out of that by regex would only ever be a guess.
    // e2e/pwa.spec.ts samples the rendered icon instead.
  });
});

describe('the document head', () => {
  it('points at the manifest and at an icon for every platform', () => {
    expect(indexHtml).toMatch(/<link rel="manifest" href="manifest.json"/);

    const linked = [...indexHtml.matchAll(/<link rel="(?:apple-touch-)?icon" href="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(linked).toContain('icon.svg');
    expect(linked).toContain('apple-touch-icon.png');

    for (const href of linked) {
      expect(fs.existsSync(path.join(publicDir, href)), `${href} is linked but missing`).toBe(true);
    }
  });

  it('gives iOS a square icon, because it ignores transparency', () => {
    const {width, height} = pngSize(path.join(publicDir, 'apple-touch-icon.png'));
    expect(width).toBe(height);
    expect(width).toBeGreaterThanOrEqual(180);
  });

  it('colours the browser chrome to match whichever theme is on', () => {
    expect(themeColorMeta('light')).toBe(light.bg);
    expect(themeColorMeta('dark')).toBe(dark.bg);
    // The manifest cannot carry a media query, so the light value is the one
    // it has to agree with.
    expect(themeColorMeta('light')).toBe(manifest.theme_color);
  });
});

describe('the service worker', () => {
  it('caches every file the installed shell asks for', () => {
    const cached = serviceWorker.slice(
      serviceWorker.indexOf('ASSETS_TO_CACHE'),
      serviceWorker.indexOf('];', serviceWorker.indexOf('ASSETS_TO_CACHE')),
    );

    for (const icon of manifest.icons) {
      expect(cached, `${icon.src} would be unavailable offline`).toContain(icon.src);
    }
    expect(cached).toContain('manifest.json');
    expect(cached).toContain('apple-touch-icon.png');
  });

  it('retires the previous cache, so a new icon actually reaches the launcher', () => {
    const version = /const CACHE_NAME = '([^']+)'/.exec(serviceWorker)?.[1];
    expect(version).toBeDefined();
    // The activate handler deletes every cache whose name is not the current
    // one; without a bump an installed app keeps serving the old shell.
    expect(version).not.toBe('presensi-kelas-cache-v1');
    expect(serviceWorker).toContain('caches.delete(cache)');
  });
});
