/**
 * Write the version in package.json into the files that cannot read it.
 *
 * The app's version lives in exactly one place: the `version` field of
 * package.json. Everything that needs it either imports it (the bundle, via
 * the `__APP_VERSION__` define in vite.config.ts) or is written by this
 * script.
 *
 * The service worker is the reason this exists. `public/sw.js` is served
 * verbatim, never passed through the bundler, so it cannot import anything —
 * its cache name was a hand-typed string that had to be remembered on every
 * release. Forget it and the activate handler finds the cache it already has,
 * deletes nothing, and every installed phone keeps serving the previous shell
 * forever: the teacher sees an app that simply never updates, with no error to
 * report. Tying the name to the version means shipping a release and busting
 * the cache are the same action.
 *
 * Run as part of `npm run build` and by `npm run release`. Pass --check to
 * verify without writing, which is what CI and the test suite do.
 */

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

/** The one name every cached shell is filed under. */
export const cacheNameFor = (version) => `classsync-shell-v${version}`;

const SW_PATH = path.join(root, 'public', 'sw.js');
const CACHE_LINE = /^const CACHE_NAME = '[^']*';$/m;

const checkOnly = process.argv.includes('--check');

const sw = fs.readFileSync(SW_PATH, 'utf8');
const wanted = `const CACHE_NAME = '${cacheNameFor(pkg.version)}';`;

if (!CACHE_LINE.test(sw)) {
  console.error(
    `sync-version: no \`const CACHE_NAME = '…';\` line in public/sw.js.\n` +
      'The service worker cache can no longer be versioned; fix the line or this script.',
  );
  process.exit(1);
}

const updated = sw.replace(CACHE_LINE, wanted);

if (updated === sw) {
  console.log(`sync-version: public/sw.js already at ${pkg.version}`);
  process.exit(0);
}

if (checkOnly) {
  console.error(
    `sync-version: public/sw.js is stale.\n` +
      `  package.json says ${pkg.version}, which wants: ${wanted}\n` +
      '  Run `npm run version:sync` and commit the result.',
  );
  process.exit(1);
}

fs.writeFileSync(SW_PATH, updated);
console.log(`sync-version: public/sw.js -> ${cacheNameFor(pkg.version)}`);
