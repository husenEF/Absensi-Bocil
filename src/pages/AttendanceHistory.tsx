import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { formatIndonesianDate, formatDateShort } from '../utils/date';
import { db } from '../db';
import { 
  Calendar, 
  Trash2, 
  Edit3, 
  Trash, 
  CheckSquare, 
  Square, 
  Save, 
  X, 
  RefreshCw, 
  Download, 
  Copy, 
  Plus, 
  AlertTriangle 
} from 'lucide-react';

export const AttendanceHistory: React.FC = () => {
  const {
    records,
    loading,
    loadRecords,
    schedules,
    selectedRecordIds,
    handleToggleSelectRecord,
    handleSelectAllRecords,
    handleDeselectAllRecords,
    handleExportCSV,
    handleExportJSON,
    handleCopySelectedCSV,
    editingId,
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
    showToast,
    setActiveTab
  } = useApp();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Summary Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-650" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-1">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Riwayat Catatan Presensi</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Seluruh riwayat kehadiran kelas Anda yang tersimpan aman di database lokal IndexedDB.
            </p>
          </div>
          
          {records.length > 0 && (
            <button
              onClick={() => {
                const conf = window.confirm('⚠ PERINGATAN: Anda akan menghapus SELURUH data presensi di aplikasi! Tindakan ini tidak dapat dibatalkan. Setuju?');
                if (conf) {
                  db.absensi.clear().then(() => {
                    showToast('Semua database presensi lokal berhasil dikosongkan.', 'success');
                    loadRecords();
                  });
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-650 dark:text-red-400 hover:bg-red-500/20 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-red-500/20 shrink-0 self-start sm:self-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Database</span>
            </button>
          )}
        </div>
      </div>

      {/* Menu Ekspor & Seleksi Data */}
      {records.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-zinc-150 dark:border-zinc-805">
            <div className="flex items-center gap-2.5">
              <CheckSquare className="w-5 h-5 text-red-650" />
              <div>
                <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Ekspor Data &amp; Filter Selektif</h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Pilih baris presensi tertentu untuk diekspor ke format Excel (CSV) atau JSON</p>
              </div>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              {selectedRecordIds.length} Sesi Terpilih
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllRecords}
                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-black text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-750 rounded-lg cursor-pointer transition-colors"
              >
                Pilih Semua
              </button>
              <button
                type="button"
                onClick={handleDeselectAllRecords}
                disabled={selectedRecordIds.length === 0}
                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-black text-zinc-400 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg cursor-pointer transition-colors"
              >
                Batal Pilih
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={selectedRecordIds.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-650 hover:bg-red-750 text-white font-extrabold text-xs rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                title="Ekspor sebagai berkas Excel CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                disabled={selectedRecordIds.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 hover:bg-zinc-200 text-zinc-750 dark:text-zinc-250 font-extrabold text-xs rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors border border-zinc-200 dark:border-zinc-700"
                title="Ekspor sebagai dokumen JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
              <button
                type="button"
                onClick={handleCopySelectedCSV}
                disabled={selectedRecordIds.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-extrabold text-xs rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Salin isi CSV ke Clipboard"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading states */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-red-650 animate-spin" />
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Memproses data dari browser IndexedDB...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-full w-14 h-14 mx-auto mb-4 flex items-center justify-center text-zinc-400 dark:text-zinc-650">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-200">Belum Ada Riwayat Presensi</h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-2 leading-relaxed">
            Database lokal masih kosong. Silakan masuk ke tab <b>Mulai Presensi</b> untuk mencatatkan, atau gunakan berkas integrasi cadangan data.
          </p>
          
          <button
            onClick={() => setActiveTab('input')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-red-650 hover:bg-red-750 text-white text-xs font-black rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Mulai Presensi</span>
          </button>
        </div>
      ) : (
        /* Sesi Catatan Loop */
        <div className="space-y-3.5">
          {records.map((record) => {
            const isEditingThis = editingId === record.id;
            
            return (
              <div 
                key={record.id} 
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs hover:shadow-xs p-5 transition-all"
              >
                {isEditingThis ? (
                  /* Form edit inline */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-805 pb-3">
                      <span className="text-xs font-bold text-red-650 uppercase tracking-wider">Modifikasi Sesi Kehadiran</span>
                      <span className="text-xs font-black text-zinc-400 font-mono">ID: #{record.id}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">Tanggal Kegiatan</label>
                        <input
                          type="date"
                          value={editingTanggal}
                          onChange={(e) => setEditingTanggal(e.target.value)}
                          className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-lg p-2 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">Hubungkan Sesi Jadwal</label>
                        <select
                          value={editingScheduleId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingScheduleId(val === '' ? undefined : Number(val));
                          }}
                          className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-lg p-2 focus:outline-hidden cursor-pointer"
                        >
                          <option value="">-- Tidak Terhubung --</option>
                          {schedules.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title} ({s.hari})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">List Nama Peserta (Pisahkan Koma)</label>
                        <textarea
                          value={editingNames}
                          onChange={(e) => setEditingNames(e.target.value)}
                          rows={2}
                          className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-lg p-2.5 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-150 dark:border-zinc-805">
                      <button
                        onClick={() => saveEditedRecord(record.id!)}
                        className="inline-flex items-center gap-1.5 px-4.5 py-1.5 bg-red-650 text-white hover:bg-red-750 text-xs font-black rounded-lg cursor-pointer transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Simpan</span>
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="inline-flex items-center gap-1.5 px-4.5 py-1.5 bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 text-xs font-black rounded-lg cursor-pointer transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Batal</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Format normal tampil */
                  <div className="flex items-start gap-3.5">
                    {/* Checkbox samping */}
                    <button
                      type="button"
                      onClick={() => record.id && handleToggleSelectRecord(record.id)}
                      className="mt-0.5 shrink-0 cursor-pointer text-zinc-300 hover:text-red-650 dark:text-zinc-700 dark:hover:text-red-500 transition-colors"
                      title={selectedRecordIds.includes(record.id!) ? 'Batalkan pilihan' : 'Pilih untuk Ekspor'}
                    >
                      {selectedRecordIds.includes(record.id!) ? (
                        <CheckSquare className="w-5 h-5 text-red-650" />
                      ) : (
                        <Square className="w-5 h-5 text-zinc-350 dark:text-zinc-750" />
                      )}
                    </button>

                    <div className="flex-1 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      {/* Informasi utama */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                            <Calendar className="w-4 h-4 text-red-650" />
                            <span>{formatIndonesianDate(record.tanggal)}</span>
                          </span>
                          
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-md border border-zinc-200 dark:border-zinc-700 font-mono">
                            {formatDateShort(record.tanggal)}
                          </span>
                        </div>

                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                          Siswa Hadir Belajar ({record.peserta.length} Orang)
                        </p>

                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {record.peserta.map((name, ix) => (
                            <span 
                              key={ix} 
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800"
                            >
                              {name}
                            </span>
                          ))}
                        </div>

                        {/* Event details */}
                        {record.scheduleId && (
                          <div className="pt-1 select-none">
                            {(() => {
                              const connectedSchedule = schedules.find(s => s.id === record.scheduleId);
                              if (!connectedSchedule) return null;
                              return (
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-200/50 dark:border-zinc-800/60 w-fit">
                                  <span className="w-2 h-2 rounded-full bg-red-650 animate-pulse" />
                                  <span>Jadwal yang tersambung: <span className="font-extrabold text-red-650 dark:text-red-400">{connectedSchedule.title}</span> (Setiap {connectedSchedule.hari} @ {connectedSchedule.waktu})</span>
                                </p>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Bar tombol kontrol samping kanan */}
                      <div className="flex items-center gap-1.5 md:self-start self-end shrink-0">
                        <button
                          onClick={() => startEditing(record)}
                          className="inline-flex items-center justify-center p-2 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                          title="Sunting data"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record.id!, record.tanggal)}
                          className="inline-flex items-center justify-center p-2 text-zinc-400 hover:text-red-600 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                          title="Hapus data"
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
    </motion.div>
  );
};
