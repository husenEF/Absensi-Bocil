import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
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
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-650" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-1">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Manajemen Sesi / Jadwal Rutin</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Konfigurasikan sesi berulang mingguan untuk mendeteksi tanggal pengisian presensi dan menyalakan pengingat otomatis.
            </p>
          </div>

          <button
            onClick={requestNotificationPermission}
            className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-850 dark:hover:bg-zinc-750 font-extrabold text-xs rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <Bell className="w-4 h-4 text-red-500 animate-bounce" />
            <span>Izinkan Notifikasi Desktop</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Add Schedule (Col left) */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs sticky top-24">
            <div className="flex items-center gap-2 mb-4 border-b border-zinc-150 dark:border-zinc-805 pb-3">
              <Plus className="w-4.5 h-4.5 text-red-650" />
              <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Tambah Jadwal Baru</h3>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1.5" htmlFor="sch-title">
                  Judul Sesi Kursus-Siswa <span className="text-red-650">*</span>
                </label>
                <input
                  type="text"
                  id="sch-title"
                  required
                  placeholder="Contoh: Kursus Calistung Mandiri, Iqra Sore..."
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-lg p-2.5 focus:outline-hidden focus:ring-1 focus:ring-red-650"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1.5" htmlFor="sch-day">
                    Hari Belajar
                  </label>
                  <select
                    id="sch-day"
                    value={scheduleHari}
                    onChange={(e) => setScheduleHari(e.target.value)}
                    className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 text-zinc-850 dark:text-zinc-100 rounded-lg p-2.5 focus:outline-hidden cursor-pointer font-semibold"
                  >
                    {HARI_LIST.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1.5" htmlFor="sch-time">
                    Waktu Mulai
                  </label>
                  <input
                    type="time"
                    id="sch-time"
                    required
                    value={scheduleWaktu}
                    onChange={(e) => setScheduleWaktu(e.target.value)}
                    className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-805 text-zinc-800 dark:text-zinc-150 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1.5" htmlFor="sch-remind">
                  Durasi Pengingat Deteksi (Menit Sebelum)
                </label>
                <select
                  id="sch-remind"
                  value={scheduleRemindMinutesBefore}
                  onChange={(e) => setScheduleRemindMinutesBefore(Number(e.target.value))}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 text-zinc-850 dark:text-zinc-100 rounded-lg p-2.5 focus:outline-hidden cursor-pointer font-semibold"
                >
                  <option value={0}>Tepat Waktu Sesi Dimulai</option>
                  <option value={5}>5 Menit Sebelum Sesi</option>
                  <option value={10}>10 Menit Sebelum Sesi</option>
                  <option value={15}>15 Menit Sebelum Sesi</option>
                  <option value={30}>30 Menit Sebelum Sesi</option>
                  <option value={60}>1 Jam Sebelum Sesi</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-650 hover:bg-red-750 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-2xs border border-transparent"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Daftarkan Jadwal Rutin</span>
                </button>
              </div>
            </form>

            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250/50 dark:border-zinc-800 rounded-xl text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal mt-4 space-y-1 font-medium select-none">
              <p className="font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">💡 Mekanisme Alarm Pengingat:</p>
              <p>Aplikasi menggunakan latar Sound Synthesizer + Notifikasi Desktop HTML5. Pastikan tab browser tetap aktif / diletakkan di background agar deteksi interval berjalan teratur setiap menit.</p>
            </div>
          </div>
        </div>

        {/* Schedule Lists View (Col right) */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-805 pb-2.5 mb-2">
              <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Jadwal Kelas Terdaftar ({schedules.length})</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 rounded">Rutin Mingguan</span>
            </div>

            {schedules.length === 0 ? (
              <div className="py-12 text-center text-xs italic text-zinc-400">
                Belum ada jadwal berulang yang didaftarkan. Sesi kustom tetap dapat dicatatkan secara manual.
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((s) => (
                  <div 
                    key={s.id} 
                    className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-805 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-750 transition-all flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 truncate">{s.title}</h4>
                      
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-red-650 dark:text-red-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-md">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>Serentak: Setiap {s.hari} Jam {s.waktu} WIB</span>
                        </span>

                        <span className="inline-flex items-center text-[10px] font-bold text-zinc-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-0.5 rounded-md">
                          Pengingat: {s.remindMinutesBefore === 0 ? 'Tepat Waktu' : `${s.remindMinutesBefore} Mins`}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => s.id && handleDeleteSchedule(s.id, s.title)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-850 cursor-pointer transition-colors"
                      title="Hapus Jadwal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
