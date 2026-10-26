/**
 * The roster and per-santri attendance statuses.
 *
 * Kept separate from db.ts so the logic can be unit-tested without Dexie, and
 * so the migration from the old "list of names who were present" shape lives in
 * one readable place.
 *
 * Backward compatibility rule: `AbsensiRecord.peserta` stays authoritative for
 * who was present. `statuses` is added alongside it, never instead of it, so an
 * older build reading the same database still works and every existing export
 * keeps producing the same output.
 */

import type {StatusKey} from './styles/palette';

export type {StatusKey};

/**
 * There is no default status.
 *
 * A register that starts everyone at Hadir records a class the teacher never
 * looked at: tap Save on an untouched screen and eighteen santri are filed as
 * present. Nothing is marked until someone marks it, and an unmarked santri is
 * saved as unmarked rather than guessed at.
 */
export const NO_STATUS = undefined;

/** Status per santri name, keyed by the normalised name. Absent key = unmarked. */
export type StatusMap = Record<string, StatusKey>;

export type StudentRecord = {
  id?: number;
  /** Display name, title-cased. */
  name: string;
  /** Lower-cased name used for matching and de-duplication. */
  nameKey: string;
  /** Inactive santri stay in history but are not offered for new sessions. */
  active: boolean;
  createdAt: number;
};

/** Title Case each word, as the app has always done on save. */
export function capitalizeWords(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

/** The key a name is matched on: case- and whitespace-insensitive. */
export function nameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Split the comma-separated entry box into clean names. */
export function parseNameList(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of input.split(',')) {
    const name = capitalizeWords(raw);
    if (!name) continue;
    const key = nameKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }

  return out;
}

/**
 * The statuses to save for a session.
 *
 * Only santri the teacher actually marked appear. Names on the roster that
 * were left alone are omitted, so the saved record says "we do not know"
 * rather than inventing a Hadir.
 */
export function buildStatusMap(
  rosterNames: readonly string[],
  existing?: StatusMap,
): StatusMap {
  // Start from what is already recorded. A santri can have a status without
  // being on the current roster — they were only ever absent, or they came in
  // with imported data — and dropping those entries here silently erased the
  // absences on the next save.
  const out: StatusMap = {};
  for (const [key, status] of Object.entries(existing ?? {})) {
    if (key && status) out[key] = status;
  }
  for (const name of rosterNames) {
    const key = nameKey(name);
    const status = existing?.[key];
    if (status) out[key] = status;
  }
  return out;
}

/** Roster names the teacher has not marked yet, in roster order. */
export function unmarkedNames(
  rosterNames: readonly string[],
  statuses: StatusMap,
): string[] {
  return rosterNames.filter((n) => !statuses[nameKey(n)]);
}

/** The names marked present, in roster order — what `peserta` must contain. */
export function presentNames(
  rosterNames: readonly string[],
  statuses: StatusMap,
): string[] {
  return rosterNames.filter((n) => statuses[nameKey(n)] === 'hadir');
}

export type StatusTally = Record<StatusKey, number>;

export function tally(statuses: StatusMap): StatusTally {
  const out: StatusTally = {hadir: 0, sakit: 0, izin: 0, alpa: 0};
  for (const status of Object.values(statuses)) {
    out[status] = (out[status] ?? 0) + 1;
  }
  return out;
}

/**
 * Statuses for a record saved before the roster existed.
 *
 * Such a record only knows who was present, so those names become Hadir and
 * nobody else is mentioned — inventing absences for the rest of the roster
 * would be putting words in the teacher's mouth.
 */
export function statusesFromPeserta(peserta: readonly string[]): StatusMap {
  const out: StatusMap = {};
  for (const name of peserta) {
    const key = nameKey(name);
    if (key) out[key] = 'hadir';
  }
  return out;
}

/** Every distinct santri across all records, ready to seed the roster. */
export function rosterFromRecords(
  records: ReadonlyArray<{peserta: string[]; statuses?: StatusMap}>,
): Array<{name: string; nameKey: string}> {
  const byKey = new Map<string, string>();

  for (const record of records) {
    for (const raw of record.peserta ?? []) {
      const name = capitalizeWords(raw);
      const key = nameKey(name);
      if (key && !byKey.has(key)) byKey.set(key, name);
    }

    // A santri who was absent every time appears in no `peserta` at all, so
    // reading only that list loses them from the roster entirely — and then
    // they can never be marked absent again.
    for (const key of Object.keys(record.statuses ?? {})) {
      if (key && !byKey.has(key)) byKey.set(key, capitalizeWords(key));
    }
  }

  return [...byKey.entries()]
    .map(([key, name]) => ({name, nameKey: key}))
    .sort((a, b) => a.name.localeCompare(b.name, 'id'));
}

/**
 * Escape a string for the Excel export, which builds HTML by interpolation.
 * Without this a santri called "Budi & Ani" corrupts the file.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
