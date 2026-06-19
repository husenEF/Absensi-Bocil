import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, 
  Users, 
  BookOpen, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  Plus, 
  FileText, 
  Database, 
  Smartphone, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  UserPlus, 
  HelpCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  Save,
  Info,
  Download,
  CheckSquare,
  Square,
  Sun,
  Moon,
  Bell,
  Video,
  ExternalLink,
  AlertTriangle,
  Volume2,
  FileSpreadsheet
} from 'lucide-react';
import { db, AbsensiRecord, ScheduleRecord } from './db';
import { formatIndonesianDate, formatDateShort } from './utils/date';

interface BiMonthlyPeriod {
  year: number;
  blockIndex: number; // 0: Jan-Feb, 1: Mar-Apr, 2: May-Jun, 3: Jul-Aug, 4: Sep-Oct, 5: Nov-Dec
  label: string;
  key: string;
}

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
  const month = date.getMonth(); // 0-11
  const blockIndex = Math.floor(month / 2); // 0-5
  return { year, blockIndex, key: `${year}-${blockIndex}` };
};

const getOccurrenceThisWeek = (hariName: string, waktuStr: string) => {
  const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayIndex = INDO_DAYS.indexOf(hariName);
  if (dayIndex === -1) return new Date();

  const now = new Date();
  const currentDayIndex = now.getDay();
  const daysDiff = dayIndex - currentDayIndex;

  const occurrence = new Date();
  occurrence.setDate(now.getDate() + daysDiff);
  
  const [h, m] = waktuStr.split(':').map(Number);
  occurrence.setHours(h, m, 0, 0);
  return occurrence;
};

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'input' | 'riwayat' | 'laporan' | 'jadwal'>('input');

  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme-mode');
    return saved === 'dark';
  });

  // Input States
  const [tanggalInput, setTanggalInput] = useState<string>('2026-06-18'); // Defaults to June 18, 2026
  const [namesInput, setNamesInput] = useState<string>('');
  
  // Link attendance with schedule
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | undefined>(undefined);
  const [lastAttendanceForSchedule, setLastAttendanceForSchedule] = useState<string[]>([]);
  
  // Database States
  const [records, setRecords] = useState<AbsensiRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Synchronize with previous attendance names when selectedScheduleId changes
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

  // Edit states for individual records in History
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNames, setEditingNames] = useState<string>('');
  const [editingTanggal, setEditingTanggal] = useState<string>('');
  const [editingScheduleId, setEditingScheduleId] = useState<number | undefined>(undefined);

  // Selection state for export list
  const [selectedRecordIds, setSelectedRecordIds] = useState<number[]>([]);

  // Selection state for weekly report generator
  const [reportSelectedRecordIds, setReportSelectedRecordIds] = useState<number[]>([]);
  // Filter report records by schedule/reminder
  const [reportScheduleFilter, setReportScheduleFilter] = useState<string>('all');

  // Report Generator States
  const [reportText, setReportText] = useState<string>('');
  const [reportGenerated, setReportGenerated] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('');

  // App Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [onlineStatus, setOnlineStatus] = useState<boolean>(navigator.onLine);

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Meet Schedule Management States
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [scheduleTitle, setScheduleTitle] = useState<string>('');
  const [scheduleHari, setScheduleHari] = useState<string>('Senin');
  const [scheduleWaktu, setScheduleWaktu] = useState<string>('19:00');
  const [scheduleRemindMinutesBefore, setScheduleRemindMinutesBefore] = useState<number>(15);

  // Ref to the generated report textarea for fallback copying
  const reportTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Track online/offline status
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

  // Set up PWA installation prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Fetch all attendance records from IndexedDB
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

  // Fetch all schedules from DB
  const loadSchedules = async () => {
    try {
      const data = await db.schedules.toArray();
      const INDO_DAYS_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      // Sort chronologically (hari index, then waktu, then tanggal fallback)
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
      console.error('Failed to load meet schedules from IndexedDB:', error);
    }
  };

  useEffect(() => {
    loadRecords();
    loadSchedules();
  }, []);

  // Request browser Notification permissions
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

  // Sound & system notification trigger
  const triggerNotification = (title: string, bodyText: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: bodyText,
          icon: '/favicon.ico'
        });
      } catch (e) {
        console.error('HTML5 Notification error:', e);
      }
    }
    showToast(`${title}: ${bodyText}`, 'info');

    // Trigger synthesiser chime sound on alert
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

  // Background Checker: Runs every 12 seconds to scan database schedules and trigger alerts
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = new Date();
      schedules.forEach(async (sched) => {
        // 1. If it's a weekly recurring schedule based on day of week (hari)
        if (sched.hari) {
          const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
          const dayIndex = INDO_DAYS.indexOf(sched.hari);
          if (dayIndex === -1) return;

          // Auto-reset notified flag if we are on a different day than scheduled day, to refresh visual cues
          if (sched.notified && now.getDay() !== dayIndex && sched.id) {
            await db.schedules.update(sched.id, { notified: false });
            loadSchedules();
            return;
          }

          if (now.getDay() !== dayIndex) return;

          // Parse scheduled start time
          const [h, m] = sched.waktu.split(':').map(Number);
          const schedTime = new Date(now);
          schedTime.setHours(h, m, 0, 0);

          // Check if we already notified for this exact date today
          const todayDateString = now.toLocaleDateString('sv'); // sv locale returns YYYY-MM-DD
          if (sched.lastNotifiedDate === todayDateString) return;

          // Compute threshold for warning
          const reminderThresholdMs = (sched.remindMinutesBefore || 0) * 60 * 1000;
          const targetAlertTime = new Date(schedTime.getTime() - reminderThresholdMs);

          // Calculate differences
          const timeDiff = now.getTime() - targetAlertTime.getTime();
          const pastEventDiff = now.getTime() - schedTime.getTime();

          // Trigger if current time is past or equal to target alert time, and event hasn't already started more than 40 minutes ago
          if (timeDiff >= 0 && pastEventDiff < 40 * 60 * 1000) {
            const inMins = sched.remindMinutesBefore === 0 
              ? 'sekarang juga' 
              : `${sched.remindMinutesBefore} menit lagi`;

            triggerNotification(
              `🔔 PENGINGAT JADWAL`, 
              `"${sched.title}" akan dimulai ${inMins}! (${sched.waktu} WIB).`
            );

            // Mark as notified in Dexie
            if (sched.id) {
              await db.schedules.update(sched.id, { notified: true, lastNotifiedDate: todayDateString });
            }
            // Refresh lists
            loadSchedules();
          }
        } 
        // 2. Legacy fallback if it's based on specific date (tanggal)
        else if (sched.tanggal) {
          if (sched.notified) return;

          const [h, m] = sched.waktu.split(':').map(Number);
          const schedTime = new Date(sched.tanggal);
          schedTime.setHours(h, m, 0, 0);

          const reminderThresholdMs = (sched.remindMinutesBefore || 0) * 60 * 1000;
          const targetAlertTime = new Date(schedTime.getTime() - reminderThresholdMs);

          const timeDiff = now.getTime() - targetAlertTime.getTime();
          const pastEventDiff = now.getTime() - schedTime.getTime();

          if (timeDiff >= 0 && pastEventDiff < 40 * 60 * 1000) {
            const inMins = sched.remindMinutesBefore === 0 
              ? 'sekarang juga' 
              : `${sched.remindMinutesBefore} menit lagi`;

            triggerNotification(
              `🔔 PENGINGAT KURSUS`, 
              `"${sched.title}" akan dimulai ${inMins}! (${sched.waktu} WIB).`
            );

            // Mark as notified in Dexie
            if (sched.id) {
              await db.schedules.update(sched.id, { notified: true });
            }
            // Refresh lists
            loadSchedules();
          }
        }
      });
    }, 12000);

    return () => clearInterval(checkInterval);
  }, [schedules]);

  // Check if today is the 3rd week of the month (days 15 to 21 inclusive)
  const todayIsThirdWeek = useMemo(() => {
    const today = new Date();
    const day = today.getDate();
    return day >= 15 && day <= 21;
  }, []);

  // Theme support: Add or remove 'dark' class on element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme-mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme-mode', 'light');
    }
  }, [darkMode]);

  // Synchronize selection state for report generator
  const availablePeriods = useMemo<BiMonthlyPeriod[]>(() => {
    const periodsMap = new Map<string, BiMonthlyPeriod>();

    // Add current date's period as default
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

    // Add periods from records
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

    // Sort periods chronologically
    return Array.from(periodsMap.values()).sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year;
      }
      return a.blockIndex - b.blockIndex;
    });
  }, [records]);

  // Set default selected period key when options are loaded
  useEffect(() => {
    if (availablePeriods.length > 0 && !selectedPeriodKey) {
      // Prefer the Mei-Juni 2026 period with sample data first
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
    if (reportScheduleFilter === 'all') {
      return recordsInSelectedPeriod;
    }
    if (reportScheduleFilter === 'unlinked') {
      return recordsInSelectedPeriod.filter(r => !r.scheduleId);
    }
    const schedId = Number(reportScheduleFilter);
    return recordsInSelectedPeriod.filter(r => r.scheduleId === schedId);
  }, [recordsInSelectedPeriod, reportScheduleFilter]);

  const bimonthlyWeeks = useMemo(() => {
    if (!currentPeriod) return [];

    // Filter all records belonging to this 2-month period
    const periodRecords = records.filter(r => {
      const { key } = getRecordBiMonth(r.tanggal);
      return key === currentPeriod.key;
    });

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

      let periodLabel = '';
      if (startMonth === endMonth) {
        periodLabel = `${startDay}-${endDay} ${startMonth} ${startYear}`;
      } else {
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

  // Synchronize selection state for report generator
  useEffect(() => {
    if (filteredRecordsForReport.length > 0) {
      const existingIds = filteredRecordsForReport.map(r => r.id).filter(Boolean) as number[];
      setReportSelectedRecordIds(existingIds);
    } else {
      setReportSelectedRecordIds([]);
    }
    // Clear previous report output on period change
    setReportGenerated(false);
    setReportText('');
  }, [selectedPeriodKey, filteredRecordsForReport]);

  // Custom helper: Capitalize each word nicely (e.g. "budi santoso" -> "Budi Santoso")
  const capitalizeWords = (str: string): string => {
    return str
      .split(/\s+/)
      .map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Extract a deduplicated list of all registered student names from historical logs
  const allRegisteredStudents = useMemo(() => {
    const set = new Set<string>();
    records.forEach(rec => {
      rec.peserta.forEach(name => {
        const clean = name.trim();
        if (clean) set.add(clean);
      });
    });
    
    // If database is empty, supply useful default quick names for immediate use
    if (set.size === 0) {
      return ['Husen', 'Budi', 'Ahmad', 'Siti', 'Umar', 'Fatimah'];
    }
    
    // Sort alphabetically
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
  }, [records]);

  // Which names are currently typed in the input textarea
  const currentActiveNames = useMemo(() => {
    return namesInput
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);
  }, [namesInput]);

  // Fast trigger helper: show notifications
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Add or remove a student name from the textarea when clicking their badge
  const handleToggleStudent = (studentName: string) => {
    const current = [...currentActiveNames];
    const index = current.findIndex(name => name.toLowerCase() === studentName.toLowerCase());

    if (index >= 0) {
      // Exists: remove it
      const filtered = current.filter((_, idx) => idx !== index);
      setNamesInput(filtered.join(', '));
    } else {
      // Missing: append it
      const formattedName = capitalizeWords(studentName);
      const updatedNames = [...current, formattedName];
      setNamesInput(updatedNames.join(', '));
    }
  };

  // Check if a badge name is selected
  const isStudentSelected = (studentName: string) => {
    return currentActiveNames.some(name => name.toLowerCase() === studentName.toLowerCase());
  };

  // Save custom schedule entry to indexDB
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

  // Remove a schedule entry from database
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

  // Handle Form Submission: Create a new Daily Attendance
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

    // Process comma-separated list
    const parsedPeserta = namesInput
      .split(',')
      .map(name => capitalizeWords(name.trim()))
      .filter(name => name.length > 0);

    if (parsedPeserta.length === 0) {
      showToast('Daftar peserta tidak valid.', 'error');
      return;
    }

    try {
      // Check if attendance for this date already exists
      const existing = await db.absensi.where('tanggal').equals(tanggalInput).first();
      
      if (existing) {
        // Confirm overwrite
        const confirmOverwrite = window.confirm(
          `Data presensi untuk tanggal ${formatIndonesianDate(tanggalInput)} sudah ada. Apakah Anda ingin memperbaruinya?`
        );
        if (!confirmOverwrite) return;

        // Perform update
        await db.absensi.update(existing.id!, {
          peserta: parsedPeserta,
          scheduleId: selectedScheduleId,
          createdAt: Date.now()
        });
        showToast(`Presensi tanggal ${formatIndonesianDate(tanggalInput)} berhasil diperbarui!`, 'success');
      } else {
        // Create new record
        await db.absensi.add({
          tanggal: tanggalInput,
          peserta: parsedPeserta,
          scheduleId: selectedScheduleId,
          createdAt: Date.now()
        });
        showToast('Presensi berhasil disimpan!', 'success');
      }

      // Reset textarea, keep tanggal
      setNamesInput('');
      setSelectedScheduleId(undefined);
      loadRecords();
      
      // Auto-toggle to history to see update
      setTimeout(() => {
        setActiveTab('riwayat');
      }, 500);

    } catch (err) {
      console.error('Error adding attendance:', err);
      showToast('Gagal menyimpan ke database lokal.', 'error');
    }
  };

  // Delete Attendance Record
  const handleDeleteRecord = async (id: number, tanggal: string) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus data presensi tanggal ${formatIndonesianDate(tanggal)}?`
    );
    if (!confirmDelete) return;

    try {
      await db.absensi.delete(id);
      showToast('Data presensi berhasil dihapus.', 'success');
      
      // Re-trigger report compilation if it was derived from this
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

  // Inline edit handler
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

  // Selection and Export Logic handlers
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

  // Pre-seed mock data for May-June 2026 for review and fast testing
  const handleLoadSampleData = async () => {
    const baseTime = 1780447307000; // June 2026 Epoch
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
      
      // Auto-jump to reports after seeding
      setActiveTab('laporan');
      setReportGenerated(false);
      
    } catch (error) {
      console.error('Failed to load sample data:', error);
      showToast('Gagal memuat data contoh.', 'error');
    }
  };

  // Generate Weekly Report (Critically configured with dynamic periods)
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
      // Find all classes falling inside this period and that are selected for the report
      const matchRecords = records.filter(r => 
        r.id && 
        reportSelectedRecordIds.includes(r.id) && 
        r.tanggal >= period.start && 
        r.tanggal <= period.end
      );
      
      // Sort classes chronologically
      matchRecords.sort((a, b) => a.tanggal.localeCompare(b.tanggal));

      // 1. Format Dates
      const dateTokens = matchRecords.length > 0
        ? matchRecords.map(r => formatDateShort(r.tanggal)).join(', ')
        : '-';

      // 2. Format unique union list of student names
      const allNamesInPeriod = matchRecords.flatMap(r => r.peserta);
      const uniqueNames: string[] = Array.from(new Set(allNamesInPeriod.map(n => n.trim()).filter(n => n.length > 0)));
      
      // Sort alphabetical case-insensitive
      uniqueNames.sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
      
      const namesJoined = uniqueNames.length > 0 ? uniqueNames.join(', ') : '-';

      // Build text exactly conforming to requirements:
      // - Week 1: * Tgl kursus : and * Peserta Hadir : 
      // - Other weeks: * Tgl Kursus : and * Peserta :
      lines.push(period.title);
      if (period.isWeek1) {
        lines.push(`* Tgl kursus : ${dateTokens}`);
        lines.push(`* Peserta Hadir : ${namesJoined}`);
      } else {
        lines.push(`* Tgl Kursus : ${dateTokens}`);
        lines.push(`* Peserta : ${namesJoined}`);
      }
      lines.push(""); // Spacing
    });

    const compiledReport = lines.join('\n').trim() + "\n";
    setReportText(compiledReport);
    setReportGenerated(true);
    showToast('Laporan berhasil diproses!', 'success');
  };

  // Copy to Clipboard (With fallback and high sandboxed safety)
  const handleCopyReport = async () => {
    if (!reportText) return;

    try {
      // Native modern browser copy
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      showToast('Laporan disalin ke Clipboard!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn('Navigator clipboard failed, compiling older fallback copy:', err);
      try {
        // Fallback DOM Selection copy
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased transition-colors duration-200">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-bounce duration-300">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium ${
            toast.type === 'success' ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-250 border-teal-200/80 dark:border-teal-900/50' : 
            toast.type === 'error' ? 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-250 border-rose-200/80 dark:border-rose-900/50' : 
            'bg-slate-800 dark:bg-slate-900 text-white border-slate-700 dark:border-slate-800'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-teal-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Hero Header Area - Clean Minimalism Theme style */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-6 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            
            {/* Logo and App Title */}
            <div>
              <h1 className="text-lg font-extrabold text-teal-600 dark:text-teal-400 tracking-tight flex items-center gap-1.5">
                <span>AbsenBocil 😊</span>
              </h1>
              <p className="text-xs text-slate-505 dark:text-slate-400 mt-1 select-none font-medium">Sistem Pencatatan Offline & Laporan Otomatis</p>
            </div>

            {/* Offline, Dark Mode and Install Status Panel */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Dark Mode Toggle Button */}
              <button
                type="button"
                onClick={() => setDarkMode(prev => !prev)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title={darkMode ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              {/* Online indicator badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                onlineStatus 
                  ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/15' 
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/15'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${onlineStatus ? 'bg-teal-500 animate-pulse' : 'bg-amber-500'}`}></span>
                {onlineStatus ? 'Online' : 'Mode Offline'}
              </div>

              {/* Install PWA Button if available */}
              <button
                onClick={executePWAPrompt}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer shadow-xs active:scale-95"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Pasang Aplikasi</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        
        {/* Helper quick notice for Offline mode / Database */}
        <div className="mb-6 p-4 rounded-xl bg-teal-50/40 dark:bg-teal-950/15 border border-teal-100 dark:border-teal-900/40 flex items-start gap-3 transition-colors duration-200">
          <Database className="w-5 h-5 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <span className="font-bold text-teal-900 dark:text-teal-350">Penyimpanan Terproteksi Lokal:</span> Laporan ini diproses di database <span className="font-semibold text-teal-950 dark:text-teal-200">IndexedDB</span> internal browser Anda. Data bersifat lokal dan super aman.
          </div>
        </div>

        {/* Dynamic Reminder for Week 3 Report */}
        {todayIsThirdWeek && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 dark:bg-amber-500/5 text-amber-800 dark:text-amber-400 border border-amber-500/20 flex items-start gap-3 transition-colors">
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs sm:text-sm leading-relaxed flex-1">
              <span className="font-bold text-amber-900 dark:text-amber-350">⚠️ PENGINGAT PEKAN KE-3 PEKANAN:</span> Saat ini adalah pekan ke-3 (rentang tanggal 15 s.d 21). Jangan lupa memproses dan mengirimkan <b>Laporan Mingguan</b> bulan ini ke pihak koordinator / wali murid!
              <div className="mt-2 flex items-center gap-2">
                <button 
                  onClick={() => setActiveTab('laporan')}
                  className="px-2.5 py-1 text-2xs font-bold text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md hover:teal-50 transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Mulai Buat Laporan</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Global Dashboard Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors duration-200">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Hari Tercatat</p>
              <h3 className="text-2.5xl font-bold text-slate-905 dark:text-white mt-1">{records.length} <span className="text-xs font-normal text-slate-500">hari</span></h3>
            </div>
            <div className="p-3 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors duration-200">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Daftar Siswa/Peserta</p>
              <h3 className="text-2.5xl font-bold text-slate-905 dark:text-white mt-1">{allRegisteredStudents.length} <span className="text-xs font-normal text-slate-500">orang</span></h3>
            </div>
            <div className="p-3 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors duration-200">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Demo / Reviewer</p>
              <button
                onClick={handleLoadSampleData}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                <span>Isi Data Contoh 2026</span>
              </button>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg">
              <Info className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs Controller */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 font-medium text-sm overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('input')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'input'
                ? 'border-teal-600 dark:border-teal-500 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-slate-505 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Mulai Presensi</span>
          </button>
          
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'riwayat'
                ? 'border-teal-600 dark:border-teal-500 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-slate-505 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Riwayat Absensi</span>
            {records.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-3xs font-bold leading-none bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 rounded-full">
                {records.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('laporan')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'laporan'
                ? 'border-teal-600 dark:border-teal-500 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-slate-505 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Generator Laporan Mingguan</span>
          </button>

          <button
            onClick={() => setActiveTab('jadwal')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'jadwal'
                ? 'border-teal-600 dark:border-teal-500 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-slate-505 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Jadwal & Pengingat</span>
            {schedules.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-3xs font-bold leading-none bg-teal-600 dark:bg-teal-500 text-white rounded-full">
                {schedules.filter(s => {
                  const now = new Date();
                  const [h, m] = s.waktu.split(':').map(Number);
                  const sTime = new Date(s.tanggal);
                  sTime.setHours(h, m, 0, 0);
                  return sTime.getTime() >= now.getTime();
                }).length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Form Input Presensi Harian */}
        {activeTab === 'input' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 transition-colors duration-200">
            <div className="mb-6">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Input Absensi Peserta Didik</h2>
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
                Catat kehadiran harian kelas Anda. Nama peserta baru akan otomatis terdaftar di database lokal.
              </p>
            </div>

            <form onSubmit={handleSaveAttendance} className="space-y-6">
              
              {/* Date Input Box & Connected Schedule Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2" htmlFor="tanggal_kegiatan">
                    Pilih Tanggal Kegiatan / Kursus
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      id="tanggal_kegiatan"
                      type="date"
                      value={tanggalInput}
                      onChange={(e) => setTanggalInput(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500/10 focus:border-teal-600 dark:focus:border-teal-500 text-sm font-medium transition-colors"
                    />
                  </div>
                  {tanggalInput && (
                    <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-1.5">
                      Terpilih: {formatIndonesianDate(tanggalInput)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2" htmlFor="linked_schedule">
                    Hubungkan Sesi Jadwal Belajar <span className="text-slate-400 dark:text-slate-550 font-medium">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <select
                      id="linked_schedule"
                      value={selectedScheduleId || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setSelectedScheduleId(undefined);
                        } else {
                          const schedId = Number(val);
                          setSelectedScheduleId(schedId);
                          const foundSched = schedules.find(s => s.id === schedId);
                          if (foundSched && foundSched.hari) {
                            const occurrences = getOccurrenceThisWeek(foundSched.hari, foundSched.waktu);
                            const dateStr = occurrences.toLocaleDateString('sv');
                            setTanggalInput(dateStr);
                          }
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500/10 focus:border-teal-600 dark:focus:border-teal-500 text-sm font-medium transition-colors cursor-pointer"
                    >
                      <option value="">-- Tidak Terhubung ke Jadwal --</option>
                      {schedules.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} (Setiap {s.hari} - {s.waktu})
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedScheduleId ? (
                    <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold mt-1.5 flex items-center gap-1 leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                      Terhubung ke Jadwal: {schedules.find(s => s.id === selectedScheduleId)?.title}
                    </p>
                  ) : (
                    <p className="text-3xs text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed">
                      Hubungkan sesi untuk menyalin presensi pertemuan sebelumnya.
                    </p>
                  )}
                </div>
              </div>

              {/* Text Area for attendee names */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2" htmlFor="names_textarea">
                  Nama-Nama Peserta yang Hadir
                </label>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                  Ketik nama-nama peserta yang hadir dipisahkan menggunakan tanda koma (,). Huruf kapital akan dikoreksi otomatis.
                </p>
                <textarea
                  id="names_textarea"
                  value={namesInput}
                  onChange={(e) => setNamesInput(e.target.value)}
                  placeholder="Contoh: Husen, Budi, Ahmad, Siti, Umar, Fatimah"
                  rows={4}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/10 focus:border-teal-600 dark:focus:border-teal-500 text-sm font-sans transition-colors"
                ></textarea>
              </div>

              {/* Previous Attendance Pre-fill Suggestion */}
              {selectedScheduleId && lastAttendanceForSchedule.length > 0 && (
                <div className="p-3 bg-teal-500/5 dark:bg-teal-950/15 border border-teal-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in/70">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-2xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>Ditemukan daftar presensi sesi sebelumnya ({lastAttendanceForSchedule.length} peserta):</span>
                    </p>
                    <p className="text-3xs text-slate-500 dark:text-slate-400 truncate font-mono">
                      {lastAttendanceForSchedule.join(', ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNamesInput(lastAttendanceForSchedule.join(', '));
                      showToast('Daftar nama berhasil disalin dari pertemuan terakhir!', 'success');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-500 dark:hover:bg-teal-600 rounded-lg text-3xs font-extrabold transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Salin Nama
                  </button>
                </div>
              )}

              {/* Master Smart List: Auto selection list */}
              {allRegisteredStudents.length > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200/60 dark:border-slate-850">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                      Daftar Cepat Peserta ({allRegisteredStudents.length})
                    </h4>
                    <span className="inline-flex items-center gap-1 text-3xs text-slate-500 dark:text-slate-400">
                      <HelpCircle className="w-3 h-3" />
                      Klik nama untuk menambah/menghapus
                    </span>
                  </div>
                  
                  {/* Grid layout of all known students */}
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                    {allRegisteredStudents.map((child, idx) => {
                      const isSelected = isStudentSelected(child);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleStudent(child)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'bg-teal-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-705 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <span>{child}</span>
                          {isSelected ? (
                            <Check className="w-3 h-3 text-white" />
                          ) : (
                            <Plus className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Simpan Presensi Harian</span>
                </button>
                
                {namesInput.trim() && (
                  <button
                    type="button"
                    onClick={() => setNamesInput('')}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Kosongkan Input</span>
                  </button>
                )}
              </div>

            </form>
          </div>
        )}

        {/* Tab 2: Riwayat Absensi & Manajemen Data */}
        {activeTab === 'riwayat' && (
          <div className="space-y-4">
            
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 mb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Riwayat Data Absensi</h2>
                  <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
                    Seluruh riwayat kehadiran kelas Anda, diurutkan dari tanggal terbaru.
                  </p>
                </div>
                {records.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('Hapus seluruh data presensi di aplikasi? Tindakan ini tidak bisa dibatalkan!')) {
                        db.absensi.clear().then(() => {
                          showToast('Semua data berhasil dibersihkan.', 'success');
                          loadRecords();
                        });
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/15 hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-650 dark:text-rose-400 text-xs font-semibold rounded-lg transition-colors border border-rose-200 dark:border-rose-900/40 cursor-pointer self-start sm:self-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Semua Data</span>
                  </button>
                )}
              </div>
            </div>

            {/* Menu Ekspor & Seleksi Data */}
            {records.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4 transition-colors duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-teal-600 dark:text-teal-400 animate-pulse" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Seleksi & Ekspor Presensi</h3>
                      <p className="text-3xs text-slate-500 dark:text-slate-400">Pilih baris presensi tertentu untuk diekspor ke Excel (CSV) atau JSON</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border border-teal-100/60 dark:border-teal-900/30">
                    {selectedRecordIds.length} dari {records.length} Terpilih
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllRecords}
                      className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-705 rounded-lg cursor-pointer transition-colors"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllRecords}
                      disabled={selectedRecordIds.length === 0}
                      className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-705 bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg cursor-pointer transition-colors"
                    >
                      Batal Pilih
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      disabled={selectedRecordIds.length === 0}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
                      title="Ekspor sebagai file CSV (Excel)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Ekspor CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportJSON}
                      disabled={selectedRecordIds.length === 0}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors border border-teal-100"
                      title="Ekspor sebagai file JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Ekspor JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopySelectedCSV}
                      disabled={selectedRecordIds.length === 0}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      title="Salin CSV ke Clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Memuat basis data IndexedDB...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-full w-14 h-14 mx-auto mb-4 flex items-center justify-center text-slate-400 dark:text-slate-500">
                  <Calendar className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Belum Ada Riwayat Absensi</h3>
                <p className="text-xs sm:text-sm text-slate-550 dark:text-slate-400 max-w-md mx-auto mt-2">
                  Database lokal Anda masih kosong. Silakan masuk ke tab <b>Mulai Presensi</b> untuk mencatatkan absensi hari pertama Anda, atau klik tombol <b>Isi Data Contoh 2026</b> di kartu ringkasan di atas untuk memuat simulasi data.
                </p>
                
                <button
                  onClick={() => setActiveTab('input')}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Mulai Isi Absensi</span>
                </button>
              </div>
            ) : (
              // Display records queue
              <div className="space-y-3">
                {records.map((record) => {
                  const isEditingThis = editingId === record.id;
                  
                  return (
                    <div 
                      key={record.id} 
                      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      {isEditingThis ? (
                        // EDIT FORM EXPANDED INLINE
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Edit Data Presensi</span>
                            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">ID: #{record.id}</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-655 dark:text-slate-400 mb-1">Tanggal Kegiatan</label>
                              <input
                                type="date"
                                value={editingTanggal}
                                onChange={(e) => setEditingTanggal(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-655 dark:text-slate-400 mb-1">Hubungkan Sesi Jadwal</label>
                              <select
                                value={editingScheduleId || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditingScheduleId(val === '' ? undefined : Number(val));
                                }}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-905 dark:text-slate-100 rounded-lg text-sm transition-colors"
                              >
                                <option value="">-- Tidak Terhubung --</option>
                                {schedules.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.title} ({s.hari})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Peserta Hadir (pisahkan koma)</label>
                              <textarea
                                value={editingNames}
                                onChange={(e) => setEditingNames(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-805 text-slate-900 dark:text-slate-100 rounded-lg text-sm transition-colors"
                              ></textarea>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-805">
                            <button
                              onClick={() => saveEditedRecord(record.id!)}
                              className="inline-flex items-center gap-1 px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 text-xs font-bold rounded-lg cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Simpan</span>
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="inline-flex items-center gap-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Batal</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        // STANDARD RECORD DISPLAY
                        <div className="flex items-start gap-4">
                          {/* Left Checkbox */}
                          <button
                            type="button"
                            onClick={() => record.id && handleToggleSelectRecord(record.id)}
                            className="mt-1 flex-shrink-0 cursor-pointer text-slate-400 dark:text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                            title={selectedRecordIds.includes(record.id!) ? 'Batalkan Pilihan' : 'Pilih untuk Ekspor'}
                          >
                            {selectedRecordIds.includes(record.id!) ? (
                              <CheckSquare className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-350 dark:text-slate-600" />
                            )}
                          </button>

                          {/* Details Content */}
                          <div className="flex-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            {/* Left contents */}
                            <div className="space-y-2 col-span-1">
                              {/* Date Badge */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                                  <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                  <span>{formatIndonesianDate(record.tanggal)}</span>
                                </span>
                                
                                <span className="text-3xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md border border-slate-202 dark:border-slate-700 font-mono">
                                  {formatDateShort(record.tanggal)}
                                </span>
                              </div>

                              {/* Attendance statistics tag */}
                              <p className="text-xs font-semibold text-slate-550 dark:text-slate-400 uppercase tracking-wide">
                                Peserta Hadir ({record.peserta.length} orang)
                              </p>

                              {/* Participant list as tags */}
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {record.peserta.map((name, idx2) => (
                                  <span 
                                    key={idx2} 
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-teal-50/60 dark:bg-teal-950/30 text-teal-800 dark:text-teal-400 border border-teal-100/50 dark:border-teal-900/30"
                                  >
                                    {name}
                                  </span>
                                ))}
                              </div>

                              {/* Connected Schedule Info (Help Text Style) */}
                              {record.scheduleId && (
                                <div className="pt-1.5 animate-fade-in/70">
                                  {(() => {
                                    const connectedSchedule = schedules.find(s => s.id === record.scheduleId);
                                    if (!connectedSchedule) return null;
                                    return (
                                      <p className="text-3xs text-slate-500 dark:text-slate-450 flex items-center gap-1.5 font-medium select-none bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/40 px-2.5 py-1 rounded-md w-fit">
                                        <Clock className="w-3.5 h-3.5 text-teal-600/70 dark:text-teal-450/70 animate-pulse" />
                                        <span>Sesi terhubung: <span className="font-bold text-teal-700 dark:text-teal-400">{connectedSchedule.title}</span> (Setiap {connectedSchedule.hari} @ {connectedSchedule.waktu} WIB)</span>
                                      </p>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>

                            {/* Right Controls */}
                            <div className="flex items-center gap-2 sm:self-start self-end shrink-0">
                              <button
                                onClick={() => startEditing(record)}
                                className="inline-flex items-center justify-center p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                                title="Edit Data"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record.id!, record.tanggal)}
                                className="inline-flex items-center justify-center p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/25 rounded-lg cursor-pointer transition-colors"
                                title="Hapus Data"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Generator Laporan Mingguan */}
        {activeTab === 'laporan' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 transition-colors duration-200">
            
            {/* Context Heading */}
            <div className="mb-6">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Laporan Mingguan ({currentPeriod ? currentPeriod.label : 'Mei - Juni 2026'})</h2>
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
                Kompilasi otomatis rekap kehadiran. Sistem akan membaca database lokal, memetakan data per minggu sesuai parameter tanggal yang Anda simpan, dan membuat teks laporan presisi tinggi yang dikonfigurasikan agar siap disalin langsung ke WhatsApp atau diposkan sebagai Markdown.
              </p>
            </div>

            {/* Pagination Selector per 2 Bulan */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 mb-6 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-2xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Periode Laporan Saring:</span>
                <span className="text-xs font-bold text-teal-700 dark:text-teal-400 font-sans">
                  {currentPeriod?.label || 'Memuat...'}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={availablePeriods.findIndex(p => p.key === selectedPeriodKey) <= 0}
                  onClick={() => setSelectedPeriodKey(availablePeriods[availablePeriods.findIndex(p => p.key === selectedPeriodKey) - 1].key)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 hover:text-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit cursor-pointer transition-all"
                  title="Periode Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <select
                  value={selectedPeriodKey || ''}
                  onChange={(e) => setSelectedPeriodKey(e.target.value)}
                  className="text-2xs font-extrabold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-850 dark:text-slate-200 focus:outline-hidden transition-colors cursor-pointer"
                >
                  {availablePeriods.map(p => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={selectedPeriodKey ? availablePeriods.findIndex(p => p.key === selectedPeriodKey) >= availablePeriods.length - 1 : true}
                  onClick={() => setSelectedPeriodKey(availablePeriods[availablePeriods.findIndex(p => p.key === selectedPeriodKey) + 1].key)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 hover:text-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit cursor-pointer transition-all"
                  title="Periode Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Guide details of weeks */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200/50 dark:border-slate-800 mb-6 text-xs text-slate-600 dark:text-slate-300 space-y-2.5 transition-colors">
              <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-2xs flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Matriks Rentang Periode Lapor
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1">
                {bimonthlyWeeks.map((week) => (
                  <li key={week.id} className="flex items-center gap-1.5 text-slate-705 dark:text-slate-350">
                    <ChevronRight className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Minggu {week.id}: <b className="text-slate-900 dark:text-slate-100">{week.title}</b></span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Interactive selector for generated presences */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-teal-600" />
                    <span>Pilih Presensi yang Disertakan ({reportSelectedRecordIds.length} terpilih)</span>
                  </h3>
                  <p className="text-3xs text-slate-505 dark:text-slate-400 mt-0.5">Saring hanya menampilkan data presensi yang sesuai dengan periode aktif di atas.</p>
                </div>
                
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <button
                    type="button"
                    disabled={filteredRecordsForReport.length === 0}
                    onClick={() => setReportSelectedRecordIds(filteredRecordsForReport.map(r => r.id!).filter(Boolean))}
                    className="px-2.5 py-1 text-4xs font-bold tracking-wider uppercase bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 rounded hover:bg-teal-100 dark:hover:bg-teal-900/40 cursor-pointer transition-colors disabled:opacity-40"
                  >
                    Centang Semua
                  </button>
                  <button
                    type="button"
                    disabled={filteredRecordsForReport.length === 0}
                    onClick={() => setReportSelectedRecordIds([])}
                    className="px-2.5 py-1 text-4xs font-bold tracking-wider uppercase bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors disabled:opacity-40"
                  >
                    Hapus Semua
                  </button>
                </div>
              </div>

              {/* Filter By Schedule / Reminder Dropdown */}
              <div className="p-3.5 bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200/45 dark:border-slate-800/60 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-650 dark:text-slate-400">Filter Sesi Jadwal / Pengingat:</span>
                </div>
                <div className="relative">
                  <select
                    value={reportScheduleFilter}
                    onChange={(e) => setReportScheduleFilter(e.target.value)}
                    className="w-full md:w-80 pl-3 pr-8 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-850 dark:text-slate-200 focus:outline-hidden transition-colors cursor-pointer text-xs font-semibold"
                  >
                    <option value="all">📁 Semua Sesi di Periode Ini ({recordsInSelectedPeriod.length})</option>
                    <option value="unlinked">❓ Hanya Sesi Tanpa Hubungan Jadwal ({recordsInSelectedPeriod.filter(r => !r.scheduleId).length})</option>
                    {schedules.map((s) => {
                      const count = recordsInSelectedPeriod.filter(r => r.scheduleId === s.id).length;
                      return (
                        <option key={s.id} value={s.id}>
                          📅 {s.title} ({s.hari} @ {s.waktu}) [Ada {count} Sesi]
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {filteredRecordsForReport.length === 0 ? (
                <p className="text-xs text-slate-550 dark:text-slate-400 italic py-2">
                  {recordsInSelectedPeriod.length === 0
                    ? `Belum ada data presensi tersimpan untuk periode ${currentPeriod?.label || 'ini'}.`
                    : "Tidak ada data presensi yang sesuai dengan filter jadwal terpilih."}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {filteredRecordsForReport.map((r) => {
                    const isChecked = reportSelectedRecordIds.includes(r.id!);
                    const connectedSched = schedules.find(sched => sched.id === r.scheduleId);
                    return (
                      <label 
                        key={r.id} 
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-all duration-150 ${
                          isChecked 
                            ? 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/40 font-semibold text-teal-950 dark:text-teal-300' 
                            : 'bg-white dark:bg-slate-950 border-slate-205 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (r.id) {
                              setReportSelectedRecordIds(prev => 
                                prev.includes(r.id!) ? prev.filter(id => id !== r.id) : [...prev, r.id!]
                              );
                            }
                          }}
                          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500/25 h-3.5 w-3.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold truncate text-slate-800 dark:text-slate-200">
                            {formatIndonesianDate(r.tanggal)}
                          </div>
                          {connectedSched && (
                            <div className="text-4xs text-teal-655 dark:text-teal-400 font-semibold truncate flex items-center gap-0.5 mt-0.5">
                              <span className="w-1 h-1 rounded-full bg-teal-505"></span>
                              {connectedSched.title}
                            </div>
                          )}
                          <div className="text-3xs text-slate-500 dark:text-slate-455 mt-0.5 font-normal truncate">
                            {r.peserta.length} Peserta: {r.peserta.slice(0, 3).join(', ')}
                            {r.peserta.length > 3 ? '...' : ''}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Process Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button
                onClick={handleGenerateReport}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-xs active:scale-[0.99]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Proses & Buat Teks Laporan</span>
              </button>
              
              {records.length === 0 && (
                <button
                  onClick={handleLoadSampleData}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Gunakan Data Contoh Terlebih Dahulu</span>
                </button>
              )}
            </div>

            {/* Compiled Text Area display with copy features */}
            {reportGenerated ? (
              <div className="space-y-4">
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-100 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1">
                      <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>Draf Laporan {currentPeriod ? currentPeriod.label : 'Mei-Juni 2026'} Berhasil Terbuat</span>
                    </h3>
                    <p className="text-3xs text-slate-550 dark:text-slate-450 mt-0.5">
                      Karakter "*" murni diformat agar otomatis menjadi Teks Tebal (Bold) di aplikasi WhatsApp.
                    </p>
                  </div>

                  <button
                    onClick={handleCopyReport}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs active:scale-95 self-end sm:self-center"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Selesai Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Teks Laporan</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Textarea containing copyable text */}
                <div className="relative">
                  <textarea
                    id="report-text"
                    ref={reportTextareaRef}
                    value={reportText}
                    readOnly
                    rows={15}
                    className="w-full font-mono text-xs sm:text-sm p-4 bg-slate-900 text-slate-100 border border-slate-950 dark:border-slate-800 rounded-lg leading-relaxed focus:outline-hidden"
                  ></textarea>
                </div>

                {/* Additional tips card for pasting */}
                <div className="p-4 bg-teal-50/50 dark:bg-teal-950/25 border-l-4 border-teal-500 text-teal-900 dark:text-teal-300 rounded-r-lg text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Tips Memajang Laporan:</span> Format laporan ini menggunakan penanda bintang (*) yang kompatibel ganda. Jika Anda mengirimkannya langsung ke grup pengurus/guru via <b>WhatsApp</b>, baris bertanda bintang otomatis terarsip tebal demi kemudahan pembacaan.
                  </div>
                </div>

              </div>
            ) : (
              // Empty generation splash
              <div className="p-12 text-center rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col items-center">
                <FileText className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Draf Laporan Belum Diproses</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1.5">
                  Hasil pemetaan data murni tidak akan termuat sampai tombol <b>Proses & Buat Teks Laporan</b> di atas diklik secara eksplisit.
                </p>
              </div>
            )}

          </div>
        )}

        {/* Tab 4: Jadwal & Pengingat */}
        {activeTab === 'jadwal' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 transition-colors duration-200">
            {/* Header description */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-2">
                  <Bell className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <span>Jadwal Belajar & Pengingat Sesi</span>
                </h2>
                <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
                  Atur agenda kelas daring/luring Anda dan pasang alarm otomatis. Sistem web akan mengingatkan Anda sebelum kursus dimulai.
                </p>
              </div>

              {/* Native desktop notifications setup */}
              <button
                type="button"
                onClick={requestNotificationPermission}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  'Notification' in window && Notification.permission === 'granted'
                    ? 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                    : 'bg-amber-50 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-905/40'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>
                  {'Notification' in window && Notification.permission === 'granted'
                    ? 'Notifikasi Desktop Aktif ✅'
                    : 'Aktifkan Notifikasi Desktop'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Form to submit schedule - 2 columns */}
              <div className="lg:col-span-3 space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-705 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-teal-600" />
                    <span>Buat Jadwal Baru</span>
                  </h3>

                  <form onSubmit={handleAddSchedule} className="space-y-4">
                    <div>
                      <label className="block text-2xs font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wider mb-1" htmlFor="sched_title">
                        Judul Sesi
                      </label>
                      <input
                        id="sched_title"
                        type="text"
                        value={scheduleTitle}
                        onChange={(e) => setScheduleTitle(e.target.value)}
                        placeholder="Contoh: Kelas Pemrograman - Pertemuan 1"
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg text-slate-850 dark:text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500/10 focus:border-teal-600 dark:focus:border-teal-500 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-2xs font-bold text-slate-655 dark:text-slate-400 uppercase tracking-wider mb-1">
                          Pilih Hari Sesi
                        </label>
                        <select
                          value={scheduleHari}
                          onChange={(e) => setScheduleHari(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-hidden font-medium"
                        >
                          <option value="Senin">Senin</option>
                          <option value="Selasa">Selasa</option>
                          <option value="Rabu">Rabu</option>
                          <option value="Kamis">Kamis</option>
                          <option value="Jumat">Jumat</option>
                          <option value="Sabtu">Sabtu</option>
                          <option value="Minggu">Minggu</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-2xs font-bold text-slate-655 dark:text-slate-400 uppercase tracking-wider mb-1">
                          Waktu Kursus
                        </label>
                        <input
                          type="time"
                          value={scheduleWaktu}
                          onChange={(e) => setScheduleWaktu(e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:outline-hidden font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-2xs font-bold text-slate-655 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Waktu Pengingat Sesi
                      </label>
                      <select
                        value={scheduleRemindMinutesBefore}
                        onChange={(e) => setScheduleRemindMinutesBefore(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-lg text-slate-855 dark:text-slate-100 text-xs focus:outline-hidden font-medium"
                      >
                        <option value={0}>Tepat waktu saat sesi dimulai</option>
                        <option value={5}>5 Menit sebelum sesi dimulai</option>
                        <option value={10}>10 Menit sebelum sesi dimulai</option>
                        <option value={15}>15 Menit sebelum sesi dimulai</option>
                        <option value={30}>30 Menit sebelum sesi dimulai</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Daftarkan Jadwal Sesi</span>
                    </button>
                  </form>
                </div>

                <div className="p-4 bg-teal-50/50 dark:bg-teal-950/15 border border-teal-100/60 dark:border-teal-900/30 rounded-xl text-xs text-teal-900 dark:text-teal-300 space-y-2">
                  <h4 className="font-bold flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Sistem Pengingat Web Aktif</span>
                  </h4>
                  <p className="text-3xs leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                    Sistem akan memindai database secara berkala setiap 12 detik. Pastikan tab web ini tetap terbuka agar alarm audio dan sistem alert terus bekerja tepat waktu.
                  </p>
                </div>
              </div>

              {/* List of existing schedules - 3 columns */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xs font-bold text-slate-705 dark:text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>Daftar Sesi Jadwal Terdaftar ({schedules.length})</span>
                </h3>

                {schedules.length === 0 ? (
                  <div className="p-12 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col items-center">
                    <Calendar className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-3" />
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum Ada Agenda Jadwal</h4>
                    <p className="text-3xs text-slate-505 dark:text-slate-400 max-w-xs mx-auto mt-1.5 leading-relaxed font-semibold">
                      Silakan daftarkan agenda/pertemuan kursus Anda di formulir sebelah kiri. Alarm otomatis akan mengingatkan Anda sesuai setelan.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-120 overflow-y-auto pr-1">
                    {schedules.map((item) => {
                      const now = new Date();
                      const [h, m] = item.waktu.split(':').map(Number);
                      const itemTime = item.hari
                        ? getOccurrenceThisWeek(item.hari, item.waktu)
                        : new Date(item.tanggal || '');
                      itemTime.setHours(h, m, 0, 0);

                      const isUpcoming = itemTime.getTime() > now.getTime();
                      const isOngoing = !isUpcoming && (now.getTime() - itemTime.getTime() < 60 * 60 * 1000); // 1 hour duration
                      const isPast = !isUpcoming && !isOngoing;

                      return (
                        <div 
                          key={item.id} 
                          className={`p-4 rounded-xl border transition-all duration-200 ${
                            isOngoing
                              ? 'bg-teal-500/5 dark:bg-teal-950/20 border-teal-500/30'
                              : isPast
                              ? 'bg-slate-50 dark:bg-slate-900/20 border-slate-200/50 dark:border-slate-800 opacity-60'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1.5">
                              {/* Headers status labels */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                {isOngoing ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-4xs font-bold uppercase tracking-wider bg-rose-500 text-white rounded-md animate-pulse">
                                    <span className="w-1 h-1 rounded-full bg-white"></span>
                                    Sedang Berlangsung ...
                                  </span>
                                ) : isPast ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 text-4xs font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-450 rounded-md font-mono">
                                    Selesai
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 text-4xs font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30 rounded-md">
                                    Mendatang
                                  </span>
                                )}

                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-4xs rounded font-medium font-mono">
                                  🔔 {item.remindMinutesBefore === 0 ? 'Tepat Waktu' : `${item.remindMinutesBefore}m sebelum`}
                                </span>

                                {item.notified && (
                                  <span className="inline-flex items-center text-emerald-600 dark:text-emerald-450 text-4xs font-bold gap-0.5">
                                    ✓ Diingatkan
                                  </span>
                                )}
                              </div>

                              {/* Title */}
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans tracking-tight">
                                {item.title}
                              </h4>

                              {/* Timetable schedule text info */}
                              <p className="text-3xs text-slate-550 dark:text-slate-450 flex flex-wrap items-center gap-1.5 pt-0.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {item.hari ? (
                                  <span className="font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20 px-1.5 py-0.5 rounded text-4xs uppercase tracking-wider">
                                    Setiap Hari {item.hari}
                                  </span>
                                ) : (
                                  <span className="font-semibold">{formatIndonesianDate(item.tanggal || '')}</span>
                                )}
                                <span className="text-slate-300 dark:text-slate-800">|</span>
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-mono text-slate-850 dark:text-slate-300 font-extrabold">{item.waktu} WIB</span>
                              </p>

                              {/* Room/Meeting link actions */}
                              {item.linkMeet && (
                                <a 
                                  href={item.linkMeet}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  referrerPolicy="no-referrer"
                                  className="inline-flex items-center gap-1 text-3xs font-bold text-teal-600 dark:text-teal-400 hover:underline pt-1"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  <span>Buka Google Meet Sesi</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedScheduleId(item.id);
                                  const occurrence = getOccurrenceThisWeek(item.hari, item.waktu);
                                  setTanggalInput(occurrence.toLocaleDateString('sv'));
                                  setActiveTab('input');
                                  showToast(`Mulai presensi sesi "${item.title}"`, 'success');
                                }}
                                className="mt-2.5 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/20 dark:hover:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-lg text-3xs font-extrabold transition-all cursor-pointer border border-teal-200/40 dark:border-teal-900/40 w-full"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                <span>Input Absensi Sesi Ini</span>
                              </button>
                            </div>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => item.id && handleDeleteSchedule(item.id, item.title)}
                              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-colors"
                              title="Hapus Jadwal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Footer Details */}
      <footer className="bg-white dark:bg-slate-900 py-6 border-t border-slate-200 dark:border-slate-800 font-sans mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-1 text-xs text-slate-550 dark:text-slate-400">
          <p className="font-bold text-teal-600 dark:text-teal-400">PRESENSI KURSUS v1.0 • Clean Minimalism Theme</p>
          <p>Disimpan menggunakan standard IndexedDB Dexie.js. 100% data tersimpan di perangkat Anda.</p>
        </div>
      </footer>
    </div>
  );
}
