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

class AttendanceDatabase extends Dexie {
  absensi!: Table<AbsensiRecord>;
  schedules!: Table<ScheduleRecord>;

  constructor() {
    super('AttendanceDatabase');
    this.version(2).stores({
      absensi: '++id, tanggal, createdAt',
      schedules: '++id, tanggal, waktu, notified'
    });
  }
}

export const db = new AttendanceDatabase();
