import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { db, upsertStudent, AbsensiRecord, ScheduleRecord, StudentRecord, checkForAndMigratePreviousDatabases } from '../db';
import { buildStatusMap, nameKey, parseNameList, presentNames, rosterFromRecords, participantLine, statusesFromPeserta, tally, unmarkedNames, type StatusKey, type StatusMap, type StatusTally } from '../roster';
import { formatIndonesianDate, formatDateShort } from '../utils/date';
import { biMonthlyWeeks, getBiMonthlyLabel, getRecordBiMonth, todayYMD } from '../utils/period';

interface BiMonthlyPeriod {
  year: number;
  blockIndex: number;
  label: string;
  key: string;
}

interface AppContextType {
  // Navigation & UI
  activeTab: 'input' | 'riwayat' | 'laporan' | 'jadwal' | 'sinkronisasi';
  setActiveTab: (tab: 'input' | 'riwayat' | 'laporan' | 'jadwal' | 'sinkronisasi') => void;
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  toast: ToastState | null;
  showToast: (message: string, type: 'success' | 'error' | 'info', action?: ToastAction) => void;
  dismissToast: () => void;
  onlineStatus: boolean;
  deferredPrompt: any;
  executePWAPrompt: () => void;
  hideDbNotice: boolean;
  setHideDbNotice: (val: boolean) => void;
  handleDismissDbNotice: () => void;
  hideWeekReminder: boolean;
  setHideWeekReminder: (val: boolean) => void;
  handleDismissWeekReminder: () => void;
  todayIsThirdWeek: boolean;

  // Database lists
  records: AbsensiRecord[];
  schedules: ScheduleRecord[];
  loading: boolean;
  loadRecords: () => Promise<void>;
  loadSchedules: () => Promise<void>;

  // Input States & Handlers
  tanggalInput: string;
  setTanggalInput: (val: string) => void;
  namesInput: string;
  setNamesInput: (val: string) => void;
  selectedScheduleId: number | undefined;
  setSelectedScheduleId: (val: number | undefined) => void;
  lastAttendanceForSchedule: string[];
  currentActiveNames: string[];
  allRegisteredStudents: string[];
  students: StudentRecord[];
  sessionStatusFor: (studentName: string) => StatusKey | undefined;
  setSessionStatus: (studentName: string, status: StatusKey) => void;
  handleMarkAllPresent: () => void;
  handleClearSession: () => void;
  sessionTally: StatusTally;
  /** Roster santri nobody has marked yet. */
  untouchedCount: number;
  markedCount: number;
  handleAddStudent: (rawName: string) => Promise<boolean>;
  lastSaved: { tanggal: string; tally: StatusTally } | null;
  dismissLastSaved: () => void;
  handleToggleStudent: (studentName: string) => void;
  isStudentSelected: (studentName: string) => boolean;
  handleSaveAttendance: (e: React.FormEvent) => Promise<void>;

  // Editing States & Handlers
  editingId: number | null;
  setEditingId: (val: number | null) => void;
  editingNames: string;
  setEditingNames: (val: string) => void;
  editingTanggal: string;
  setEditingTanggal: (val: string) => void;
  editingScheduleId: number | undefined;
  setEditingScheduleId: (val: number | undefined) => void;
  startEditing: (record: AbsensiRecord) => void;
  cancelEditing: () => void;
  saveEditedRecord: (id: number) => Promise<void>;
  handleDeleteRecord: (id: number, tanggal: string) => Promise<void>;
  handleClearAllRecords: () => Promise<void>;

  // Schedules States & Handlers
  scheduleTitle: string;
  setScheduleTitle: (val: string) => void;
  scheduleHari: string;
  setScheduleHari: (val: string) => void;
  scheduleWaktu: string;
  setScheduleWaktu: (val: string) => void;
  scheduleRemindMinutesBefore: number;
  setScheduleRemindMinutesBefore: (val: number) => void;
  handleAddSchedule: (e: React.FormEvent) => Promise<void>;
  handleDeleteSchedule: (id: number, title: string) => Promise<void>;
  requestNotificationPermission: () => void;

  // Sync / Backups States & Handlers
  syncHashOutput: string;
  setSyncHashOutput: (val: string) => void;
  syncInputText: string;
  setSyncInputText: (val: string) => void;
  showQrModal: boolean;
  setShowQrModal: (val: boolean) => void;
  generatedQrUrl: string;
  setGeneratedQrUrl: (val: string) => void;
  isScanning: boolean;
  setIsScanning: (val: boolean) => void;
  scanError: string;
  setScanError: (val: string) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  handleGenerateSyncHash: () => Promise<void>;
  handleImportSyncHash: () => Promise<void>;
  startCameraScanner: () => Promise<void>;
  stopCameraScanner: () => void;
  handleGenerateQrCode: () => Promise<void>;
  handleCopyDirectSyncLink: () => Promise<void>;
  handleSmartMergeImport: (jsonData: any) => Promise<void>;
  pendingImport: PendingImport | null;
  confirmPendingImport: () => Promise<void>;
  cancelPendingImport: () => void;
  pendingOverwrite: PendingOverwrite | null;
  confirmOverwrite: () => Promise<void>;
  cancelOverwrite: () => void;
  handleFullBackupExport: () => Promise<void>;
  handleLoadSampleData: () => Promise<void>;

  // Report Generator States & Handlers
  selectedPeriodKey: string;
  setSelectedPeriodKey: (val: string) => void;
  reportScheduleFilter: string;
  setReportScheduleFilter: (val: string) => void;
  reportSelectedRecordIds: number[];
  setReportSelectedRecordIds: React.Dispatch<React.SetStateAction<number[]>>;
  reportText: string;
  setReportText: (val: string) => void;
  reportGenerated: boolean;
  setReportGenerated: (val: boolean) => void;
  copied: boolean;
  availablePeriods: BiMonthlyPeriod[];
  currentPeriod: BiMonthlyPeriod | undefined;
  recordsInSelectedPeriod: AbsensiRecord[];
  filteredRecordsForReport: AbsensiRecord[];
  bimonthlyWeeks: { id: number; title: string; start: string; end: string; isWeek1: boolean }[];
  handleGenerateReport: () => void;
  handleCopyReport: () => Promise<void>;
  reportTextareaRef: React.RefObject<HTMLTextAreaElement | null>;

  // Selection / General helpers
  selectedRecordIds: number[];
  setSelectedRecordIds: React.Dispatch<React.SetStateAction<number[]>>;
  handleToggleSelectRecord: (id: number) => void;
  handleSelectAllRecords: () => void;
  handleDeselectAllRecords: () => void;
  handleExportCSV: () => void;
  handleExportJSON: () => void;
  handleCopySelectedCSV: () => void;

  // Utility
  capitalizeWords: (str: string) => string;
}

/** Beyond this a QR stops being reliably scannable from another screen. */
export const QR_SAFE_CHARS = 1200;

export type ToastAction = { label: string; onAction: () => void };
export type PendingImport = { data: any; sessions: number; schedules: number };

export type PendingOverwrite = {
  existingId: number;
  tanggal: string;
  existingCount: number;
  peserta: string[];
  statuses: StatusMap;
  scheduleId?: number;
};

export type ToastState = {
  message: string;
  type: 'success' | 'error' | 'info';
  action?: ToastAction;
};

const AppContext = createContext<AppContextType | undefined>(undefined);


