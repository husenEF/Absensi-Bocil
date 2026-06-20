import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { db, AbsensiRecord, ScheduleRecord } from '../db';
import { formatIndonesianDate, formatDateShort } from '../utils/date';

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
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
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

const AppContext = createContext<AppContextType | undefined>(undefined);

const getBiMonthlyLabel = (blockIndex: number, year: number) => {
  const labels = [
    "Januari - Februari",
    "Maret - April",
    "Mei - Juni",
    "Juli - Agustus",
    "September - Oktober",
    "November - Desember"
  ];
  return `${labels[blockIndex]} ${year}`;
};

const getRecordBiMonth = (dateStr: string) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();
  const blockIndex = Math.floor(month / 2);
  return { year, blockIndex, key: `${year}-${blockIndex}` };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Active Tab navigation
  const [activeTab, setActiveTab] = useState<'input' | 'riwayat' | 'laporan' | 'jadwal' | 'sinkronisasi'>('input');

  // Theme states
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme-mode');
    return saved === 'dark';
  });

  // Today dates YYYY-MM-DD
  const [tanggalInput, setTanggalInput] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [namesInput, setNamesInput] = useState<string>('');

  // Linked Schedule
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | undefined>(undefined);
  const [lastAttendanceForSchedule, setLastAttendanceForSchedule] = useState<string[]>([]);

  // Records & schedules fetched
  const [records, setRecords] = useState<AbsensiRecord[]>([]);
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // New Schedules Form States
  const [scheduleTitle, setScheduleTitle] = useState<string>('');
  const [scheduleHari, setScheduleHari] = useState<string>('Senin');
  const [scheduleWaktu, setScheduleWaktu] = useState<string>('19:00');
  const [scheduleRemindMinutesBefore, setScheduleRemindMinutesBefore] = useState<number>(15);

  const reportTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fast trigger helper: toast notifications
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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
  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await db.absensi.orderBy('tanggal').reverse().toArray();
      setRecords(data);
      // Clean up selections that might have been deleted
      const existingIds = data.map(d => d.id).filter(Boolean) as number[];
      setSelectedRecordIds(prev => prev.filter(id => existingIds.includes(id)));
    } catch (error) {
      console.error('Failed to load records from IndexedDB:', error);
      showToast('Gagal memuat data dari database lokal.', 'error');
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
  const handleSmartMergeImport = async (jsonData: any) => {
    try {
      if (!jsonData || jsonData.app !== 'AbsenBocil') {
        showToast('Format tidak valid atau bukan dari aplikasi AbsenBocil.', 'error');
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
              await db.absensi.update(existing.id!, { peserta: combinedNames });
              mergedAbsensiCount++;
            }
          } else {
            const { id, ...cleanRecord } = r;
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
    loadRecords();
    loadSchedules();

    const urlParams = new URLSearchParams(window.location.search);
    const syncToken = urlParams.get('sync');
    if (syncToken) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      setTimeout(() => {
        const conf = window.confirm("Ditemukan berkas integrasi presensi masuk dari HP tujuan via tautan! Apakah Anda setuju menggabungkannya ke database lokal IndexedDB secara pintar?");
        if (conf) {
          try {
            const decodedString = decodeURIComponent(escape(atob(syncToken)));
            const jsonData = JSON.parse(decodedString);
            handleSmartMergeImport(jsonData);
          } catch (err) {
            console.error('[Decode Sync URL Param Error]', err);
            showToast('Tautan sinkronisasi terkompresi rusak atau tidak terbaca.', 'error');
          }
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
    const periodRecords = records.filter(r => getRecordBiMonth(r.tanggal).key === currentPeriod.key);

    let baseDateStr = '';
    if (periodRecords.length > 0) {
      const dates = periodRecords.map(r => r.tanggal);
      dates.sort();
      baseDateStr = dates[0];
    } else {
      const monthStart = currentPeriod.blockIndex * 2;
      const mStr = String(monthStart + 1).padStart(2, '0');
      baseDateStr = `${currentPeriod.year}-${mStr}-01`;
    }

    const baseDate = new Date(baseDateStr);
    const periodsList = [];
    const indonesianMonths = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    for (let i = 0; i < 4; i++) {
      const start = new Date(baseDate.getTime());
      start.setDate(baseDate.getDate() + (i * 7));

      const end = new Date(start.getTime());
      end.setDate(start.getDate() + 6);

      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      const startDay = start.getDate();
      const endDay = end.getDate();
      const startMonth = indonesianMonths[start.getMonth()];
      const endMonth = indonesianMonths[end.getMonth()];
      const startYear = start.getFullYear();

      let periodLabel = `${startDay}-${endDay} ${startMonth} ${startYear}`;
      if (startMonth !== endMonth) {
        periodLabel = `${startDay} ${startMonth}-${endDay} ${endMonth} ${startYear}`;
      }

      periodsList.push({
        id: i + 1,
        title: periodLabel,
        start: startStr,
        end: endStr,
        isWeek1: i === 0
      });
    }

    return periodsList;
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

  const allRegisteredStudents = useMemo(() => {
    const listSet = new Set<string>();
    records.forEach(rec => {
      rec.peserta.forEach(name => {
        const clean = name.trim();
        if (clean) listSet.add(clean);
      });
    });

    if (listSet.size === 0) {
      return ['Husen', 'Budi', 'Ahmad', 'Siti', 'Umar', 'Fatimah'];
    }

    return Array.from(listSet).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
  }, [records]);

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

  // Create or Update Attendance Record
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tanggalInput) {
      showToast('Mohon pilih tanggal kegiatan belajar.', 'error');
      return;
    }

    if (!namesInput.trim()) {
      showToast('Mohon masukkan minimal satu nama peserta.', 'error');
      return;
    }

    const parsedPeserta = namesInput
      .split(',')
      .map(name => capitalizeWords(name.trim()))
      .filter(name => name.length > 0);

    if (parsedPeserta.length === 0) {
      showToast('Daftar peserta tidak valid.', 'error');
      return;
    }

    try {
      const existing = await db.absensi.where('tanggal').equals(tanggalInput).first();

      if (existing) {
        const confirmOverwrite = window.confirm(
          `Data presensi untuk tanggal ${formatIndonesianDate(tanggalInput)} sudah ada. Apakah Anda ingin memperbaruinya?`
        );
        if (!confirmOverwrite) return;

        await db.absensi.update(existing.id!, {
          peserta: parsedPeserta,
          scheduleId: selectedScheduleId,
          createdAt: Date.now()
        });
        showToast(`Presensi tanggal ${formatIndonesianDate(tanggalInput)} berhasil diperbarui!`, 'success');
      } else {
        await db.absensi.add({
          tanggal: tanggalInput,
          peserta: parsedPeserta,
          scheduleId: selectedScheduleId,
          createdAt: Date.now()
        });
        showToast('Presensi berhasil disimpan!', 'success');
      }

      setNamesInput('');
      setSelectedScheduleId(undefined);
      loadRecords();

      setTimeout(() => {
        setActiveTab('riwayat');
      }, 500);

    } catch (err) {
      console.error('Error adding attendance:', err);
      showToast('Gagal menyimpan ke database lokal.', 'error');
    }
  };

  // Delete Individual Record
  const handleDeleteRecord = async (id: number, tanggal: string) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus data presensi tanggal ${formatIndonesianDate(tanggal)}?`
    );
    if (!confirmDelete) return;

    try {
      await db.absensi.delete(id);
      showToast('Data presensi berhasil dihapus.', 'success');

      if (reportGenerated) {
        setReportGenerated(false);
        setReportText('');
      }

      loadRecords();
    } catch (err) {
      console.error('Error deleting record:', err);
      showToast('Gagal menghapus data.', 'error');
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
      await db.absensi.update(id, {
        tanggal: editingTanggal,
        peserta: updatedPeserta,
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
      showToast('Gagal memperbarui presensi.', 'error');
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
      showToast('Silakan pilih minimal satu presensi untuk diekspor.', 'error');
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
      showToast('Silakan pilih minimal satu presensi untuk diekspor.', 'error');
      return;
    }

    const jsonContent = JSON.stringify(selected, null, 2);
    downloadFile(jsonContent, `ekspor-presensi-${new Date().toISOString().split('T')[0]}.json`, 'application/json;charset=utf-8;');
  };

  const handleCopySelectedCSV = () => {
    const selected = records.filter(r => r.id && selectedRecordIds.includes(r.id));
    if (selected.length === 0) {
      showToast('Silakan pilih minimal satu presensi untuk disalin.', 'error');
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
      .catch(() => showToast('Gagal menyalin teks.', 'error'));
  };

  // Form schedules add/delete
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTitle.trim()) {
      showToast('Mohon masukkan judul sesi jadwal.', 'error');
      return;
    }
    if (!scheduleHari) {
      showToast('Mohon tentukan hari sesi jadwal.', 'error');
      return;
    }
    if (!scheduleWaktu) {
      showToast('Mohon tentukan waktu sesi jadwal.', 'error');
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
      showToast('Gagal mendaftarkan jadwal ke DB.', 'error');
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
      showToast('Gagal menghapus jadwal.', 'error');
    }
  };

  // Backups export / import Base64 sync code
  const handleGenerateSyncHash = async () => {
    try {
      const allAbsensi = await db.absensi.toArray();
      const allSchedules = await db.schedules.toArray();

      if (allAbsensi.length === 0 && allSchedules.length === 0) {
        showToast('Database lokal Anda masih kosong, tidak ada data untuk disinkronisasi.', 'error');
        return;
      }

      const backupData = {
        app: 'AbsenBocil',
        version: '2.1',
        exportedAt: Date.now(),
        absensi: allAbsensi,
        schedules: allSchedules
      };

      const jsonString = JSON.stringify(backupData);
      const u8String = unescape(encodeURIComponent(jsonString));
      const b64 = btoa(u8String);
      setSyncHashOutput(b64);
      showToast('Kode Sinkronisasi Instan berhasil dibuat! Silakan salin.', 'success');
    } catch (err) {
      console.error('[Generate Sync Hash Error]', err);
      showToast('Gagal menciptakan kode sinkronisasi.', 'error');
    }
  };

  const handleImportSyncHash = async () => {
    if (!syncInputText || syncInputText.trim() === '') {
      showToast('Masukkan kode sinkronisasi terlebih dahulu.', 'error');
      return;
    }

    try {
      const cleanHash = syncInputText.trim();
      const decodedString = decodeURIComponent(escape(atob(cleanHash)));
      const jsonData = JSON.parse(decodedString);

      await handleSmartMergeImport(jsonData);
      setSyncInputText('');
      setSyncHashOutput('');
    } catch (err) {
      console.error('[Decode Sync Hash Error]', err);
      showToast('Kode sinkronisasi salah atau tidak dapat dibaca.', 'error');
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
      setScanError('Gagal mengakses kamera. Mohon pastikan izin akses kamera aktif.');
      showToast('Gagal membuka kamera perangkat.', 'error');
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

          if (parsedJson && parsedJson.app === 'AbsenBocil') {
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
      const allSchedules = await db.schedules.toArray();

      if (allAbsensi.length === 0 && allSchedules.length === 0) {
        showToast('Database lokal Anda kosong. Tidak ada data untuk dibagikan!', 'error');
        return;
      }

      const backupData = {
        app: 'AbsenBocil',
        version: '2.1',
        exportedAt: Date.now(),
        absensi: allAbsensi,
        schedules: allSchedules
      };

      const jsonString = JSON.stringify(backupData);

      if (jsonString.length > 3900) {
        showToast('Data Anda terlalu besar untuk QR Code! Mohon gunakan Metode 3 (Ekspor Berkas JSON) agar aman.', 'error');
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
      const allSchedules = await db.schedules.toArray();

      if (allAbsensi.length === 0 && allSchedules.length === 0) {
        showToast('Database lokal kosong. Belum ada data untuk dipasang ke tautan!', 'error');
        return;
      }

      const backupData = {
        app: 'AbsenBocil',
        version: '2.1',
        exportedAt: Date.now(),
        absensi: allAbsensi,
        schedules: allSchedules
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
          showToast('Tautan gagal otomatis disalin. Silakan gunakan tab Teks untuk menyalinnya.', 'info');
        });
    } catch (error) {
      console.error('[Copy Sync Link Tool Error]', error);
      showToast('Gagal memproses instan tautan.', 'error');
    }
  };

  const handleFullBackupExport = async () => {
    try {
      const allAbsensi = await db.absensi.toArray();
      const allSchedules = await db.schedules.toArray();
      const backupData = {
        app: 'AbsenBocil',
        version: '2.1',
        exportedAt: Date.now(),
        absensi: allAbsensi,
        schedules: allSchedules
      };
      const jsonContent = JSON.stringify(backupData, null, 2);
      downloadFile(jsonContent, `absenbocil-cadangan-lengkap-${new Date().toISOString().split('T')[0]}.json`, 'application/json;charset=utf-8;');
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
      await db.absensi.bulkAdd(sampleRecords);
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

      const dateTokens = matchRecords.length > 0
        ? matchRecords.map(r => formatDateShort(r.tanggal)).join(', ')
        : '-';

      const allNamesInPeriod = matchRecords.flatMap(r => r.peserta);
      const uniqueNames: string[] = Array.from(new Set(allNamesInPeriod.map(n => n.trim()).filter(n => n.length > 0)));

      uniqueNames.sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));

      const namesJoined = uniqueNames.length > 0 ? uniqueNames.join(', ') : '-';

      lines.push(period.title);
      if (period.isWeek1) {
        lines.push(`* Tgl kursus : ${dateTokens}`);
        lines.push(`* Peserta Hadir : ${namesJoined}`);
      } else {
        lines.push(`* Tgl Kursus : ${dateTokens}`);
        lines.push(`* Peserta : ${namesJoined}`);
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
        showToast('Salin otomatis gagal. Mohon pilih dan salin teks secara manual.', 'error');
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
