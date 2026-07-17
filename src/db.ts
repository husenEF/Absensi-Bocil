import Dexie, { type Table } from 'dexie';

export interface AbsensiRecord {
  id?: number;
  tanggal: string; // "YYYY-MM-DD"
  peserta: string[]; // List of names
  scheduleId?: number; // Optional reference to connected weekly schedule
  createdAt: number;
}

export interface ScheduleRecord {
  id?: number;
  title: string;
  tanggal?: string; // "YYYY-MM-DD" - kept optional for backward compatibility
  hari: string; // "Senin", "Selasa", etc.
  waktu: string; // "HH:MM"
  linkMeet?: string; // kept optional
  remindMinutesBefore: number; // minutes before start to remind: 0, 5, 10, 15, 30, etc.
  notified?: boolean; // track if reminder was triggered
  lastNotifiedDate?: string; // "YYYY-MM-DD" to avoid double triggers in the same week
  createdAt: number;
}

export interface ExcelReportRecord {
  id?: number;
  periodKey: string; // e.g. "2026-2"
  guruName: string;
  kitabName: string;
  catatan: string;
  tanggalAktif: string;
  weeks: string[]; // e.g. ["20-26 Jun", "27 Jun - 3 Jul", ...]
  studentsData: Array<{
    name: string;
    category: 'K' | 'P';
    attendance: string[]; // parallel to weeks
    pendampingan: string;
    hs: string;
    jm: string;
    sppKeterangan: string; // V, T, S, I, A
    sppNominal: number;
    buletinCetak: boolean;
    buletinDigital: boolean;
  }>;
  createdAt: number;
}

class AttendanceDatabase extends Dexie {
  absensi!: Table<AbsensiRecord>;
  schedules!: Table<ScheduleRecord>;
  excelReports!: Table<ExcelReportRecord>;

  constructor() {
    super('AttendanceDatabase');
    this.version(3).stores({
      absensi: '++id, tanggal, createdAt',
      schedules: '++id, tanggal, waktu, notified',
      excelReports: '++id, periodKey'
    });
  }
}

export const db = new AttendanceDatabase();

/**
 * Automatically scans the browser's IndexedDB origin for legacy or previous
 * database installations (e.g. from older versions, older app names like AbsenBocil,
 * or previous version schemas) and securely merges records into the active database.
 */