export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Active Tab navigation
  const [activeTab, setActiveTab] = useState<'input' | 'riwayat' | 'laporan' | 'jadwal' | 'sinkronisasi'>('input');

  // Theme states
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme-mode');
    return saved === 'dark';
  });

  // Today's date, in local time. toISOString() is UTC, which gave the wrong
  // day to anyone west of UTC and to WIB users before 07:00.
  const [tanggalInput, setTanggalInput] = useState<string>(() => todayYMD());
  const [namesInput, setNamesInput] = useState<string>('');

  // Linked Schedule
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | undefined>(undefined);
  const [lastAttendanceForSchedule, setLastAttendanceForSchedule] = useState<string[]>([]);

  // Records & schedules fetched
  const [records, setRecords] = useState<AbsensiRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [sessionStatuses, setSessionStatuses] = useState<StatusMap>({});
  const [touchedStudents, setTouchedStudents] = useState<Set<string>>(new Set());
  const [lastSaved, setLastSaved] = useState<{ tanggal: string; tally: StatusTally } | null>(null);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load last attendance lists when linked schedule changes
  useEffect(() => {
    if (selectedScheduleId) {
      db.absensi.where('scheduleId').equals(selectedScheduleId).reverse().sortBy('tanggal')
        .then(res => {
          if (res && res.length > 0) {
            setLastAttendanceForSchedule(res[0].peserta);
          } else {
            setLastAttendanceForSchedule([]);
          }
        })
        .catch(err => {
          console.error('[Load previous names error]', err);
          setLastAttendanceForSchedule([]);
        });
    } else {
      setLastAttendanceForSchedule([]);
    }
  }, [selectedScheduleId, records]);

  // Editing values
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNames, setEditingNames] = useState<string>('');
  const [editingTanggal, setEditingTanggal] = useState<string>('');
  const [editingScheduleId, setEditingScheduleId] = useState<number | undefined>(undefined);

  // Selected arrays for Bulk Tools
  const [selectedRecordIds, setSelectedRecordIds] = useState<number[]>([]);

  // Selection states for Report Generator
  const [reportSelectedRecordIds, setReportSelectedRecordIds] = useState<number[]>([]);
  const [reportScheduleFilter, setReportScheduleFilter] = useState<string>('all');
  const [reportText, setReportText] = useState<string>('');
  const [reportGenerated, setReportGenerated] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('');

  // Setup PWA install promotion states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [onlineStatus, setOnlineStatus] = useState<boolean>(navigator.onLine);

  // Notices
  const [hideDbNotice, setHideDbNotice] = useState<boolean>(() => localStorage.getItem('hide_db_notice_v3') === 'true');
  const [hideWeekReminder, setHideWeekReminder] = useState<boolean>(() => localStorage.getItem('hide_week_reminder_v3') === 'true');

  // Sync and scanning
  const [syncHashOutput, setSyncHashOutput] = useState<string>('');
  const [syncInputText, setSyncInputText] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [generatedQrUrl, setGeneratedQrUrl] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Toasts
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [pendingOverwrite, setPendingOverwrite] = useState<PendingOverwrite | null>(null);
  const toastTimer = useRef<number | null>(null);
  const restoringRef = useRef(false);

  // New Schedules Form States
  const [scheduleTitle, setScheduleTitle] = useState<string>('');
  const [scheduleHari, setScheduleHari] = useState<string>('Senin');
  const [scheduleWaktu, setScheduleWaktu] = useState<string>('19:00');
  const [scheduleRemindMinutesBefore, setScheduleRemindMinutesBefore] = useState<number>(15);

  const reportTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fast trigger helper: toast notifications
  /**
   * A toast, optionally carrying one action.
   *
   * An undo action gets a longer life than a plain message: a toast that
   * disappears before the teacher has read it is not an undo at all.
   */
  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info',
    action?: ToastAction
  ) => {
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
    }
    setToast({ message, type, action });
    toastTimer.current = window.setTimeout(
      () => setToast(null),
      action ? 9000 : 4000
    );
  };

  const dismissToast = () => {
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
    }
    setToast(null);
  };

  // online monitoring
  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Set up PWA installation hook
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Read entire records from DB
  /**
   * Make sure every santri named in a record exists on the roster.
   *
   * The v4 upgrade seeds the roster once, but records also arrive later —
   * from a QR or file sync, from the sample data, or from a backup import —
   * and those paths write attendance without touching the roster. Reconciling
   * on load keeps the two in step however the data got here.
   */
  const reconcileRoster = async (fromRecords: AbsensiRecord[]) => {
    try {
      const existing = await db.students.toArray();
      const known = new Set(existing.map(s => s.nameKey));
      const missing = rosterFromRecords(fromRecords).filter(s => !known.has(s.nameKey));

      if (missing.length === 0) return existing;

      const now = Date.now();
      await db.students.bulkAdd(
        missing.map(s => ({ name: s.name, nameKey: s.nameKey, active: true, createdAt: now }))
      );
      return db.students.toArray();
    } catch (err) {
      console.error('[Reconcile roster error]', err);
      return db.students.toArray();
    }
  };

  const loadStudents = async (fromRecords?: AbsensiRecord[]) => {
    try {
      const all = fromRecords
        ? await reconcileRoster(fromRecords)
        : await db.students.toArray();
      setStudents(all);
    } catch (err) {
      console.error('[Load students error]', err);
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await db.absensi.orderBy('tanggal').reverse().toArray();
      setRecords(data);
      // Keep the roster in step with whatever records just arrived.
      await loadStudents(data);
      // Clean up selections that might have been deleted
      const existingIds = data.map(d => d.id).filter(Boolean) as number[];
      setSelectedRecordIds(prev => prev.filter(id => existingIds.includes(id)));
    } catch (error) {
      console.error('Failed to load records from IndexedDB:', error);
      showToast('Tidak dapat memuat data dari ponsel ini.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get list of schedules
  const loadSchedules = async () => {
    try {
      const data = await db.schedules.toArray();
      const INDO_DAYS_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      data.sort((a, b) => {
        const dayA = a.hari ? INDO_DAYS_ORDER.indexOf(a.hari) : -1;
        const dayB = b.hari ? INDO_DAYS_ORDER.indexOf(b.hari) : -1;

        if (dayA !== dayB) {
          if (dayA === -1) return 1;
          if (dayB === -1) return -1;
          return dayA - dayB;
        }

        const timeComp = (a.waktu || '').localeCompare(b.waktu || '');
        if (timeComp !== 0) return timeComp;

        const dateA = a.tanggal || '';
        const dateB = b.tanggal || '';
        return dateA.localeCompare(dateB);
      });
      setSchedules(data);
    } catch (error) {
      console.error('Failed to load schedules from IndexedDB:', error);
    }
  };

  // Smart Sync Merge Import Function
  /**
   * Stage an incoming dataset and ask before merging.
   *
   * Scanning a QR, pasting a code or picking a backup file all used to merge
   * straight into the teacher's database with no confirmation and no way back.
   */
  const handleSmartMergeImport = async (jsonData: any) => {
    if (!jsonData || jsonData.app !== 'ClassSync') {
      showToast('Berkas ini bukan cadangan ClassSync.', 'error');
      return;
    }

    setPendingImport({
      data: jsonData,
      sessions: Array.isArray(jsonData.absensi) ? jsonData.absensi.length : 0,
      schedules: Array.isArray(jsonData.schedules) ? jsonData.schedules.length : 0
    });
  };

  const cancelPendingImport = () => setPendingImport(null);

  const confirmPendingImport = async () => {
    const staged = pendingImport;
    setPendingImport(null);
    if (!staged) return;
    await applySmartMergeImport(staged.data);
  };

  const applySmartMergeImport = async (jsonData: any) => {
    // Bring the roster across first, so santri who were absent in every
    // session still exist on the receiving phone.
    if (Array.isArray(jsonData.students)) {
      for (const incoming of jsonData.students) {
        const key = incoming?.nameKey ?? nameKey(incoming?.name ?? '');
        if (!key) continue;
        const found = await db.students.where('nameKey').equals(key).first();
        if (!found) {
          await db.students.add({
            name: incoming.name ?? key,
            nameKey: key,
            active: incoming.active !== false,
            createdAt: incoming.createdAt ?? Date.now()
          });
        }
      }
    }

    try {
      if (!jsonData || jsonData.app !== 'ClassSync') {
        showToast('Berkas ini bukan cadangan ClassSync.', 'error');
        return;
      }

      let mergedAbsensiCount = 0;
      let mergedSchedulesCount = 0;
      const scheduleIdMap = new Map<number, number>();

      // 1. Process Schedules
      const allLocalSchedules = await db.schedules.toArray();
      if (Array.isArray(jsonData.schedules)) {
        for (const s of jsonData.schedules) {
          const match = allLocalSchedules.find(item =>
            item.hari === s.hari &&
            item.waktu === s.waktu &&
            item.title === s.title
          );

          if (match) {
            if (s.id && match.id) {
              scheduleIdMap.set(s.id, match.id);
            }
          } else {
            const { id: oldId, ...cleanSchedule } = s;
            const newId = await db.schedules.add(cleanSchedule);
            mergedSchedulesCount++;
            if (oldId) {
              scheduleIdMap.set(oldId, newId);
            }
          }
        }
      }

      // Populate any remaining mappings
      const updatedLocalSchedules = await db.schedules.toArray();
      if (Array.isArray(jsonData.schedules)) {
        for (const s of jsonData.schedules) {
          if (s.id && !scheduleIdMap.has(s.id)) {
            const match = updatedLocalSchedules.find(item =>
              item.hari === s.hari &&
              item.waktu === s.waktu &&
              item.title === s.title
            );
            if (match && match.id) {
              scheduleIdMap.set(s.id, match.id);
            }
          }
        }
      }

      // 2. Process Absensi Records
      if (Array.isArray(jsonData.absensi)) {
        for (const r of jsonData.absensi) {
          const localScheduleId = r.scheduleId ? scheduleIdMap.get(r.scheduleId) : undefined;
          const existingOfDate = await db.absensi.where('tanggal').equals(r.tanggal).toArray();
          const existing = existingOfDate.find(item => item.scheduleId === localScheduleId);

          if (existing) {
            const combinedNames = Array.from(new Set([...existing.peserta, ...r.peserta]));
            if (combinedNames.length > existing.peserta.length) {
              // Statuses have to follow the names, or the history screen and
              // the report end up disagreeing about the same child.
              const mergedStatuses: StatusMap = {
                ...(existing.statuses ?? {}),
                ...((r as AbsensiRecord).statuses ?? {})
              };
              for (const name of combinedNames) {
                mergedStatuses[nameKey(name)] = 'hadir';
              }
              await db.absensi.update(existing.id!, {
                peserta: combinedNames,
                statuses: mergedStatuses
              });
              mergedAbsensiCount++;
            }
          } else {
            const { id, ...cleanRecord } = r;
            if (!cleanRecord.statuses) {
              cleanRecord.statuses = statusesFromPeserta(cleanRecord.peserta ?? []);
            }
            if (localScheduleId !== undefined) {
              cleanRecord.scheduleId = localScheduleId;
            }
            await db.absensi.add(cleanRecord);
            mergedAbsensiCount++;
          }
        }
      }

      showToast(`Sinkronisasi Berhasil! ${mergedSchedulesCount} jadwal ditambahkan & ${mergedAbsensiCount} nama presensi digabungkan secara pintar tanpa duplikasi.`, 'success');

      // Reload
      loadRecords();
      loadSchedules();
    } catch (err) {
      console.error('[Smart Merge Error]', err);
      showToast('Gagal memproses sinkronisasi data.', 'error');
    }
  };

  // Seed on mount
  useEffect(() => {
    // Check for and migrate legacy database instances if present in the browser origin
    checkForAndMigratePreviousDatabases((successMsg) => {
      showToast(successMsg, 'success');
      loadRecords();
      loadSchedules();
    }).catch(err => {
      console.error('[Migration check error]', err);
    });

    loadRecords();
    loadSchedules();
    loadStudents();

    const urlParams = new URLSearchParams(window.location.search);
    const syncToken = urlParams.get('sync');
    if (syncToken) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      setTimeout(() => {
        // Staged rather than merged: the confirmation dialog shows what is in
        // the link before any of it touches the teacher's data.
        try {
          const decodedString = decodeURIComponent(escape(atob(syncToken)));
          const jsonData = JSON.parse(decodedString);
          handleSmartMergeImport(jsonData);
        } catch (err) {
          console.error('[Decode Sync URL Param Error]', err);
          showToast('Tautan sinkronisasi rusak atau tidak terbaca.', 'error');
        }
      }, 800);
    }
  }, []);

  // Request browser desktop notifications
  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showToast('Notifikasi desktop berhasil diizinkan!', 'success');
        } else {
          showToast('Izin notifikasi ditolak. Pengingat web tetap aktif.', 'info');
        }
      });
    } else {
      showToast('Browser Anda tidak mendukung Notifikasi Desktop.', 'info');
    }
  };

  // Sound chime synthesizer and Notification dispatch
  const triggerNotification = (title: string, bodyText: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body: bodyText, icon: '/favicon.ico' });
      } catch (e) {
        console.error('HTML5 Notification error:', e);
      }
    }
    showToast(`${title}: ${bodyText}`, 'info');

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.35);
      }
    } catch (e) {
      console.log('Audio Context chime error ignored:', e);
    }
  };

  // Periodic Reminder Checker
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = new Date();
      schedules.forEach(async (sched) => {
        if (sched.hari) {
          const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
          const dayIndex = INDO_DAYS.indexOf(sched.hari);
          if (dayIndex === -1) return;

          if (sched.notified && now.getDay() !== dayIndex && sched.id) {
            await db.schedules.update(sched.id, { notified: false });
            loadSchedules();
            return;
          }

          if (now.getDay() !== dayIndex) return;

          const [h, m] = sched.waktu.split(':').map(Number);
          const schedTime = new Date(now);
          schedTime.setHours(h, m, 0, 0);

          const todayDateString = now.toLocaleDateString('sv');
          if (sched.lastNotifiedDate === todayDateString) return;

          const reminderThresholdMs = (sched.remindMinutesBefore || 0) * 60 * 1000;
          const targetAlertTime = new Date(schedTime.getTime() - reminderThresholdMs);

          const timeDiff = now.getTime() - targetAlertTime.getTime();
          const pastEventDiff = now.getTime() - schedTime.getTime();

          if (timeDiff >= 0 && pastEventDiff < 40 * 60 * 1000) {
            const inMins = sched.remindMinutesBefore === 0 ? 'sekarang juga' : `${sched.remindMinutesBefore} menit lagi`;
            triggerNotification(`🔔 PENGINGAT JADWAL`, `"${sched.title}" akan dimulai ${inMins}! (${sched.waktu} WIB).`);

            if (sched.id) {
              await db.schedules.update(sched.id, { notified: true, lastNotifiedDate: todayDateString });
            }
            loadSchedules();
          }
        } else if (sched.tanggal) {
          if (sched.notified) return;

          const [h, m] = sched.waktu.split(':').map(Number);
          const schedTime = new Date(sched.tanggal);
          schedTime.setHours(h, m, 0, 0);

          const reminderThresholdMs = (sched.remindMinutesBefore || 0) * 60 * 1000;
          const targetAlertTime = new Date(schedTime.getTime() - reminderThresholdMs);

          const timeDiff = now.getTime() - targetAlertTime.getTime();
          const pastEventDiff = now.getTime() - schedTime.getTime();

          if (timeDiff >= 0 && pastEventDiff < 40 * 60 * 1000) {
            const inMins = sched.remindMinutesBefore === 0 ? 'sekarang juga' : `${sched.remindMinutesBefore} menit lagi`;
            triggerNotification(`🔔 PENGINGAT KURSUS`, `"${sched.title}" akan dimulai ${inMins}! (${sched.waktu} WIB).`);

            if (sched.id) {
              await db.schedules.update(sched.id, { notified: true });
            }
            loadSchedules();
          }
        }
      });
    }, 12000);

    return () => clearInterval(checkInterval);
  }, [schedules]);

  // Check if today falls in Week 3
  const todayIsThirdWeek = useMemo(() => {
    const today = new Date();
    const day = today.getDate();
    return day >= 15 && day <= 21;
  }, []);

  // Theme setup
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme-mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme-mode', 'light');
    }
  }, [darkMode]);

  // Available bimonthly periods
  const availablePeriods = useMemo<BiMonthlyPeriod[]>(() => {
    const periodsMap = new Map<string, BiMonthlyPeriod>();
    const now = new Date();
    const curYear = now.getFullYear();
    const curBlock = Math.floor(now.getMonth() / 2);
    const curKey = `${curYear}-${curBlock}`;

    periodsMap.set(curKey, {
      year: curYear,
      blockIndex: curBlock,
      label: getBiMonthlyLabel(curBlock, curYear),
      key: curKey
    });

    records.forEach(r => {
      const { year, blockIndex, key } = getRecordBiMonth(r.tanggal);
      if (!periodsMap.has(key)) {
        periodsMap.set(key, {
          year,
          blockIndex,
          label: getBiMonthlyLabel(blockIndex, year),
          key
        });
      }
    });

    return Array.from(periodsMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.blockIndex - b.blockIndex;
    });
  }, [records]);

  // Set default selected key
  useEffect(() => {
    if (availablePeriods.length > 0 && !selectedPeriodKey) {
      const hasMeiJuni = availablePeriods.find(p => p.key === "2026-2");
      if (hasMeiJuni) {
        setSelectedPeriodKey("2026-2");
      } else {
        const withData = availablePeriods.find(p => records.some(r => getRecordBiMonth(r.tanggal).key === p.key));
        if (withData) {
          setSelectedPeriodKey(withData.key);
        } else {
          setSelectedPeriodKey(availablePeriods[availablePeriods.length - 1].key);
        }
      }
    }
  }, [availablePeriods, selectedPeriodKey, records]);

  const currentPeriod = useMemo(() => {
    return availablePeriods.find(p => p.key === selectedPeriodKey);
  }, [availablePeriods, selectedPeriodKey]);

  const recordsInSelectedPeriod = useMemo(() => {
    if (!selectedPeriodKey) return [];
    return records.filter(r => getRecordBiMonth(r.tanggal).key === selectedPeriodKey);
  }, [records, selectedPeriodKey]);

  const filteredRecordsForReport = useMemo(() => {
    if (reportScheduleFilter === 'all') return recordsInSelectedPeriod;
    if (reportScheduleFilter === 'unlinked') return recordsInSelectedPeriod.filter(r => !r.scheduleId);
    const schedId = Number(reportScheduleFilter);
    return recordsInSelectedPeriod.filter(r => r.scheduleId === schedId);
  }, [recordsInSelectedPeriod, reportScheduleFilter]);

  const bimonthlyWeeks = useMemo(() => {
    if (!currentPeriod) return [];
    const periodDates = records
      .filter(r => getRecordBiMonth(r.tanggal).key === currentPeriod.key)
      .map(r => r.tanggal);
    return biMonthlyWeeks(currentPeriod, periodDates);
  }, [currentPeriod, records]);

  // Update selection states for reports when filters or period changes
  useEffect(() => {
    if (filteredRecordsForReport.length > 0) {
      const existingIds = filteredRecordsForReport.map(r => r.id).filter(Boolean) as number[];
      setReportSelectedRecordIds(existingIds);
    } else {
      setReportSelectedRecordIds([]);
    }
    setReportGenerated(false);
    setReportText('');
  }, [selectedPeriodKey, filteredRecordsForReport]);

  const capitalizeWords = (str: string): string => {
    return str
      .split(/\s+/)
      .map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  /**
   * The santri roster.
   *
   * This used to fall back to six invented names when the database was empty,
   * so a brand-new teacher's first save recorded children who do not exist.
   * An empty roster is now genuinely empty, and the UI asks them to add the
   * first santri.
   */
  const allRegisteredStudents = useMemo(() => {
    return students
      .filter(s => s.active)
      .map(s => s.name)
      .sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
  }, [students]);

  const currentActiveNames = useMemo(() => {
    return namesInput
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);
  }, [namesInput]);

  const handleToggleStudent = (studentName: string) => {
    const current = [...currentActiveNames];
    const index = current.findIndex(name => name.toLowerCase() === studentName.toLowerCase());

    if (index >= 0) {
      const filtered = current.filter((_, idx) => idx !== index);
      setNamesInput(filtered.join(', '));
    } else {
      const formattedName = capitalizeWords(studentName);
      const updatedNames = [...current, formattedName];
      setNamesInput(updatedNames.join(', '));
    }
  };

  const isStudentSelected = (studentName: string) => {
    return currentActiveNames.some(name => name.toLowerCase() === studentName.toLowerCase());
  };

  /**
   * Status for one santri in the session being edited.
   *
   * Everyone starts at Hadir, so the teacher only touches the exceptions —
   * the pattern every established register app uses.
   */
  /**
   * Load the statuses already saved for this date and class.
   *
   * Without this, reopening a session saved earlier starts every santri back
   * at Hadir, so saving again quietly erased the absences already recorded —
   * the record's own `statuses` were never read back in.
   */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!tanggalInput) return;
      try {
        const sameDate = await db.absensi.where('tanggal').equals(tanggalInput).toArray();
        const linkedId = selectedScheduleId ? Number(selectedScheduleId) : undefined;
        const existing = sameDate.find(r => (r.scheduleId ?? undefined) === linkedId);
        if (cancelled) return;

        if (existing?.statuses && Object.keys(existing.statuses).length > 0) {
          setSessionStatuses(existing.statuses);
          setTouchedStudents(new Set(Object.keys(existing.statuses)));
        } else if (existing) {
          const fromNames = statusesFromPeserta(existing.peserta ?? []);
          setSessionStatuses(fromNames);
          setTouchedStudents(new Set(Object.keys(fromNames)));
        } else {
          setSessionStatuses({});
          setTouchedStudents(new Set());
        }
      } catch (err) {
        console.error('[Load session statuses error]', err);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [tanggalInput, selectedScheduleId, records]);

  /** The mark on this santri for the session being edited, or nothing yet. */
  const sessionStatusFor = (studentName: string): StatusKey | undefined => {
    return sessionStatuses[nameKey(studentName)];
  };

  /** Tapping the mark a santri already carries takes it off again. */
  const setSessionStatus = (studentName: string, status: StatusKey) => {
    const key = nameKey(studentName);
    setSessionStatuses(prev => {
      const next = { ...prev };
      if (next[key] === status) delete next[key];
      else next[key] = status;
      return next;
    });
    setTouchedStudents(prev => new Set(prev).add(key));
  };

  const handleMarkAllPresent = () => {
    const next: StatusMap = { ...sessionStatuses };
    // Only the santri still waiting for a mark. Marks the teacher has already
    // set — the two who are ill today — are not swept away by this shortcut.
    const filled = allRegisteredStudents.filter(name => !next[nameKey(name)]);
    filled.forEach(name => { next[nameKey(name)] = 'hadir'; });
    setSessionStatuses(next);
    setTouchedStudents(new Set(Object.keys(next)));
    showToast(
      filled.length === 0
        ? 'Semua santri sudah ditandai.'
        : `${filled.length} santri sisanya ditandai hadir.`,
      'info'
    );
  };

  const handleClearSession = () => {
    setSessionStatuses({});
    setTouchedStudents(new Set());
    showToast('Semua tanda dikosongkan.', 'info');
  };

  const sessionTally = useMemo<StatusTally>(() => {
    return tally(buildStatusMap(allRegisteredStudents, sessionStatuses));
  }, [allRegisteredStudents, sessionStatuses]);

  /** Santri still waiting for a mark. */
  const untouchedCount = useMemo(() => {
    return unmarkedNames(allRegisteredStudents, sessionStatuses).length;
  }, [allRegisteredStudents, sessionStatuses]);

  const markedCount = allRegisteredStudents.length - untouchedCount;

  const dismissLastSaved = () => setLastSaved(null);

  const handleAddStudent = async (rawName: string): Promise<boolean> => {
    const names = parseNameList(rawName);
    if (names.length === 0) {
      showToast('Masukkan nama santri terlebih dahulu.', 'error');
      return false;
    }

    try {
      for (const name of names) {
        await upsertStudent(name);
      }
      await loadStudents();
      showToast(
        names.length === 1
          ? `${names[0]} ditambahkan ke daftar santri.`
          : `${names.length} santri ditambahkan.`,
        'success'
      );
      return true;
    } catch (err) {
      console.error('[Add student error]', err);
      showToast('Gagal menambahkan santri.', 'error');
      return false;
    }
  };

  // Create or Update Attendance Record
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tanggalInput) {
      showToast('Pilih tanggal kegiatan terlebih dahulu.', 'error');
      return;
    }

    // The roster is the source of truth. Names typed into the box are added
    // to it first, so both ways of working end up in the same place.
    const typed = parseNameList(namesInput);
    const rosterNames = allRegisteredStudents.length > 0 ? allRegisteredStudents : typed;

    if (rosterNames.length === 0) {
      showToast('Tambahkan santri terlebih dahulu.', 'error');
      return;
    }

    const statuses = buildStatusMap(rosterNames, sessionStatuses);
    const parsedPeserta = presentNames(rosterNames, statuses);

    if (Object.keys(statuses).length === 0) {
      showToast('Tandai dulu kehadiran santri sebelum menyimpan.', 'error');
      return;
    }

    try {
      // A date can hold more than one session when each is linked to a
      // different schedule, so match on the pair rather than the date alone.
      const sameDate = await db.absensi.where('tanggal').equals(tanggalInput).toArray();
      const linkedId = selectedScheduleId ? Number(selectedScheduleId) : undefined;
      const existing = sameDate.find(r => (r.scheduleId ?? undefined) === linkedId);

      if (existing) {
        // Overwriting a saved session replaces it, so it is staged and the
        // page asks first — with what is being replaced, not "are you sure".
        setPendingOverwrite({
          existingId: existing.id!,
          tanggal: tanggalInput,
          existingCount: existing.peserta?.length ?? 0,
          peserta: parsedPeserta,
          statuses,
          scheduleId: selectedScheduleId
        });
        return;
      }

      await db.absensi.add({
        tanggal: tanggalInput,
        peserta: parsedPeserta,
        statuses,
        scheduleId: selectedScheduleId,
        createdAt: Date.now()
      });
      showToast('Presensi tersimpan.', 'success');

      setNamesInput('');
      setSelectedScheduleId(undefined);
      setSessionStatuses({});
      setTouchedStudents(new Set());
      setLastSaved({ tanggal: tanggalInput, tally: tally(statuses) });
      loadRecords();
      loadStudents();
      // Saving used to jump to the Riwayat tab half a second later, which left
      // the teacher on a screen they did not ask for. They stay here, and the
      // confirmation offers the next step instead.

    } catch (err) {
      console.error('Error adding attendance:', err);
      showToast('Tidak dapat menyimpan ke ponsel ini.', 'error');
    }
  };

  // Delete Individual Record
  /**
   * Delete one session.
   *
   * This asked for confirmation through a native dialog. Deleting a single
   * session is routine and perfectly reversible, so it now happens at once
   * and offers an undo instead — the dialog only taught people to dismiss
   * dialogs. Irreversible actions still confirm; see handleClearAllRecords.
   */
  const cancelOverwrite = () => setPendingOverwrite(null);

  const confirmOverwrite = async () => {
    const staged = pendingOverwrite;
    setPendingOverwrite(null);
    if (!staged) return;

    try {
      await db.absensi.update(staged.existingId, {
        peserta: staged.peserta,
        statuses: staged.statuses,
        scheduleId: staged.scheduleId,
        createdAt: Date.now()
      });
      showToast(`Presensi ${formatIndonesianDate(staged.tanggal)} diperbarui.`, 'success');

      setNamesInput('');
      setSelectedScheduleId(undefined);
      setSessionStatuses({});
      setTouchedStudents(new Set());
      setLastSaved({ tanggal: staged.tanggal, tally: tally(staged.statuses) });
      loadRecords();
    } catch (err) {
      console.error('Error updating attendance:', err);
      showToast('Tidak dapat menyimpan ke ponsel ini.', 'error');
    }
  };

  const handleDeleteRecord = async (id: number, tanggal: string) => {
    try {
      const removed = await db.absensi.get(id);
      if (!removed) return;

      await db.absensi.delete(id);

      if (reportGenerated) {
        setReportGenerated(false);
        setReportText('');
      }

      await loadRecords();

      showToast(`Presensi ${formatIndonesianDate(tanggal)} dihapus.`, 'success', {
        label: 'Urungkan',
        onAction: async () => {
          // A second tap before React commits would add the record twice.
          if (restoringRef.current) return;
          restoringRef.current = true;
          try {
            const { id: _oldId, ...rest } = removed;
            await db.absensi.add(rest);
            await loadRecords();
            showToast('Presensi dikembalikan.', 'success');
          } catch (err) {
            console.error('Error restoring record:', err);
            showToast('Tidak dapat mengembalikan presensi.', 'error');
          } finally {
            restoringRef.current = false;
          }
        }
      });
    } catch (err) {
      console.error('Error deleting record:', err);
      showToast('Tidak dapat menghapus.', 'error');
    }
  };

  /**
   * Erase every session. Irreversible, so it keeps a confirmation — and
   * offers a backup first, which is the difference between "confirmed" and
   * actually recoverable.
   */
  const handleClearAllRecords = async () => {
    try {
      await db.absensi.clear();
      await loadRecords();
      showToast('Semua presensi dihapus.', 'success');
    } catch (err) {
      console.error('Error clearing records:', err);
      showToast('Gagal menghapus presensi.', 'error');
    }
  };

  // Inline Edit logic
  const startEditing = (record: AbsensiRecord) => {
    setEditingId(record.id || null);
    setEditingNames(record.peserta.join(', '));
    setEditingTanggal(record.tanggal);
    setEditingScheduleId(record.scheduleId);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingNames('');
    setEditingTanggal('');
    setEditingScheduleId(undefined);
  };

  const saveEditedRecord = async (id: number) => {
    if (!editingTanggal) {
      showToast('Pilih tanggal edit.', 'error');
      return;
    }
    if (!editingNames.trim()) {
      showToast('Daftar nama tidak boleh kosong.', 'error');
      return;
    }

    const updatedPeserta = editingNames
      .split(',')
      .map(name => capitalizeWords(name.trim()))
      .filter(name => name.length > 0);

    try {
      // Keep the invariant that peserta is exactly the names marked hadir.
      // Absences recorded for other santri are preserved; names dropped from
      // the hadir list stop being claimed as present.
      const existingRecord = await db.absensi.get(id);
      const updatedStatuses: StatusMap = {};
      for (const [key, value] of Object.entries(existingRecord?.statuses ?? {})) {
        if (value !== 'hadir') updatedStatuses[key] = value as StatusKey;
      }
      for (const name of updatedPeserta) {
        updatedStatuses[nameKey(name)] = 'hadir';
      }

      await db.absensi.update(id, {
        tanggal: editingTanggal,
        peserta: updatedPeserta,
        statuses: updatedStatuses,
        scheduleId: editingScheduleId,
        createdAt: Date.now()
      });
      showToast('Presensi berhasil diperbarui.', 'success');
      setEditingId(null);
      setEditingScheduleId(undefined);
      loadRecords();

      if (reportGenerated) {
        setReportGenerated(false);
        setReportText('');
      }
    } catch (err) {
      console.error('Error updating edited record:', err);
      showToast('Tidak dapat memperbarui presensi.', 'error');
    }
  };

  // Export & download engine
  const downloadFile = (content: string, filename: string, contentType: string) => {
    try {
      const blob = new Blob([content], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`File ${filename} berhasil diunduh!`, 'success');
    } catch (error) {
      console.error('File download API failed, falling back to copy to clipboard', error);
      navigator.clipboard.writeText(content);
      showToast('Gagal mengunduh file. Data disalin ke clipboard sebagai solusi cadangan!', 'info');
    }
  };

  const handleExportCSV = () => {
    const selected = records.filter(r => r.id && selectedRecordIds.includes(r.id));
    if (selected.length === 0) {
      showToast('Pilih minimal satu sesi untuk diekspor.', 'error');
      return;
    }

    const headers = 'ID,Tanggal,Hari/Tanggal,Jumlah Peserta,Daftar Peserta';
    const rows = selected.map(rec => {
      const indonesianDate = formatIndonesianDate(rec.tanggal);
      const cleanPeserta = rec.peserta.map(p => p.replace(/"/g, '""')).join('; ');
      return `"${rec.id || ''}","${rec.tanggal}","${indonesianDate}","${rec.peserta.length}","${cleanPeserta}"`;
    });

    const csvContent = "\uFEFF" + [headers, ...rows].join('\n');
    downloadFile(csvContent, `ekspor-presensi-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExportJSON = () => {
    const selected = records.filter(r => r.id && selectedRecordIds.includes(r.id));
    if (selected.length === 0) {
      showToast('Pilih minimal satu sesi untuk diekspor.', 'error');
      return;
    }

    const jsonContent = JSON.stringify(selected, null, 2);
    downloadFile(jsonContent, `ekspor-presensi-${new Date().toISOString().split('T')[0]}.json`, 'application/json;charset=utf-8;');
  };

  const handleCopySelectedCSV = () => {
    const selected = records.filter(r => r.id && selectedRecordIds.includes(r.id));
    if (selected.length === 0) {
      showToast('Pilih minimal satu sesi untuk disalin.', 'error');
      return;
    }

    const headers = 'ID,Tanggal,Hari/Tanggal,Jumlah Peserta,Daftar Peserta';
    const rows = selected.map(rec => {
      const indonesianDate = formatIndonesianDate(rec.tanggal);
      const cleanPeserta = rec.peserta.map(p => p.replace(/"/g, '""')).join('; ');
      return `"${rec.id || ''}","${rec.tanggal}","${indonesianDate}","${rec.peserta.length}","${cleanPeserta}"`;
    });

    const csvContent = [headers, ...rows].join('\n');
    navigator.clipboard.writeText(csvContent)
      .then(() => showToast('Format CSV berhasil disalin ke clipboard!', 'success'))
      .catch(() => showToast('Tidak dapat menyalin teks.', 'error'));
  };

  // Form schedules add/delete
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTitle.trim()) {
      showToast('Isi nama kelas.', 'error');
      return;
    }
    if (!scheduleHari) {
      showToast('Pilih hari kelas.', 'error');
      return;
    }
    if (!scheduleWaktu) {
      showToast('Isi jam mulai kelas.', 'error');
      return;
    }

    try {
      await db.schedules.add({
        title: scheduleTitle.trim(),
        hari: scheduleHari,
        waktu: scheduleWaktu,
        remindMinutesBefore: scheduleRemindMinutesBefore,
        notified: false,
        createdAt: Date.now()
      });

      showToast(`Jadwal "${scheduleTitle}" berhasil didaftarkan!`, 'success');
      setScheduleTitle('');
      loadSchedules();
    } catch (err) {
      console.error("Failed to add schedule:", err);
      showToast('Tidak dapat menyimpan jadwal.', 'error');
    }
  };

  const handleDeleteSchedule = async (id: number, title: string) => {
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus jadwal "${title}"?`);
    if (!confirmDelete) return;

    try {
      await db.schedules.delete(id);
      showToast(`Jadwal "${title}" berhasil dihapus.`, 'success');
      loadSchedules();
    } catch (err) {
      console.error("Failed to delete schedule:", err);
      showToast('Tidak dapat menghapus jadwal.', 'error');
    }
  };

  // Backups export / import Base64 sync code
  const handleGenerateSyncHash = async () => {
    try {
      const allAbsensi = await db.absensi.toArray();
      const allStudents = await db.students.toArray();
      const allSchedules = await db.schedules.toArray();

      if (allAbsensi.length === 0 && allSchedules.length === 0) {
        showToast('Belum ada data untuk dibagikan.', 'error');
        return;
      }

      const backupData = {
        app: 'ClassSync',
        version: '2.2',
        exportedAt: Date.now(),
        absensi: allAbsensi,
        schedules: allSchedules,
        // Santri who were never 'hadir' appear in no record's peserta, so
        // without this the roster cannot be rebuilt and they vanish.
        students: allStudents
      };

      const jsonString = JSON.stringify(backupData);
      const u8String = unescape(encodeURIComponent(jsonString));
      const b64 = btoa(u8String);
      setSyncHashOutput(b64);
      showToast('Kode dibuat. Salin lalu tempel di HP tujuan.', 'success');
    } catch (err) {
      console.error('[Generate Sync Hash Error]', err);
      showToast('Gagal menciptakan kode sinkronisasi.', 'error');
    }
  };

  const handleImportSyncHash = async () => {
    if (!syncInputText || syncInputText.trim() === '') {
      showToast('Tempel kode sinkronisasi terlebih dahulu.', 'error');
      return;
    }

    try {
      const cleanHash = syncInputText.trim();
      const decodedString = decodeURIComponent(escape(atob(cleanHash)));
      const jsonData = JSON.parse(decodedString);

      // Staged, not merged yet — keep the pasted code so "Jangan gabungkan"
      // does not leave the teacher with nothing to retry.
      await handleSmartMergeImport(jsonData);
    } catch (err) {
      console.error('[Decode Sync Hash Error]', err);
      showToast('Kode tidak terbaca. Periksa lalu tempel ulang.', 'error');
    }
  };

  // Camera QR Scanning
  const startCameraScanner = async () => {
    setIsScanning(true);
    setScanError('');
    try {
      const constraints = { video: { facingMode: 'environment' } };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        requestAnimationFrame(scannerTick);
      }
    } catch (err: any) {
      console.error('[Camera Access Error]', err);
      setScanError('Tidak dapat membuka kamera. Periksa izin kamera di pengaturan browser.');
      showToast('Tidak dapat membuka kamera.', 'error');
    }
  };

  const stopCameraScanner = () => {
    setIsScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const scannerTick = () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decodedResult = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (decodedResult && decodedResult.data) {
        const scannedDataStr = decodedResult.data;
        try {
          const decryptedString = decodeURIComponent(escape(atob(scannedDataStr)));
          const parsedJson = JSON.parse(decryptedString);

          if (parsedJson && parsedJson.app === 'ClassSync') {
            stopCameraScanner();
            handleSmartMergeImport(parsedJson);
            return;
          }
        } catch (decodeErr) {
          console.warn('QR Code scanned but is not valid.', decodeErr);
        }
      }
    }

    if (streamRef.current) {
      requestAnimationFrame(scannerTick);
    }
  };

  // QR Generation containing DB contents
  const handleGenerateQrCode = async () => {
    try {
      const allAbsensi = await db.absensi.toArray();
      const allStudents = await db.students.toArray();
      const allSchedules = await db.schedules.toArray();

      if (allAbsensi.length === 0 && allSchedules.length === 0) {
        showToast('Belum ada data untuk dibagikan.', 'error');
        return;
      }

      const backupData = {
        app: 'ClassSync',
        version: '2.2',
        exportedAt: Date.now(),
        absensi: allAbsensi,
        schedules: allSchedules,
        // Santri who were never 'hadir' appear in no record's peserta, so
        // without this the roster cannot be rebuilt and they vanish.
        students: allStudents
      };

      const jsonString = JSON.stringify(backupData);

      // A QR holding ~1.2 KB is already at the edge of what a mid-range phone
      // can read off another phone's screen, and splitting across several
      // codes is a known usability failure. Send people to the file instead.
      if (jsonString.length > QR_SAFE_CHARS) {
        showToast('Data Anda sudah terlalu banyak untuk QR. Gunakan "Unduh cadangan" lalu kirim filenya.', 'error');
        return;
      }

      const u8String = unescape(encodeURIComponent(jsonString));
      const b64 = btoa(u8String);

      const dataUrl = await QRCode.toDataURL(b64, {
        errorCorrectionLevel: 'L',
        margin: 1.5,
        width: 320,
        color: {
          dark: '#dc2626', // Red-600 to align with Konsepsi Politik theme!
          light: '#ffffff'
        }
      });

      setGeneratedQrUrl(dataUrl);
      setShowQrModal(true);
      showToast('QR Code berhasil diciptakan! Siap di-scan.', 'success');
    } catch (err: any) {
      console.error('[QR Generation Error]', err);
      showToast('Gagal menyusun QR Code. Gunakan ekspor file untuk kapasitas data yang besar.', 'error');
    }
  };

  const handleCopyDirectSyncLink = async () => {
    try {
      const allAbsensi = await db.absensi.toArray();
      const allStudents = await db.students.toArray();
      const allSchedules = await db.schedules.toArray();

      if (allAbsensi.length === 0 && allSchedules.length === 0) {
        showToast('Belum ada data untuk dibuatkan tautan.', 'error');
        return;
      }

      const backupData = {
        app: 'ClassSync',
        version: '2.2',
        exportedAt: Date.now(),
        absensi: allAbsensi,
        schedules: allSchedules,
        // Santri who were never 'hadir' appear in no record's peserta, so
        // without this the roster cannot be rebuilt and they vanish.
        students: allStudents
      };

      const jsonString = JSON.stringify(backupData);
      const u8String = unescape(encodeURIComponent(jsonString));
      const b64 = btoa(u8String);

      const syncUrl = `${window.location.origin}${window.location.pathname}?sync=${encodeURIComponent(b64)}`;

      navigator.clipboard.writeText(syncUrl)
        .then(() => {
          showToast('Tautan Sinkronisasi Instan disalin ke Clipboard! Kirim link ini ke WA HP tujuan.', 'success');
        })
        .catch(() => {
          setSyncHashOutput(syncUrl);
          showToast('Tautan tidak dapat disalin otomatis. Gunakan "Buat kode" di bawah.', 'info');
        });
    } catch (error) {
      console.error('[Copy Sync Link Tool Error]', error);
      showToast('Gagal memproses instan tautan.', 'error');
    }
  };

  const handleFullBackupExport = async () => {
    try {
      const allAbsensi = await db.absensi.toArray();
      const allStudents = await db.students.toArray();
      const allSchedules = await db.schedules.toArray();
      const backupData = {
        app: 'ClassSync',
        version: '2.2',
        exportedAt: Date.now(),
        absensi: allAbsensi,
        schedules: allSchedules,
        // Santri who were never 'hadir' appear in no record's peserta, so
        // without this the roster cannot be rebuilt and they vanish.
        students: allStudents
      };
      const jsonContent = JSON.stringify(backupData, null, 2);
      downloadFile(jsonContent, `ClassSync-cadangan-lengkap-${new Date().toISOString().split('T')[0]}.json`, 'application/json;charset=utf-8;');
      showToast('Cadangan database penuh berhasil diekspor!', 'success');
    } catch (err) {
      console.error('[Export Full Backup Error]', err);
      showToast('Gagal mengekspor data cadangan penuh.', 'error');
    }
  };

  const handleLoadSampleData = async () => {
    const baseTime = 1780447307000;
    const sampleRecords: AbsensiRecord[] = [
      { tanggal: "2026-05-24", peserta: ["Husen", "Budi", "Ahmad", "Siti", "Umar", "Fatimah", "Zaid"], createdAt: baseTime - 25 * 86400000 },
      { tanggal: "2026-05-26", peserta: ["Husen", "Budi", "Ahmad", "Siti", "Fatimah"], createdAt: baseTime - 23 * 86400000 },
      { tanggal: "2026-05-30", peserta: ["Umar", "Sarah", "Budi", "Husen", "Aisyah", "Yusuf"], createdAt: baseTime - 19 * 86400000 },
      { tanggal: "2026-06-02", peserta: ["Husen", "Umar", "Sarah", "Aisyah", "Yusuf", "Zaid"], createdAt: baseTime - 16 * 86400000 },
      { tanggal: "2026-06-08", peserta: ["Husen", "Budi", "Ahmad", "Siti", "Umar", "Fatimah", "Aisyah", "Yusuf"], createdAt: baseTime - 10 * 86400000 },
      { tanggal: "2026-06-11", peserta: ["Aisyah", "Yusuf", "Sarah", "Zaid", "Fatimah"], createdAt: baseTime - 7 * 86400000 },
      { tanggal: "2026-06-15", peserta: ["Husen", "Budi", "Ahmad", "Siti", "Umar", "Fatimah", "Aisyah", "Yusuf", "Sarah", "Zaid"], createdAt: baseTime - 3 * 86400000 },
      { tanggal: "2026-06-18", peserta: ["Husen", "Budi", "Ahmad", "Siti", "Umar", "Fatimah"], createdAt: baseTime }
    ];

    try {
      const confirmLoad = window.confirm(
        'Apakah Anda ingin memuat data contoh Mei-Juni 2026? Ini akan menghapus data yang ada.'
      );
      if (!confirmLoad) return;

      await db.absensi.clear();
      await db.absensi.bulkAdd(
        sampleRecords.map(r => ({ ...r, statuses: statusesFromPeserta(r.peserta) }))
      );
      showToast('Berhasil memuat data contoh untuk periode Mei-Juni 2026!', 'success');
      loadRecords();

      setActiveTab('laporan');
      setReportGenerated(false);
    } catch (error) {
      console.error('Failed to load sample data:', error);
      showToast('Gagal memuat data contoh.', 'error');
    }
  };

  // Generate bimonthly report
  const handleGenerateReport = () => {
    if (bimonthlyWeeks.length === 0) {
      showToast('Tidak ada data minggu lapor yang dapat diproses.', 'error');
      return;
    }

    const label = currentPeriod ? currentPeriod.label : "Mei-Juni 2026";
    const lines = [
      // Verbatim: this is the report the coordinator reads, and its wording
      // is a contract with them, not UI copy. Do not 'improve' it.
      `Mohon untuk dikirimkan Laporan Kursus periode ${label}`,
      ""
    ];

    bimonthlyWeeks.forEach((period) => {
      const matchRecords = records.filter(r =>
        r.id &&
        reportSelectedRecordIds.includes(r.id) &&
        r.tanggal >= period.start &&
        r.tanggal <= period.end
      );

      matchRecords.sort((a, b) => a.tanggal.localeCompare(b.tanggal));

      lines.push(period.title);

      if (matchRecords.length === 0) {
        lines.push(`* Tgl Kursus : -`);
        lines.push(`* Peserta : -`);
      } else {
        matchRecords.forEach((rec, idx) => {
          const dateToken = formatDateShort(rec.tanggal);
          const namesJoined = participantLine(rec);
          
          // Add trailing comma to the date token if there is another session scheduled after it in the same week
          const trailingComma = idx < matchRecords.length - 1 ? ',' : '';

          lines.push(`* Tgl Kursus : ${dateToken}${trailingComma}`);
          lines.push(`* Peserta : ${namesJoined}`);
        });
      }
      lines.push("");
    });

    const compiledReport = lines.join('\n').trim() + "\n";
    setReportText(compiledReport);
    setReportGenerated(true);
    showToast('Laporan berhasil diproses!', 'success');
  };

  const handleCopyReport = async () => {
    if (!reportText) return;

    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      showToast('Laporan disalin ke Clipboard!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn('Clipboard direct copy failed, checking fallback...', err);
      try {
        if (reportTextareaRef.current) {
          reportTextareaRef.current.select();
          document.execCommand('copy');
          setCopied(true);
          showToast('Laporan disalin ke Clipboard! (Fallback)', 'success');
          setTimeout(() => setCopied(false), 3000);
        }
      } catch (fallbackErr) {
        showToast('Tidak dapat menyalin otomatis. Pilih teksnya lalu salin manual.', 'error');
      }
    }
  };

  const executePWAPrompt = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          showToast('Terima kasih telah memasang aplikasi presensi!', 'success');
        }
        setDeferredPrompt(null);
      });
    } else {
      showToast('Aplikasi PWA siap digunakan offline! Pasang melalui tombol menu browser Anda untuk instalasi penuh.', 'info');
    }
  };

  // Dismiss dismissables
  const handleDismissDbNotice = () => {
    setHideDbNotice(true);
    localStorage.setItem('hide_db_notice_v3', 'true');
    showToast('Info penyimpanan terproteksi disembunyikan.', 'info');
  };

  const handleDismissWeekReminder = () => {
    setHideWeekReminder(true);
    localStorage.setItem('hide_week_reminder_v3', 'true');
    showToast('Pengingat pekan ke-3 disembunyikan.', 'info');
  };

  // Safe scanner release
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleToggleSelectRecord = (id: number) => {
    setSelectedRecordIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllRecords = () => {
    const allIds = records.map(r => r.id!).filter(Boolean);
    setSelectedRecordIds(allIds);
  };

  const handleDeselectAllRecords = () => {
    setSelectedRecordIds([]);
  };

  return (
    <AppContext.Provider value={{
      activeTab,
      setActiveTab,
      darkMode,
      setDarkMode,
      toast,
      showToast,
      dismissToast,
      onlineStatus,
      deferredPrompt,
      executePWAPrompt,
      hideDbNotice,
      setHideDbNotice,
      handleDismissDbNotice,
      hideWeekReminder,
      setHideWeekReminder,
      handleDismissWeekReminder,
      todayIsThirdWeek,

      records,
      schedules,
      loading,
      loadRecords,
      loadSchedules,

      tanggalInput,
      setTanggalInput,
      namesInput,
      setNamesInput,
      selectedScheduleId,
      setSelectedScheduleId,
      lastAttendanceForSchedule,
      currentActiveNames,
      allRegisteredStudents,
      students,
      sessionStatusFor,
      setSessionStatus,
      handleMarkAllPresent,
      handleClearSession,
      sessionTally,
      untouchedCount,
      markedCount,
      handleAddStudent,
      lastSaved,
      dismissLastSaved,
      handleToggleStudent,
      isStudentSelected,
      handleSaveAttendance,

      editingId,
      setEditingId,
      editingNames,
      setEditingNames,
      editingTanggal,
      setEditingTanggal,
      editingScheduleId,
      setEditingScheduleId,
      startEditing,
      cancelEditing,
      saveEditedRecord,
      handleDeleteRecord,
      handleClearAllRecords,

      scheduleTitle,
      setScheduleTitle,
      scheduleHari,
      setScheduleHari,
      scheduleWaktu,
      setScheduleWaktu,
      scheduleRemindMinutesBefore,
      setScheduleRemindMinutesBefore,
      handleAddSchedule,
      handleDeleteSchedule,
      requestNotificationPermission,

      syncHashOutput,
      setSyncHashOutput,
      syncInputText,
      setSyncInputText,
      showQrModal,
      setShowQrModal,
      generatedQrUrl,
      setGeneratedQrUrl,
      isScanning,
      setIsScanning,
      scanError,
      setScanError,
      videoRef,
      canvasRef,
      handleGenerateSyncHash,
      handleImportSyncHash,
      startCameraScanner,
      stopCameraScanner,
      handleGenerateQrCode,
      handleCopyDirectSyncLink,
      handleSmartMergeImport,
      pendingImport,
      pendingOverwrite,
      confirmOverwrite,
      cancelOverwrite,
      confirmPendingImport,
      cancelPendingImport,
      handleFullBackupExport,
      handleLoadSampleData,

      selectedPeriodKey,
      setSelectedPeriodKey,
      reportScheduleFilter,
      setReportScheduleFilter,
      reportSelectedRecordIds,
      setReportSelectedRecordIds,
      reportText,
      setReportText,
      reportGenerated,
      setReportGenerated,
      copied,
      availablePeriods,
      currentPeriod,
      recordsInSelectedPeriod,
      filteredRecordsForReport,
      bimonthlyWeeks,
      handleGenerateReport,
      handleCopyReport,
      reportTextareaRef,

      selectedRecordIds,
      setSelectedRecordIds,
      handleToggleSelectRecord,
      handleSelectAllRecords,
      handleDeselectAllRecords,
      handleExportCSV,
      handleExportJSON,
      handleCopySelectedCSV,

      capitalizeWords
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside an AppProvider');
  }
  return context;
};
