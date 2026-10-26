import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
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
      className="cs-shell space-y-6"
    >
      {/* Synchronization Header Banner */}
      <div className="p-6 relative overflow-hidden">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-650" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-1">
          <div className="flex items-center gap-3">
            <div className="cs-hidden-tile">
              <Wifi className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Pindahkan data ke HP lain</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Salin presensi dan jadwal ke HP pengajar lain. Semua berjalan langsung antar HP, tanpa internet.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-3.5 text-sm font-extrabold text-zinc-500 select-none shrink-0 self-start md:self-center">
            <div>
              <span className="block font-black text-zinc-900 dark:text-zinc-50 text-sm">{schedules.length}</span>
              <span>Jadwal</span>
            </div>
            <div className="border-l pl-4">
              <span className="block font-black text-zinc-900 dark:text-zinc-50 text-sm">{records.length}</span>
              <span>Presensi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step by step simple instruction cards */}
      <div className="p-5">
        <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 mb-4 border-b pb-2.5">Caranya</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-3 relative overflow-hidden">
            <span className="cs-step">1</span>
            <h4 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 mt-2">Buka halaman ini di kedua HP</h4>
            <p className="text-sm text-zinc-500 leading-normal mt-1">Buka halaman Sinkron HP di HP pengirim dan HP penerima.</p>
          </div>
          <div className="p-3 relative overflow-hidden">
            <span className="cs-step">2</span>
            <h4 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 mt-2">Tampilkan QR di HP pengirim</h4>
            <p className="text-sm text-zinc-500 leading-normal mt-1">Di HP Pengirim, klik tombol <span className="font-semibold text-red-650">Tampilkan QR</span> untuk memadatkan data lokal.</p>
          </div>
          <div className="p-3 relative overflow-hidden">
            <span className="cs-step">3</span>
            <h4 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 mt-2">Pindai QR dari HP penerima</h4>
            <p className="text-sm text-zinc-500 leading-normal mt-1">Di HP Penerima, klik <span className="font-semibold text-red-650">Pindai QR</span> dan bidik barcode tersebut dengan kamera.</p>
          </div>
        </div>
      </div>

      {/* Live Interactive Scan Output / QR Modal inline display */}
      {(isScanning || (showQrModal && generatedQrUrl)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Active Camera Stream */}
          {isScanning && (
            <div className="bg-zinc-950 text-white p-5 flex flex-col items-center justify-center space-y-4 relative">
              <button
                type="button"
                onClick={stopCameraScanner}
                className="absolute top-3.5 right-3.5 p-1.5 /10 hover:/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-sm font-black text-emerald-400">Kamera aktif</span>
              </div>

              <div className="relative w-full aspect-video max-w-sm bg-black overflow-hidden border-white/10 flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 h-0.5 bg-emerald-450 animate-[bounce_2s_infinite] -[0_0_12px_rgba(52,211,153,0.9)]" />
                <div className="absolute inset-0 border-dashed border-emerald-400/30 m-6 pointer-events-none" />
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {scanError ? (
                <p className="text-sm text-red-405 text-center px-4 font-bold">{scanError}</p>
              ) : (
                <p className="text-sm text-zinc-400 text-center px-4 max-w-xs leading-normal font-medium">
                  Arahkan kamera ke QR di HP pengirim.
                </p>
              )}
            </div>
          )}

          {/* Active Barcode display */}
          {showQrModal && generatedQrUrl && (
            <div className="p-5 flex flex-col items-center justify-center text-center space-y-4">
              <div className="flex items-center justify-between w-full border-b pb-3">
                <span className="text-sm font-black text-red-650 dark:text-red-450 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-red-650" />
                  <span>QR siap dipindai</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowQrModal(false);
                    setGeneratedQrUrl('');
                  }}
                  className="p-1.5 hover: dark:hover:bg-zinc-800 text-zinc-400 transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="p-2.5 flex items-center justify-center -2xs">
                <img
                  src={generatedQrUrl}
                  alt="ClassSync Sync QR"
                  className="w-48 h-48 object-contain"
                />
              </div>

              <p className="text-sm text-zinc-500 max-w-xs leading-normal font-medium">
                Pindai QR ini dari HP penerima dengan tombol <b>Pindai QR</b>.
              </p>
            </div>
          )}

        </div>
      )}

      {/* Main Connection Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Method 1: QR scanning */}
        <div className="p-5 flex flex-col justify-between space-y-4 -3xs relative overflow-hidden">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              
              <h3 className="text-sm font-black text-zinc-850 dark:text-zinc-150">Lewat QR</h3>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed font-semibold">
              HP pengirim menampilkan QR, HP penerima memindainya dengan kamera.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleGenerateQrCode}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 text-sm font-black transition-all -3xs cursor-pointer"
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
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-650 hover:bg-red-750 text-white text-sm font-black cursor-pointer transition-colors -2xs"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>{isScanning ? 'Matikan kamera' : 'Pindai QR'}</span>
            </button>
          </div>
        </div>

        {/* Method 2: whatsapp share */}
        <div className="p-5 flex flex-col justify-between space-y-4 -3xs relative overflow-hidden">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              
              <h3 className="text-sm font-black text-zinc-850 dark:text-zinc-150">Kirim lewat WhatsApp</h3>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed font-semibold">
              Data Anda dibuat menjadi satu tautan. Kirim tautan itu lewat WhatsApp, lalu buka di HP tujuan.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleCopyDirectSyncLink}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-black transition-colors -2xs border-transparent cursor-pointer"
            >
              <Link2 className="w-4 h-4 text-red-500 shrink-0" />
              <span>Salin tautan</span>
            </button>
          </div>
        </div>

      </div>

      {/* Fail-safe Cadangan Advanced Options Panel */}
      <div className="p-5 space-y-4">
        <h3 className="text-sm font-black text-zinc-850 dark:text-zinc-200 border-b pb-3">Cara lain</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
          {/* JSON File storage */}
          <div className="p-4 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">Lewat file cadangan</h4>
              <p className="text-sm text-zinc-400 leading-normal">
                Simpan seluruh data sebagai satu file. Berguna juga sebagai cadangan rutin.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={handleFullBackupExport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 hover: dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-black transition-colors cursor-pointer -3xs"
              >
                <Download className="w-3.5 h-3.5 text-red-500" />
                <span>Unduh cadangan</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-650 hover:bg-red-750 text-white text-sm font-black cursor-pointer transition-colors -2xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih file cadangan</span>
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
          <div className="p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200">Lewat kode teks</h4>
              <p className="text-sm text-zinc-400 leading-normal">
                HP pengirim membuat kode, lalu tempelkan kode itu di sini.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateSyncHash}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-zinc-800 dark:text-zinc-250 hover: text-sm font-bold cursor-pointer"
                >
                  <span>Buat kode</span>
                </button>

                {syncHashOutput && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(syncHashOutput);
                      showToast('Kode disalin!', 'success');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/15 text-red-650 font-mono text-sm truncate max-w-xs animate-pulse"
                  >
                    <span>Salin: {syncHashOutput.slice(0, 8)}...</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  id="sync-code-input"
                  aria-label="Kode sinkronisasi dari HP pengirim"
                  placeholder="Tempel kode di sini"
                  value={syncInputText}
                  onChange={(e) => setSyncInputText(e.target.value)}
                  className="cs-input font-mono"
                />
                {/* Was a button labelled "OK", which said nothing about what
                    pressing it would do to the teacher's data. */}
                <Button onClick={handleImportSyncHash}>Gabungkan</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Only offered when there is nothing to destroy. Loading the sample
            wipes every real session, and it used to sit here permanently,
            styled like any other button, next to the backup controls. */}
        {records.length === 0 && schedules.length === 0 ? (
        <div className="bg-red-500/[0.01] dark:bg-red-950/[0.05] border-red-500/10 dark:border-red-900/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
          <div className="flex items-center gap-2">
            <Database className="w-4.5 h-4.5 text-red-650" />
            <div>
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Coba dengan data contoh</h4>
              <p className="text-sm text-zinc-400">Mengisi aplikasi dengan presensi contoh supaya Anda bisa mencoba laporannya. Hapus kapan saja lewat Riwayat.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLoadSampleData}
            className="px-3.5 py-2 bg-red-650 hover:bg-red-750 text-white text-sm font-extrabold transition-colors cursor-pointer shrink-0"
          >
            Muat data contoh
          </button>
        </div>
        ) : null}
      </div>

    </motion.div>
  );
};
