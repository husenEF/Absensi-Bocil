/**
 * Cut a release.
 *
 *   npm run release -- minor
 *   npm run release -- patch --dry-run
 *   npm run release -- 2.4.1
 *
 * One command, because a release here is several things that are only correct
 * together: the version in package.json, the service worker's cache name, the
 * heading in the changelog, a commit and a tag. Doing them by hand means
 * eventually doing three of the five, and the one most easily forgotten — the
 * cache name — is the one whose failure is silent and permanent: installed
 * phones keep serving the previous shell with nothing to report.
 *
 * What it will not do is push. Publishing is the one step that cannot be
 * undone quietly, so it stays a deliberate act: the script prints the command
 * and stops.
 */

import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PKG = path.join(root, 'package.json');
const CHANGELOG = path.join(root, 'CHANGELOG.md');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const bump = args.find((a) => !a.startsWith('--'));

const git = (...a) => execFileSync('git', a, {cwd: root, encoding: 'utf8'}).trim();

const die = (message) => {
  console.error(`release: ${message}`);
  process.exit(1);
};

if (!bump) {
  die(
    'say what to release.\n' +
      '  npm run release -- patch | minor | major | <exact version>\n' +
      '  add --dry-run to see what it would do',
  );
}

const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
const current = pkg.version;

/** `patch`/`minor`/`major`, or an exact version to jump to. */
function nextVersion(from, how) {
  if (/^\d+\.\d+\.\d+$/.test(how)) return how;

  const [major, minor, patch] = from.split('.').map(Number);
  if ([major, minor, patch].some(Number.isNaN)) {
    die(`cannot read the current version "${from}" as x.y.z`);
  }

  if (how === 'major') return `${major + 1}.0.0`;
  if (how === 'minor') return `${major}.${minor + 1}.0`;
  if (how === 'patch') return `${major}.${minor}.${patch + 1}`;
  return die(`"${how}" is not patch, minor, major or an x.y.z version`);
}

const version = nextVersion(current, bump);
const tag = `v${version}`;

// --- the state the release has to start from ---------------------------------

// A release is a claim about what is in the tree, so the tree has to be the
// thing that was tested. Committing whatever happens to be lying around is how
// a release ends up containing something nobody reviewed.
if (!dryRun && git('status', '--porcelain')) {
  die('the working tree has uncommitted changes. Commit or stash them first.');
}

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
if (!dryRun && branch !== 'main') {
  die(`releases are cut from main, and this is "${branch}".`);
}

const tags = git('tag', '--list').split('\n').filter(Boolean);
if (tags.includes(tag)) die(`${tag} already exists.`);

// --- the edits ---------------------------------------------------------------

const today = new Date().toISOString().slice(0, 10);

const changelog = fs.readFileSync(CHANGELOG, 'utf8');
const UNRELEASED = /^## Unreleased$/m;

if (!UNRELEASED.test(changelog)) {
  die(
    'CHANGELOG.md has no "## Unreleased" heading to promote.\n' +
      '  Add one, write what changed under it, then run this again.',
  );
}

const body = changelog.split(UNRELEASED)[1].split(/^## /m)[0].trim();
if (!body) {
  die(
    'nothing is written under "## Unreleased" in CHANGELOG.md.\n' +
      '  A release with no notes is one nobody can tell apart from the last.',
  );
}

const nextChangelog = changelog.replace(
  UNRELEASED,
  `## Unreleased\n\n## ${version} — ${today}`,
);

console.log(`release: ${current} -> ${version}  (${tag})`);
console.log(`\n${body}\n`);

if (dryRun) {
  console.log('release: --dry-run, nothing written.');
  process.exit(0);
}

pkg.version = version;
fs.writeFileSync(PKG, `${JSON.stringify(pkg, null, 2)}\n`);
fs.writeFileSync(CHANGELOG, nextChangelog);

// Rewrites the service worker's cache name from the version just written.
execFileSync('node', [path.join(root, 'scripts', 'sync-version.mjs')], {
  cwd: root,
  stdio: 'inherit',
});

git('add', 'package.json', 'CHANGELOG.md', 'public/sw.js');
git('commit', '-m', `Release ${version}`);
git('tag', '-a', tag, '-m', `ClassSync ${version}\n\n${body}`);

console.log(`\nrelease: committed and tagged ${tag}.`);
console.log('Nothing has been pushed. When you are ready:');
console.log(`  git push origin main ${tag}`);
