import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { buildICalendar } from '../utils/calendar';
import { Button } from '../ui/Button';
import { 
  Clock, 
  Trash2, 
  Plus, 
  Bell, 
  Settings, 
  Info, 
  Check, 
  Calendar,
  AlertCircle
} from 'lucide-react';

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export const ScheduleManagement: React.FC = () => {
  /**
   * Hand the schedule to the phone's own calendar.
   *
   * In-app reminders only run while the app is open — a PWA with no push
   * server cannot do better — so this is the way a teacher actually gets
   * reminded when the app is closed.
   */
  const handleExportCalendar = (schedules: Array<{ id?: number; title: string; hari: string; waktu: string; remindMinutesBefore: number }>) => {
    const ics = buildICalendar(schedules);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jadwal-classsync.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const {
    schedules,
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
    showToast
  } = useApp();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Settings / Authorization Header Banner */}
      <div className="p-6 relative overflow-hidden">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-650" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-1">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Jadwal kelas</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Simpan kelas yang berulang setiap pekan, supaya tanggalnya terisi sendiri saat mencatat presensi.
            </p>
          </div>

          <button
            onClick={requestNotificationPermission}
            className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-850 dark:hover:bg-zinc-750 font-extrabold text-sm transition-all -2xs cursor-pointer"
          >
            <Bell className="w-4 h-4 text-red-500 animate-bounce" />
            <span>Izinkan notifikasi</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Add Schedule (Col left) */}
        <div className="lg:col-span-5">
          <div className="p-5 sticky top-24">
            <div className="flex items-center gap-2 mb-4 border-b pb-3">
              <Plus className="w-4.5 h-4.5 text-red-650" />
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">Tambah jadwal</h3>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-black text-zinc-400 mb-1.5" htmlFor="sch-title">
                  Nama kelas
                </label>
                <input
                  type="text"
                  id="sch-title"
                  required
                  placeholder="Contoh: Iqra sore"
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  className="w-full text-sm text-zinc-800 dark:text-zinc-100 p-2.5 focus:outline-hidden focus:ring-1 focus:ring-red-650"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-sm font-black text-zinc-400 mb-1.5" htmlFor="sch-day">
                    Hari
                  </label>
                  <select
                    id="sch-day"
                    value={scheduleHari}
                    onChange={(e) => setScheduleHari(e.target.value)}
                    className="w-full text-sm text-zinc-850 dark:text-zinc-100 p-2.5 focus:outline-hidden cursor-pointer font-semibold"
                  >
                    {HARI_LIST.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-black text-zinc-400 mb-1.5" htmlFor="sch-time">
                    Jam mulai
                  </label>
                  <input
                    type="time"
                    id="sch-time"
                    required
                    value={scheduleWaktu}
                    onChange={(e) => setScheduleWaktu(e.target.value)}
                    className="w-full text-sm text-zinc-800 dark:text-zinc-150 p-2.5 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-zinc-400 mb-1.5" htmlFor="sch-remind">
                  Ingatkan saya
                </label>
                <select
                  id="sch-remind"
                  value={scheduleRemindMinutesBefore}
                  onChange={(e) => setScheduleRemindMinutesBefore(Number(e.target.value))}
                  className="w-full text-sm text-zinc-850 dark:text-zinc-100 p-2.5 focus:outline-hidden cursor-pointer font-semibold"
                >
                  <option value={0}>Saat kelas dimulai</option>
                  <option value={5}>5 menit sebelumnya</option>
                  <option value={10}>10 menit sebelumnya</option>
                  <option value={15}>15 menit sebelumnya</option>
                  <option value={30}>30 menit sebelumnya</option>
                  <option value={60}>1 jam sebelumnya</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-650 hover:bg-red-750 text-white font-extrabold text-sm transition-all cursor-pointer -2xs border-transparent"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simpan jadwal</span>
                </button>
              </div>
            </form>

            <div className="p-3.5 text-sm text-zinc-500 dark:text-zinc-400 leading-normal mt-4 space-y-1 font-medium select-none">
              <p className="font-extrabold text-zinc-700 dark:text-zinc-300 tracking-wide">Tentang pengingat</p>
              <p>Pengingat hanya berbunyi selama aplikasi ini terbuka. Agar tetap diingatkan saat aplikasi tertutup, simpan jadwalnya ke kalender HP Anda dengan tombol di setiap jadwal.</p>
            </div>
          </div>
        </div>

        {/* Schedule Lists View (Col right) */}
        <div className="lg:col-span-7">
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2.5 mb-2">
              <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">Jadwal tersimpan ({schedules.length})</h3>
              {schedules.length > 0 ? (
                <Button onClick={() => handleExportCalendar(schedules)}>
                  Simpan ke kalender HP
                </Button>
              ) : null}
            </div>

            {schedules.length === 0 ? (
              <div className="py-12 text-center text-sm italic text-zinc-400">
                Belum ada jadwal. Anda tetap bisa mencatat presensi tanpa jadwal.
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((s) => (
                  <div 
                    key={s.id} 
                    className="p-4 hover: dark:hover: transition-all flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 truncate">{s.title}</h4>
                      
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-red-650 dark:text-red-400 px-2 py-0.5">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>Setiap {s.hari}, pukul {s.waktu}</span>
                        </span>

                        <span className="inline-flex items-center text-sm font-bold text-zinc-500 px-2.5 py-0.5">
                          {s.remindMinutesBefore === 0 ? 'Diingatkan saat mulai' : `Diingatkan ${s.remindMinutesBefore} menit sebelumnya`}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      onClick={() => s.id && handleDeleteSchedule(s.id, s.title)}
                      className="shrink-0"
                    >
                      Hapus
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
};
