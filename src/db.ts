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
