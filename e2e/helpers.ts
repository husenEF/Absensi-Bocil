import {expect, type Locator, type Page} from '@playwright/test';

export const ROSTER = [
  'Ahmad Fauzi',
  'Aisyah Putri',
  'Budi Santoso',
  'Dewi Lestari',
  'Fatimah Zahra',
  'Hasan Basri',
  'Ibrahim Malik',
  'Khadijah Nur',
  'Nabila Syifa',
];

export type SeedOptions = {
  roster?: string[];
  schedules?: Array<{title: string; hari: string; waktu: string}>;
};

/**
 * Put a class into the browser's own database, the way a teacher who has been
 * using the app for a term would already have one.
 *
 * The app stores everything locally and talks to no server, so there is no API
 * to seed through — the fixture goes straight into IndexedDB, then the page is
 * reloaded so the provider reads it on mount.
 *
 * The wait before writing matters: each test gets a clean browser context, so
 * the database does not exist until the app's own Dexie opens it and creates
 * the stores. Writing first opens a version-0 database with no stores at all,
 * and the transaction then throws somewhere nothing is listening.
 */
export async function seed(page: Page, options: SeedOptions = {}) {
  const roster = options.roster ?? ROSTER;
  const schedules = options.schedules ?? [
    {title: 'Ngaji Pagi', hari: 'Senin', waktu: '07:00'},
    {title: 'Tahfidz Sore', hari: 'Rabu', waktu: '16:00'},
  ];

  await page.goto('/');
  await page.locator('.cs-tabs').waitFor({state: 'visible'});

  const result = await page.evaluate(
    async ({roster, schedules}) => {
      // A preview service worker will happily serve a stale bundle between
      // runs, which makes a failure look like a product bug.
      for (const key of await caches.keys()) await caches.delete(key);
      for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister();

      const stores = ['students', 'schedules', 'absensi'];

      // Wait for the app's own Dexie to have created the stores.
      const deadline = Date.now() + 10_000;
      for (;;) {
        const ready = await new Promise<boolean>((resolve) => {
          const probe = indexedDB.open('AttendanceDatabase');
          probe.onsuccess = () => {
            const db = probe.result;
            const ok = stores.every((s) => db.objectStoreNames.contains(s));
            db.close();
            resolve(ok);
          };
          probe.onerror = () => resolve(false);
        });
        if (ready) break;
        if (Date.now() > deadline) return 'timed out waiting for the database';
        await new Promise((r) => setTimeout(r, 100));
      }

      return await new Promise<string>((resolve) => {
        const request = indexedDB.open('AttendanceDatabase');
        request.onerror = () => resolve('could not open the database');
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(stores, 'readwrite');
          tx.onerror = () => resolve(`seed transaction failed: ${tx.error?.message}`);

          const students = tx.objectStore('students');
          const scheduleStore = tx.objectStore('schedules');
          const absensi = tx.objectStore('absensi');

          students.clear();
          scheduleStore.clear();
          absensi.clear();

          for (const name of roster) {
            students.add({name, nameKey: name.toLowerCase(), active: true, createdAt: Date.now()});
          }
          for (const s of schedules) {
            scheduleStore.add({...s, remindMinutesBefore: 10, createdAt: Date.now()});
          }

          tx.oncomplete = () => {
            db.close();
            resolve('ok');
          };
        };
      });
    },
    {roster, schedules},
  );

  // A silent seed failure shows up later as a baffling empty screen, so it is
  // reported here instead.
  expect(result, 'seeding the local database').toBe('ok');

  await page.reload();
  await expect(page.locator('.cs-roster__row')).toHaveCount(roster.length);
}

/** One santri's row in the register. */
export function rowFor(page: Page, name: string): Locator {
  return page.locator('.cs-roster__row').filter({hasText: name});
}

/**
 * One of the four marks in a row.
 *
 * The radio itself is visually hidden — the label carries the letter and the
 * 48px target — so this returns the label, which is what a finger or a mouse
 * actually hits.
 */
export function markFor(page: Page, name: string, status: Status): Locator {
  return rowFor(page, name).locator('label.cs-status__opt').filter({hasText: status});
}

export type Status = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';

/** Give one santri a mark. */
export async function mark(page: Page, name: string, status: Status) {
  await markFor(page, name, status).click();
}

/** Whether a santri currently carries a given mark. */
export function markRadio(page: Page, name: string, status: Status): Locator {
  return rowFor(page, name).getByRole('radio', {name: status});
}

/**
 * Put the keyboard focus on a control, the way a keyboard user would.
 *
 * `locator.focus()` alone is not enough: Chromium only matches
 * `:focus-visible` when focus arrived from the keyboard, so a programmatic
 * focus on a button reports no ring at all and the assertion is meaningless.
 * Tabbing away and straight back lands on the same control through a real key
 * press.
 */
export async function focusByKeyboard(page: Page, control: Locator) {
  await control.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(control).toBeFocused();
}

/**
 * The panel that appears in place after a save.
 *
 * Matched by its own container rather than by its words: "Presensi tersimpan"
 * is also the opening of the storage notice and of the toast, and a bare text
 * match picks up all three.
 */
export function savedConfirmation(page: Page): Locator {
  return page.locator('.cs-card--success');
}

/** Every session currently in the local database. */
export async function savedSessions(page: Page) {
  return page.evaluate(async () => {
    const request = indexedDB.open('AttendanceDatabase');
    const db = await new Promise<IDBDatabase>((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
    const tx = db.transaction('absensi', 'readonly');
    const all = await new Promise<any[]>((resolve) => {
      const query = tx.objectStore('absensi').getAll();
      query.onsuccess = () => resolve(query.result);
    });
    db.close();
    return all;
  });
}
