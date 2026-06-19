import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { formatIndonesianDate, formatDateShort } from '../utils/date';
import { 
  FileText, 
  Copy, 
  Check, 
  RefreshCw, 
  Info, 
  Grid, 
  CheckSquare, 
  Square, 
  AlertCircle,
  X,
  Play,
  Calendar
} from 'lucide-react';

export const ReportGenerator: React.FC = () => {
  const {
    selectedPeriodKey,
    setSelectedPeriodKey,
    reportScheduleFilter,
    setReportScheduleFilter,
    reportSelectedRecordIds,
    setReportSelectedRecordIds,
    reportText,
    reportGenerated,
    copied,
    availablePeriods,
    currentPeriod,
    filteredRecordsForReport,
    bimonthlyWeeks,
    handleGenerateReport,
    handleCopyReport,
    reportTextareaRef,
    schedules,
    todayIsThirdWeek,
    hideWeekReminder,
    handleDismissWeekReminder,
    handleLoadSampleData,
    records
  } = useApp();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Week 3 Sticky Alert / Announcement */}
      {todayIsThirdWeek && !hideWeekReminder && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 dark:bg-red-950/20 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 relative"
        >
          <AlertCircle className="w-5 h-5 text-red-650 dark:text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-1">
            <h4 className="text-xs font-black uppercase text-red-650 dark:text-red-400 tracking-wider">🔔 Pengingat Pekan Ke-3 Bulanan</h4>
            <p className="text-xs text-zinc-650 dark:text-zinc-350 leading-relaxed font-semibold">
              Hari ini sudah memasuki tanggal 15-21! Jangan lupa untuk segera mengkompilasi laporan kehadiran bwi-bulanan siswa, menyalin ke format WhatsApp, dan mengirimkannya ke Koordinator Kursus.
            </p>
          </div>
          <button
            onClick={handleDismissWeekReminder}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-805 rounded-lg text-zinc-400 dark:text-zinc-500 transition-colors cursor-pointer"
            title="Sembunyikan Pengingat"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Main Filter & Control Area */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-650" />

        <div className="flex items-center gap-2.5 mb-5 mt-1">
          <FileText className="w-5 h-5 text-red-650 animate-pulse" />
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Kompilator Laporan Sesi</h2>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-2xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2" htmlFor="report_period">
              Pilih Periode Bwi-Bulanan Laporan
            </label>
            <select
              id="report_period"
              value={selectedPeriodKey}
              onChange={(e) => setSelectedPeriodKey(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-800 dark:text-zinc-150 focus:outline-hidden font-bold cursor-pointer"
            >
              {availablePeriods.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-2xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2" htmlFor="report_schedule_filter">
              Segmentasi Sesi Berdasarkan Kelas
            </label>
            <select
              id="report_schedule_filter"
              value={reportScheduleFilter}
              onChange={(e) => setReportScheduleFilter(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-800 dark:text-zinc-150 focus:outline-hidden font-bold cursor-pointer"
            >
              <option value="all">-- Semua Sesi Kelas --</option>
              <option value="unlinked">Hanya Kelas Kustom (Tanpa Jadwal)</option>
              {schedules.map(s => (
                <option key={s.id} value={s.id}>{s.title} ({s.hari})</option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-3 flex items-center gap-1.5 font-medium">
          <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>Sistem akan mengompilasi data ke format chat WhatsApp berisi sub-bab list peserta sesuai format Koordinator.</span>
        </p>
      </div>

      {records.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-250">Tidak ada riwayat untuk dibuatkan laporan.</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            Harap isi presensi terlebih dahulu atau muat data simulasi Mei-Juni 2026.
          </p>
          <button
            onClick={handleLoadSampleData}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-red-650 hover:bg-red-750 text-white text-[11px] font-black rounded-lg cursor-pointer"
          >
            <Play className="w-3" />
            <span>Muat Data Contoh Simulasi (Periode Mei-Juni 2026)</span>
          </button>
        </div>
      ) : (
        /* Sesi Pemilihan */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* List Sesi (Col left) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3.5 border-b border-zinc-150 dark:border-zinc-805 pb-2.5">
                <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  List Sesi Hadir Periode ({filteredRecordsForReport.length})
                </h3>
                <span className="text-[10px] bg-red-500/10 text-red-650 dark:text-red-400 px-2 py-0.5 rounded-md font-bold uppercase">
                  {currentPeriod ? currentPeriod.label : '-'}
                </span>
              </div>

              {filteredRecordsForReport.length === 0 ? (
                <div className="py-6 text-center text-xs italic text-zinc-400">
                  Tidak ada catatan presensi yang terdaftar di filter periode &amp; kelas ini pada DB.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {filteredRecordsForReport.map((rec) => {
                    const isSelected = reportSelectedRecordIds.includes(rec.id!);
                    return (
                      <div 
                        key={rec.id}
                        onClick={() => {
                          if (rec.id) {
                            setReportSelectedRecordIds(prev =>
                              prev.includes(rec.id!) ? prev.filter(x => x !== rec.id) : [...prev, rec.id!]
                            );
                          }
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected 
                            ? 'bg-red-500/[0.02] border-red-500/20 dark:border-red-600/30' 
                            : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200/60 dark:border-zinc-805 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs font-black text-zinc-900 dark:text-zinc-150 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{formatIndonesianDate(rec.tanggal)}</span>
                          </p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-sm">
                            Hadir ({rec.peserta.length}): {rec.peserta.join(', ')}
                          </p>
                        </div>

                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-red-650" />
                        ) : (
                          <Square className="w-5 h-5 text-zinc-350 dark:text-zinc-750" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Compile */}
              <div className="pt-4 border-t border-zinc-150 dark:border-zinc-850 flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  className="px-5 py-2.5 bg-red-650 hover:bg-red-755 text-white text-xs font-black rounded-xl transition-colors shrink-0 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Kompilasikan Laporan</span>
                </button>
              </div>
            </div>
          </div>

          {/*compiled Output Display (Col right) */}
          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4 sticky top-24">
              <div className="border-b border-zinc-150 dark:border-zinc-805 pb-3 flex items-center justify-between">
                <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Hasil WhatsApp Lapor</h3>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-3 font-bold px-2 py-0.5 rounded-md uppercase font-mono">Template WA</span>
              </div>

              {reportGenerated ? (
                <div className="space-y-4">
                  <textarea
                    ref={reportTextareaRef}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-[11px] font-mono text-zinc-800 dark:text-zinc-200 leading-normal"
                    rows={12}
                    readOnly
                    value={reportText}
                  />

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={handleCopyReport}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-black rounded-xl cursor-pointer transition-all border border-transparent"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Berhasil Disalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Salin Ke Clipboard</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center">
                    💡 Rekatkan langsung teks hasil salinan tadi pada chat WhatsApp Koordinator Kursus.
                  </p>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center px-4 space-y-3">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full text-zinc-400">
                    <FileText className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Laporan belum dikompilasikan.</p>
                  <p className="text-[10px] text-zinc-400 max-w-xs leading-normal">
                    Silakan tentukan saringan periode bwi-bulanan, pilih sesi kelas belajar di samping kiri, lalu klik <b>Kompilasikan Laporan</b>.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </motion.div>
  );
};
