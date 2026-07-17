import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { formatIndonesianDate } from '../utils/date';
import { 
  Calendar, 
  Users, 
  UserPlus, 
  BookOpen, 
  Clock, 
  Plus, 
  Check, 
  Save 
} from 'lucide-react';

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const getWeekdayOccurrences = (hariName: string, countPast: number = 8, countFuture: number = 1) => {
  const dayIndex = INDO_DAYS.indexOf(hariName);
  if (dayIndex === -1) return [];

  const now = new Date();
  const currentDayIndex = now.getDay();
  const daysDiff = dayIndex - currentDayIndex;

  const thisWeekOcc = new Date();
  thisWeekOcc.setDate(now.getDate() + daysDiff);
  
  const list = [];
  
  const formatYMD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Future occurrences (next 1 week)
  for (let i = countFuture; i >= 1; i--) {
    const d = new Date(thisWeekOcc);
    d.setDate(thisWeekOcc.getDate() + (i * 7));
    const dateStr = formatYMD(d);
    list.push({
      dateStr,
      labelFormatted: `Pekan Depan: ${formatIndonesianDate(dateStr)}`
    });
  }

  // Current week occurrence
  const twStr = formatYMD(thisWeekOcc);
  list.push({
    dateStr: twStr,
    labelFormatted: `Pekan Ini (Default): ${formatIndonesianDate(twStr)}`
  });

  // Past occurrences (last 8 weeks)
  for (let i = 1; i <= countPast; i++) {
    const d = new Date(thisWeekOcc);
    d.setDate(thisWeekOcc.getDate() - (i * 7));
    const dateStr = formatYMD(d);
    
    let relLabel = '';
    if (i === 1) relLabel = 'Pekan Lalu';
    else if (i === 2) relLabel = '2 Pekan Lalu';
    else if (i === 3) relLabel = '3 Pekan Lalu';
    else relLabel = `${i} Pekan Lalu`;

    list.push({
      dateStr,
      labelFormatted: `${relLabel}: ${formatIndonesianDate(dateStr)}`
    });
  }

  return list;
};

