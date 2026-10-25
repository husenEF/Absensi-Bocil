import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { AttendanceInput } from './pages/AttendanceInput';
import { AttendanceHistory } from './pages/AttendanceHistory';
import { ReportGenerator } from './pages/ReportGenerator';
import { ScheduleManagement } from './pages/ScheduleManagement';
import { SyncManagement } from './pages/SyncManagement';

import { 
  PlusCircle, 
  History, 
  FileText, 
  Clock, 
  Wifi, 
  Sun, 
  Moon, 
  WifiOff, 
  AlertCircle,
  Database,
  ArrowRight,
  Sparkles,
  Info,
  X,
  Plus,
  ArrowRightLeft,
  Check
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    darkMode,
    setDarkMode,
    toast,
    dismissToast,
    pendingImport,
    confirmPendingImport,
    cancelPendingImport,
    onlineStatus,
    deferredPrompt,
    executePWAPrompt,
    hideDbNotice,
    handleDismissDbNotice,
    loading,
    records
  } = useApp();

  // Selected component view
  const renderActivePage = () => {
    switch (activeTab) {
      case 'input':
        return <AttendanceInput key="input" />;
      case 'riwayat':
        return <AttendanceHistory key="riwayat" />;
      case 'laporan':
        return <ReportGenerator key="laporan" />;
      case 'jadwal':
        return <ScheduleManagement key="jadwal" />;
      case 'sinkronisasi':
        return <SyncManagement key="sinkronisasi" />;
      default:
        return <AttendanceInput key="input" />;
    }
  };

  return (
    <div className="cs-app">
      
      {/* Incoming data waits for an answer here rather than on the Sinkron
          page: a sync link opens the app on whatever tab was last used, and
          the link is stripped from the URL straight away, so a dialog that
          only existed on one page meant the data was silently dropped. */}
      <ConfirmDialog
        open={pendingImport !== null}
        title="Gabungkan data ini?"
        body={
          <>
            <p>
              Data yang masuk berisi {pendingImport?.sessions ?? 0} sesi presensi dan{' '}
              {pendingImport?.schedules ?? 0} jadwal.
            </p>
            <p>
              Data ini akan digabungkan dengan yang sudah ada di HP ini. Presensi pada
              tanggal yang sama akan disatukan, bukan ditimpa.
            </p>
          </>
        }
        confirmLabel="Gabungkan data"
        cancelLabel="Jangan gabungkan"
        onCancel={cancelPendingImport}
        onConfirm={() => void confirmPendingImport()}
      />

      {/* Messages, with an optional single action such as Urungkan. */}
      {/* The live region is always in the DOM. A region created together with
          its text is not announced by most screen readers, so every toast —
          including the undo — was silent to assistive technology. */}
      <div className="cs-toast__wrap" role="status" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -16 }}
              className={`cs-toast cs-toast--${toast.type}`}
            >
              {toast.type === 'error' && <AlertCircle className="cs-icon" aria-hidden="true" />}
              {toast.type === 'info' && <Info className="cs-icon" aria-hidden="true" />}
              <span className="cs-toast__msg">{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  className="cs-toast__action"
                  onClick={() => {
                    toast.action?.onAction();
                    dismissToast();
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modernist Header */}
      <header className="cs-masthead">
        <div className="cs-masthead__inner">
          <div className="flex items-center gap-2.5">
            <div>
              <h1 className="cs-wordmark">ClassSync</h1>
              <p className="cs-masthead__sub">Presensi kelas, tanpa internet</p>
            </div>
          </div>

          {/* Config & Dark toggle buttons */}
          <div className="flex items-center gap-1.5">
            {onlineStatus ? null : (
              <span className="cs-masthead__offline">Mode offline</span>
            )}

            <button
              type="button"
              onClick={() => setDarkMode(prev => !prev)}
              className="cs-iconbtn"
              title="Ganti tema terang atau gelap"
              aria-label="Ganti tema terang atau gelap"
            >
              {darkMode ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4 text-zinc-500" />}
            </button>
          </div>
        </div>
      </header>

      {/* PWA Promotion notification */}
      {deferredPrompt && (
        <div className="bg-brick-ember text-white">
          <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2.5 text-sm font-extrabold">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Pasang ClassSync di layar HP Anda</span>
            </div>
            <button
              onClick={executePWAPrompt}
              className="px-3 py-1 bg-white text-brick-ember rounded-md font-bold cursor-pointer hover:bg-zinc-100 transition-colors"
            >
              Pasang
            </button>
          </div>
        </div>
      )}

      {/* Main Responsive Body Container */}
      <main className="cs-main">
        
        {/* Main database protection notice banner */}
        {!hideDbNotice && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-start justify-between gap-3 relative shadow-3xs"
          >
            <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-brick-ember rounded-l-2xl" />
            <div className="flex items-start gap-3 pl-1.5">
              <Database className="w-5 h-5 text-brick-ember shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-black text-zinc-800 dark:text-zinc-100">Data tersimpan di ponsel ini</h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                  Presensi yang Anda catat tersimpan di ponsel ini saja dan tidak dikirim ke mana pun. Ingat untuk mengunduh cadangan sesekali.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismissDbNotice}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 cursor-pointer transition-colors"
              title="Sembunyikan keterangan ini"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Active Page Viewport with tab fading transitions */}
        <div className="relative">
          <AnimatePresence mode="wait">
            {renderActivePage()}
          </AnimatePresence>
        </div>

      </main>

      {/* Footer view */}
      <footer className="cs-footer">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-1.5">
          <p className="text-sm font-black text-zinc-450 dark:text-zinc-500">ClassSync — presensi kelas dan laporan WhatsApp</p>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 font-semibold font-mono">Semua data tersimpan di ponsel ini.</p>
        </div>
      </footer>

      {/* Sticky Mobile bottom tabs for high-fidelity native feeling */}
      <nav aria-label="Menu utama" className="cs-tabs">
        <div className="max-w-xl w-full mx-auto flex items-center justify-around gap-1">
          
          {/* Tab 1: Input presensi */}
          <button
            onClick={() => setActiveTab('input')}
            aria-current={activeTab === 'input' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-h-[48px] py-2 flex-1 transition-all relative cursor-pointer ${
              activeTab === 'input' 
                ? 'text-brick-ember font-black' 
                : 'text-zinc-450 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350 font-bold'
            }`}
          >
            <PlusCircle className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'input' ? 'scale-110 text-brick-ember' : ''}`} />
            <span className="text-sm sm:text-sm mt-1 tracking-tight">Presensi</span>
            {activeTab === 'input' && (
              <motion.div layoutId="nav-dot" className="absolute -bottom-2.5 w-6 h-1 bg-brick-ember rounded-full" />
            )}
          </button>

          {/* Tab 2: Riwayat Sesi */}
          <button
            onClick={() => setActiveTab('riwayat')}
            aria-current={activeTab === 'riwayat' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-h-[48px] py-2 flex-1 transition-all relative cursor-pointer ${
              activeTab === 'riwayat' 
                ? 'text-brick-ember font-black' 
                : 'text-zinc-450 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350 font-bold'
            }`}
          >
            <History className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'riwayat' ? 'scale-110 text-brick-ember' : ''}`} />
            <span className="text-sm sm:text-sm mt-1 tracking-tight">Riwayat</span>
            {activeTab === 'riwayat' && (
              <motion.div layoutId="nav-dot" className="absolute -bottom-2.5 w-6 h-1 bg-brick-ember rounded-full" />
            )}
          </button>

          {/* Tab 3: Buat Laporan */}
          <button
            onClick={() => setActiveTab('laporan')}
            aria-current={activeTab === 'laporan' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-h-[48px] py-2 flex-1 transition-all relative cursor-pointer ${
              activeTab === 'laporan' 
                ? 'text-brick-ember font-black' 
                : 'text-zinc-450 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350 font-bold'
            }`}
          >
            <FileText className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'laporan' ? 'scale-110 text-brick-ember' : ''}`} />
            <span className="text-sm sm:text-sm mt-1 tracking-tight">Laporan</span>
            {activeTab === 'laporan' && (
              <motion.div layoutId="nav-dot" className="absolute -bottom-2.5 w-6 h-1 bg-brick-ember rounded-full" />
            )}
          </button>

          {/* Tab 4: Jadwal Kelas */}
          <button
            onClick={() => setActiveTab('jadwal')}
            aria-current={activeTab === 'jadwal' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-h-[48px] py-2 flex-1 transition-all relative cursor-pointer ${
              activeTab === 'jadwal' 
                ? 'text-brick-ember font-black' 
                : 'text-zinc-450 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-355 font-bold'
            }`}
          >
            <Clock className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'jadwal' ? 'scale-110 text-brick-ember' : ''}`} />
            <span className="text-sm sm:text-sm mt-1 tracking-tight">Jadwal</span>
            {activeTab === 'jadwal' && (
              <motion.div layoutId="nav-dot" className="absolute -bottom-2.5 w-6 h-1 bg-brick-ember rounded-full" />
            )}
          </button>

          {/* Tab 5: Sinkronisasi */}
          <button
            onClick={() => setActiveTab('sinkronisasi')}
            aria-current={activeTab === 'sinkronisasi' ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-h-[48px] py-2 flex-1 transition-all relative cursor-pointer ${
              activeTab === 'sinkronisasi' 
                ? 'text-brick-ember font-black' 
                : 'text-zinc-450 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350 font-bold'
            }`}
          >
            <ArrowRightLeft className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'sinkronisasi' ? 'scale-110 text-brick-ember' : ''}`} />
            <span className="text-sm sm:text-sm mt-1 tracking-tight">Sinkron HP</span>
            {activeTab === 'sinkronisasi' && (
              <motion.div layoutId="nav-dot" className="absolute -bottom-2.5 w-6 h-1 bg-brick-ember rounded-full" />
            )}
          </button>

        </div>
      </nav>

    </div>
  );
};

const App = () => {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
};

export default App;
