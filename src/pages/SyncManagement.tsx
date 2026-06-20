import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { 
  Wifi, 
  QrCode, 
  Camera, 
  Link2, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  X,
  RefreshCw,
  Database,
  ArrowRight,
  DatabaseIcon,
  HelpCircle,
  FileDown
} from 'lucide-react';

export const SyncManagement: React.FC = () => {
  const {
    records,
    schedules,
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
    showToast
  } = useApp();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Synchronization Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-650" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 text-red-650 dark:text-red-400 rounded-2xl border border-red-500/10">
              <Wifi className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Koneksi &amp; Sinkronisasi Multi-HP</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Satukan basis data kehadiran siswa antar HP wali kelas atau pengajar secara instan dan aman, 100% tanpa server terpusat.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-805 rounded-xl text-3xs font-extrabold text-zinc-500 uppercase tracking-wider select-none shrink-0 self-start md:self-center">
            <div>
              <span className="block font-black text-zinc-900 dark:text-zinc-50 text-xs">{schedules.length}</span>
              <span>Jadwal</span>
            </div>
            <div className="border-l border-zinc-200 dark:border-zinc-800 pl-4">
              <span className="block font-black text-zinc-900 dark:text-zinc-50 text-xs">{records.length}</span>
              <span>Presensi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step by step simple instruction cards */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 rounded-2xl p-5 shadow-xs">
        <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4 border-b border-zinc-150 dark:border-zinc-805 pb-2.5">Panduan Sinkronisasi Singkat</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-850 rounded-xl relative overflow-hidden">
            <span className="text-[9px] font-black bg-red-500/10 text-red-650 dark:text-red-400 px-2 py-0.5 rounded uppercase">Langkah 1</span>
            <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 mt-2">Buka Sinkronisasi</h4>
            <p className="text-[10px] text-zinc-500 leading-normal mt-1">Buka tab Sinkronisasi ini secara bersamaan di kedua handphone pengajar.</p>
          </div>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-850 rounded-xl relative overflow-hidden">
            <span className="text-[9px] font-black bg-red-500/10 text-red-650 dark:text-red-400 px-2 py-0.5 rounded uppercase">Langkah 2</span>
            <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 mt-2">Tampilkan Barcode</h4>
            <p className="text-[10px] text-zinc-500 leading-normal mt-1">Di HP Pengirim, klik tombol <span className="font-semibold text-red-650">Tampilkan QR</span> untuk memadatkan data lokal.</p>
          </div>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-850 rounded-xl relative overflow-hidden">
            <span className="text-[9px] font-black bg-red-500/10 text-red-650 dark:text-red-400 px-2 py-0.5 rounded uppercase">Langkah 3</span>
            <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 mt-2">Pindai & Gabungkan</h4>
            <p className="text-[10px] text-zinc-500 leading-normal mt-1">Di HP Penerima, klik <span className="font-semibold text-red-650">Pindai QR</span> dan bidik barcode tersebut dengan kamera.</p>
          </div>
        </div>
      </div>

      {/* Live Interactive Scan Output / QR Modal inline display */}
      {(isScanning || (showQrModal && generatedQrUrl)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Active Camera Stream */}
          {isScanning && (
            <div className="bg-zinc-950 text-white rounded-2xl p-5 flex flex-col items-center justify-center space-y-4 relative border border-zinc-850 shadow-md">
              <button
                type="button"
                onClick={stopCameraScanner}
                className="absolute top-3.5 right-3.5 p-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Kamera Pemindai QR Aktif</span>
              </div>

              <div className="relative w-full aspect-video max-w-sm bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 h-0.5 bg-emerald-450 animate-[bounce_2s_infinite] shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                <div className="absolute inset-0 border border-dashed border-emerald-400/30 m-6 pointer-events-none rounded" />
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {scanError ? (
                <p className="text-[10px] text-red-405 text-center px-4 font-bold">{scanError}</p>
              ) : (
                <p className="text-[10.5px] text-zinc-400 text-center px-4 max-w-xs leading-normal font-medium">
                  Bidik kode QR yang ditampilkan pada HP pengirim. Sistem otomatis memproses penggabungan cerdas setelah terdeteksi.
                </p>
              )}
            </div>
          )}

          {/* Active Barcode display */}
          {showQrModal && generatedQrUrl && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-4 border border-zinc-200 dark:border-zinc-800 shadow-md">
              <div className="flex items-center justify-between w-full border-b border-zinc-150 dark:border-zinc-805 pb-3">
                <span className="text-xs font-black text-red-650 dark:text-red-450 uppercase flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-red-650" />
                  <span>Barcode Sinkronisasi Aktif</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowQrModal(false);
                    setGeneratedQrUrl('');
                  }}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="p-2.5 bg-white rounded-2xl border border-zinc-200/80 flex items-center justify-center shadow-2xs">
                <img
                  src={generatedQrUrl}
                  alt="ClassSync Sync QR"
                  className="w-48 h-48 object-contain"
                />
              </div>

              <p className="text-[10.5px] text-zinc-500 max-w-xs leading-normal font-medium">
                Pindai barcode di atas menggunakan HP partner Anda melalui tombol <b>Pindai QR Perangkat Lain</b> di samping kiri.
              </p>
            </div>
          )}

        </div>
      )}

      {/* Main Connection Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Method 1: QR scanning */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-3xs relative overflow-hidden">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[8.5px] font-black uppercase px-2 py-0.5 bg-red-500/10 text-red-650 dark:text-red-400 rounded-md">Metode Utama</span>
              <h3 className="text-xs font-black text-zinc-850 dark:text-zinc-150 uppercase tracking-wider">Kompilasi QR Tatap Layar</h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed font-semibold">
              Sistem transfer data yang aman dan langsung. Buka barcode di HP pengirim dan scan memanfaatkan pembaca kamera di HP penerima.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleGenerateQrCode}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 text-xs font-black rounded-xl transition-all shadow-3xs cursor-pointer border border-zinc-200 dark:border-zinc-700"
            >
              <QrCode className="w-4 h-4 text-red-650" />
              <span>Tampilkan QR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isScanning) stopCameraScanner();
                else startCameraScanner();
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-650 hover:bg-red-750 text-white text-xs font-black rounded-xl cursor-pointer transition-colors shadow-2xs"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>{isScanning ? 'Mati Kamera' : 'Pindai QR Kelas'}</span>
            </button>
          </div>
        </div>

        {/* Method 2: whatsapp share */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-3xs relative overflow-hidden">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[8.5px] font-black uppercase px-2 py-0.5 bg-red-500/10 text-red-650 dark:text-red-400 rounded-md">Pilihan Jarak Jauh</span>
              <h3 className="text-xs font-black text-zinc-850 dark:text-zinc-150 uppercase tracking-wider">Kirim Tautan WhatsApp (.link)</h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed font-semibold">
              Tidak sedang berkumpul bersama rekan guru di satu kelas? Kompres data absensi Anda menjadi satu tautan link gratis, lalu kirim via WA. Sekali ketuk, database tersatukan secara pintar!
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleCopyDirectSyncLink}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-black rounded-xl transition-colors shadow-2xs border border-transparent cursor-pointer"
            >
              <Link2 className="w-4 h-4 text-red-500 shrink-0" />
              <span>Salin Tautan Integrasi WhatsApp</span>
            </button>
          </div>
        </div>

      </div>

      {/* Fail-safe Cadangan Advanced Options Panel */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-black text-zinc-850 dark:text-zinc-200 uppercase tracking-wider border-b border-zinc-150 dark:border-zinc-805 pb-3">Panel Cadangan Mekanik (Fail-Safe)</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
          {/* JSON File storage */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-805 rounded-xl space-y-3.5 flex flex-col justify-between">
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">1. Ekspor &amp; Impor File Mentah (.json)</h4>
              <p className="text-[10px] text-zinc-400 leading-normal">
                Gunakan file cadangan offline mutlak untuk mengamankan data kehadiran kelas di media penyimpanan internal HP Anda sendiri.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={handleFullBackupExport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 text-[10.5px] font-black border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer shadow-3xs"
              >
                <Download className="w-3.5 h-3.5 text-red-500" />
                <span>Download Cadangan</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-650 hover:bg-red-750 text-white text-[10.5px] font-black rounded-lg cursor-pointer transition-colors shadow-2xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Cadangan</span>
                <input 
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const parsed = JSON.parse(event.target?.result as string);
                        handleSmartMergeImport(parsed);
                      } catch (error) {
                        showToast('Gagal membaca berkas JSON.', 'error');
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = ''; // Clean
                  }}
                />
              </label>
            </div>
          </div>

          {/* Raw plain-text stream copy/paste */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-805 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">2. Kode Teks Integrasi Manual (Base64)</h4>
              <p className="text-[10px] text-zinc-400 leading-normal">
                Tempelkan deretan deret kode teks super panjang (Base64) dari HP sumber secara instan untuk menggabungkan database.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateSyncHash}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-250 hover:bg-zinc-100 rounded-lg text-2xs font-bold border border-zinc-200 cursor-pointer"
                >
                  <span>Generator Kode</span>
                </button>

                {syncHashOutput && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(syncHashOutput);
                      showToast('Kode disalin!', 'success');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/15 text-red-650 rounded-lg font-mono text-[10px] truncate max-w-xs animate-pulse"
                  >
                    <span>Salin: {syncHashOutput.slice(0, 8)}...</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Paste / Tempel kode teks di sini..."
                  value={syncInputText}
                  onChange={(e) => setSyncInputText(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-2xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono rounded-lg focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleImportSyncHash}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-2xs font-extrabold rounded-lg cursor-pointer transition-colors shrink-0"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Demo data load shortcut for easier reviews */}
        <div className="bg-red-500/[0.01] dark:bg-red-950/[0.05] border border-red-500/10 dark:border-red-900/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
          <div className="flex items-center gap-2">
            <Database className="w-4.5 h-4.5 text-red-650" />
            <div>
              <h4 className="text-2xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Simulasi Sesi Belajar (Reviewer Sandbox)</h4>
              <p className="text-[10px] text-zinc-400">Gunakan ini jika ingin menguji fungsi laporan mingguan bwi-bulanan dengan basis data terisi otomatis.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLoadSampleData}
            className="px-3.5 py-2 bg-red-650 hover:bg-red-750 text-white text-3xs font-extrabold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Muat Data Contoh Simulasi (Mei-Juni 2026)
          </button>
        </div>
      </div>
    </motion.div>
  );
};