export const AttendanceInput: React.FC = () => {
  const {
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
    schedules,
    capitalizeWords
  } = useApp();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        {/* Accent Bar - Swiss Red Design */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-650" />

        <div className="flex items-center gap-2.5 mb-5 mt-1">
          <Calendar className="w-5 h-5 text-red-650" />
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Presensi Sesi Baru</h2>
        </div>

        <form onSubmit={handleSaveAttendance} className="space-y-5">
          {/* Tanggal & Jadwal Linked */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2" htmlFor="tanggal_kegiatan">
                Pilih Tanggal Kegiatan / Kursus
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  id="tanggal_kegiatan"
                  required
                  value={tanggalInput}
                  onChange={(e) => setTanggalInput(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-800 dark:text-white dark:placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-red-600 focus:border-red-600 transition-all font-semibold cursor-pointer"
                />
              </div>
              
              {tanggalInput && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
                  Terpilih: <span className="font-semibold text-zinc-700 dark:text-zinc-250">{formatIndonesianDate(tanggalInput)}</span>
                </p>
              )}

              {/* Dynamic Weekday Suggestion Dropdown if Linked Schedule is Active */}
              {(() => {
                const linkedSchedule = schedules.find(s => s.id === selectedScheduleId);
                if (linkedSchedule && linkedSchedule.hari) {
                  const occurrencesList = getWeekdayOccurrences(linkedSchedule.hari);
                  const isCustomDate = !occurrencesList.some(occ => occ.dateStr === tanggalInput);
                  
                  return (
                    <div className="mt-3.5 bg-red-500/[0.02] dark:bg-red-950/[0.1] border border-red-500/10 dark:border-red-900/20 rounded-xl p-3.5">
                      <label className="block text-[10px] font-black uppercase text-red-650 dark:text-red-400 tracking-wider mb-1.5">
                        📅 Sesi Rutin Hari {linkedSchedule.hari}:
                      </label>
                      <select
                        value={tanggalInput}
                        onChange={(e) => {
                          if (e.target.value) {
                            setTanggalInput(e.target.value);
                          }
                        }}
                        className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg py-1.5 px-2 text-zinc-800 dark:text-zinc-150 focus:outline-hidden cursor-pointer"
                      >
                        {occurrencesList.map(occ => (
                          <option key={occ.dateStr} value={occ.dateStr} className="dark:bg-zinc-900 dark:text-white">
                            {occ.labelFormatted}
                          </option>
                        ))}
                        {isCustomDate && (
                          <option value={tanggalInput} className="dark:bg-zinc-900 dark:text-white">
                            Tanggal Kustom Lainnya: {formatIndonesianDate(tanggalInput)}
                          </option>
                        )}
                      </select>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-2 leading-normal">
                        Ingin mengisi presensi yang terlewat? Pilih dari tanggal-tanggal di hari <b>{linkedSchedule.hari}</b> di atas.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2" htmlFor="linked_schedule">
                Hubungkan Dengan Jadwal Rutin (Opsional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
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
                      if (foundSched) {
                        if (foundSched.hari) {
                          const occurrences = getWeekdayOccurrences(foundSched.hari);
                          // Default to this week's occurrence
                          const curWeekOccStr = occurrences.find(o => o.labelFormatted.includes('Pekan Ini'))?.dateStr || occurrences[1]?.dateStr;
                          if (curWeekOccStr) {
                            setTanggalInput(curWeekOccStr);
                          }
                        } else if (foundSched.tanggal) {
                          setTanggalInput(foundSched.tanggal);
                        }
                      }
                    }
                  }}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-800 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-red-600 focus:border-red-600 transition-all font-semibold cursor-pointer"
                >
                  <option value="" className="dark:bg-zinc-900 dark:text-white">-- Tidak Terhubung Jadwal --</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id} className="dark:bg-zinc-900 dark:text-white">
                      {s.title} ({s.hari ? `Setiap ${s.hari}` : s.tanggal} • {s.waktu})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Menghubungkan ke jadwal rutin mempermudah segmentasi lapor mingguan otomatis dan memicu pengingat notifikasi.
              </p>
            </div>
          </div>

          {/* Quick load previous students names if connected schedule has history */}
          {selectedScheduleId && lastAttendanceForSchedule.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 bg-red-500/[0.01] dark:bg-red-950/[0.05] border border-red-500/10 dark:border-red-900/10 rounded-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Users className="w-3.5 h-3.5 text-red-650 shrink-0" />
                  <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 truncate">
                    Daftar Sesi Sebelumnya ({lastAttendanceForSchedule.length} Orang):
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const confirmLoadList = window.confirm(`Apakah Anda ingin memasukkan kembali daftar nama dari sesi sebelumnya? (${lastAttendanceForSchedule.join(', ')})`);
                    if (confirmLoadList) {
                      setNamesInput(lastAttendanceForSchedule.join(', '));
                    }
                  }}
                  className="py-1 px-3 text-[10px] font-bold tracking-tight bg-red-650 text-white hover:bg-red-700 rounded-md transition-colors shadow-2xs self-end"
                >
                  Gunakan Daftar Nama Ini
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                {lastAttendanceForSchedule.join(', ')}
              </p>
            </motion.div>
          )}

          {/* Input nama peserta */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider" htmlFor="daftar_peserta">
                Ketik Nama Peserta didik <span className="text-red-650 text-xs">*</span>
              </label>
              <span className="text-[10px] text-zinc-400 font-semibold italic">pisahkan dengan tanda koma ( , )</span>
            </div>
            
            <div className="relative">
              <textarea
                id="daftar_peserta"
                required
                rows={4}
                value={namesInput}
                onChange={(e) => setNamesInput(e.target.value)}
                placeholder="Contoh: Husen, Budi, Ahmad, Siti, Umar..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-800 dark:text-white dark:placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-red-600 focus:border-red-600 transition-all font-sans leading-relaxed font-semibold"
              />
            </div>
          </div>

          {/* Preset / Daftar Cepat badge nama */}
          <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 p-4 rounded-xl">
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 select-none">
              <Plus className="w-3.5 h-3.5 text-zinc-400" />
              <span>Daftar Cepat Peserta (Badge Tap)</span>
            </h3>

            {allRegisteredStudents.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                {allRegisteredStudents.map((studentName) => {
                  const selected = isStudentSelected(studentName);
                  return (
                    <button
                      key={studentName}
                      type="button"
                      onClick={() => handleToggleStudent(studentName)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                        selected 
                          ? 'bg-red-650 text-white ring-1 ring-red-650 shadow-2xs' 
                          : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {selected ? <Check className="w-3" /> : <Plus className="w-3 text-zinc-400" />}
                      <span>{studentName}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-2xs text-zinc-400 italic">Belum ada historical peserta didik di database lokal Anda.</p>
            )}

            {/* Quick manual additions directly to textarea */}
            <div className="mt-4 flex items-center gap-2 max-w-sm">
              <input
                type="text"
                id="quick_add_name"
                placeholder="Tambah nama peserta didik baru..."
                className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-3xs text-zinc-700 dark:text-zinc-300 focus:outline-hidden"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const inputEl = e.currentTarget as HTMLInputElement;
                    const val = inputEl.value.trim();
                    if (val) {
                      const capitalized = capitalizeWords(val);
                      handleToggleStudent(capitalized);
                      inputEl.value = '';
                    }
                  }
                }}
              />
              <button
                type="button"
                className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-white text-3xs font-extrabold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                onClick={(e) => {
                  const inputEl = (e.currentTarget.previousSibling as HTMLInputElement);
                  const val = inputEl.value.trim();
                  if (val) {
                    const capitalized = capitalizeWords(val);
                    handleToggleStudent(capitalized);
                    inputEl.value = '';
                  }
                }}
              >
                <UserPlus className="w-3 h-3" />
                <span>Tambah</span>
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-2">
              💡 Ketik nama baru lalu ketuk <b>Tambah</b> atau tekan tombol <b>Enter</b> untuk memunculkan badge cepat.
            </p>
          </div>

          {/* Actions Submit */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-650 hover:bg-red-750 active:bg-red-800 text-white font-extrabold rounded-xl text-xs transition-colors shadow-xs hover:shadow-sm cursor-pointer border border-transparent"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Data Presensi</span>
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