export async function checkForAndMigratePreviousDatabases(
  onSuccess: (message: string) => void
) {
  if (typeof indexedDB === 'undefined') return;

  let dbNames: string[] = [];
  if (indexedDB.databases) {
    try {
      const dbs = await indexedDB.databases();
      dbNames = dbs.map(d => d.name).filter(Boolean) as string[];
    } catch (e) {
      console.error('Error listing databases via indexedDB.databases():', e);
    }
  }

  // Fallback and candidate previous database names used by older versions
  const candidates = [
    'AbsenBocilDatabase',
    'AbsenBocil',
    'absenbocil',
    'AbsensiDatabase',
    'AttendanceDatabase_v2',
    'AttendanceDatabase_v1',
    'absenbocil_db',
    'class_sync_db',
    'ClassSyncDatabase'
  ];

  candidates.forEach(name => {
    if (!dbNames.includes(name)) {
      dbNames.push(name);
    }
  });

  // Filter out the active database to prevent self-recursion
  dbNames = dbNames.filter(name => name !== 'AttendanceDatabase');

  for (const oldDbName of dbNames) {
    // Skip if already migrated previously to avoid redundant checks
    if (localStorage.getItem(`migrated_from_db_${oldDbName}`) === 'true') {
      continue;
    }

    try {
      await new Promise<void>((resolve) => {
        const openReq = indexedDB.open(oldDbName);
        let isNew = false;

        openReq.onupgradeneeded = () => {
          isNew = true; // Indicates database did not exist previously
        };

        openReq.onerror = () => {
          resolve(); // Resolve silently on permission/blocked errors
        };

        openReq.onsuccess = async () => {
          const oldDbInstance = openReq.result;

          if (isNew) {
            // Clean up empty newly-created dummy database immediately
            oldDbInstance.close();
            try {
              indexedDB.deleteDatabase(oldDbName);
            } catch (e) {
              console.error('Error deleting dummy db:', e);
            }
            resolve();
            return;
          }

          // Inspect stores inside the old database
          const storeNames = Array.from(oldDbInstance.objectStoreNames);
          const hasAbsensi = storeNames.includes('absensi');
          const hasSchedules = storeNames.includes('schedules');
          const hasExcelReports = storeNames.includes('excelReports');

          // If no relevant tables, just close and skip
          if (!hasAbsensi && !hasSchedules && !hasExcelReports) {
            oldDbInstance.close();
            resolve();
            return;
          }

          // Dynamically instantiate Dexie to safely fetch and map records
          const dexieOldDb = new Dexie(oldDbName);
          const storesObj: Record<string, string> = {};
          if (hasAbsensi) storesObj['absensi'] = '++id, tanggal, createdAt';
          if (hasSchedules) storesObj['schedules'] = '++id, tanggal, waktu, notified';
          if (hasExcelReports) storesObj['excelReports'] = '++id, periodKey';

          dexieOldDb.version(oldDbInstance.version || 1).stores(storesObj);

          try {
            await dexieOldDb.open();

            let migratedAbsensiCount = 0;
            let migratedSchedulesCount = 0;
            let migratedReportsCount = 0;

            // 1. Process Absensi Records
            if (hasAbsensi) {
              const oldAbsensi = await dexieOldDb.table('absensi').toArray();
              for (const item of oldAbsensi) {
                const existing = await db.absensi.where('tanggal').equals(item.tanggal).first();
                if (!existing) {
                  const { id, ...cleanItem } = item;
                  await db.absensi.add(cleanItem);
                  migratedAbsensiCount++;
                } else {
                  // Merge student names dynamically to preserve records
                  const combinedNames = Array.from(new Set([...(existing.peserta || []), ...(item.peserta || [])]));
                  if (combinedNames.length > existing.peserta.length) {
                    await db.absensi.update(existing.id!, { peserta: combinedNames });
                    migratedAbsensiCount++;
                  }
                }
              }
            }

            // 2. Process Schedules
            if (hasSchedules) {
              const oldSchedules = await dexieOldDb.table('schedules').toArray();
              for (const item of oldSchedules) {
                const existing = await db.schedules.where('waktu').equals(item.waktu).toArray();
                const isDuplicate = existing.some(s => s.title === item.title && s.hari === item.hari);
                if (!isDuplicate) {
                  const { id, ...cleanItem } = item;
                  await db.schedules.add(cleanItem);
                  migratedSchedulesCount++;
                }
              }
            }

            // 3. Process Excel Worksheet Drafts
            if (hasExcelReports) {
              const oldReports = await dexieOldDb.table('excelReports').toArray();
              for (const item of oldReports) {
                const existing = await db.excelReports.where('periodKey').equals(item.periodKey).toArray();
                const isDuplicate = existing.some(r => r.guruName === item.guruName && r.kitabName === item.kitabName);
                if (!isDuplicate) {
                  const { id, ...cleanItem } = item;
                  await db.excelReports.add(cleanItem);
                  migratedReportsCount++;
                }
              }
            }

            if (migratedAbsensiCount > 0 || migratedSchedulesCount > 0 || migratedReportsCount > 0) {
              onSuccess(`Berhasil memulihkan & migrasi data dari versi lama (${oldDbName}): ${migratedAbsensiCount} absensi, ${migratedSchedulesCount} jadwal, ${migratedReportsCount} draf laporan.`);
            }

            // Record successful migration to localStorage
            localStorage.setItem(`migrated_from_db_${oldDbName}`, 'true');

          } catch (err) {
            console.error(`Error processing dynamic migration for ${oldDbName}:`, err);
          } finally {
            dexieOldDb.close();
            oldDbInstance.close();
            resolve();
          }
        };
      });
    } catch (e) {
      console.log(`Failed opening candidate db ${oldDbName} for check:`, e);
    }
  }
}
