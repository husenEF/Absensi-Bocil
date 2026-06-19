import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
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
  ArrowRightLeft
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    darkMode,
    setDarkMode,
    toast,
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
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 text-stone-900 dark:text-zinc-100 flex flex-col antialiased transition-colors duration-200">
      
      {/* Toast Alert floating */}
      <AnimatePresence>
        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-lg border text-xs font-bold font-sans ${
                toast.type === 'success' ? 'bg-zinc-900 text-white border-zinc-805 dark:bg-zinc-900 dark:text-white dark:border-zinc-800' : 
                toast.type === 'error' ? 'bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/20' : 
                'bg-zinc-900 text-stone-100 border-zinc-800'
              }`}
            >
              {toast.type === 'success' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
              <span>{toast.message}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modernist Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-805/90 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            
            {/* Logo and Brand Title */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight flex items-center gap-1 text-zinc-900 dark:text-white uppercase">
                    <span className="text-red-650">Absen</span>
                    <span className="text-stone-950 dark:text-zinc-100">Bocil</span>
                    <span className="text-red-650 text-xs font-black">😊</span>
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350 border border-zinc-250 dark:border-zinc-700 tracking-wider">v2.1</span>
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-widest mt-0.5">Sistem Presensi Offline &amp; WhatsApp Lapor</p>
              </div>
            </div>

            {/* Icons + badges toolbar */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              
              {/* PWA Promotion button */}
              {deferredPrompt && (
                <button
                  onClick={executePWAPrompt}
                  className="px-3 py-1 bg-red-650 hover:bg-red-750 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-3xs cursor-pointer inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3" />
                  <span>Pasang Aplikasi</span>
                </button>
              )}

              {/* Online Indicator Badge */}
              <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-colors ${
                onlineStatus 
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-705 dark:text-zinc-400 border-zinc-200 dark:border-zinc-750' 
                  : 'bg-red-500/10 text-red-650 border-red-500/20'
              }`}>
                {onlineStatus ? (
                  <>
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    <span>Lokal Aktif</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-650 shrink-0" />
                    <span>Nirkoneksi</span>
                  </>
                )}
              </div>

              {/* Dark Theme toggle button */}
              <button
                type="button"
                onClick={() => setDarkMode(prev => !prev)}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer border border-transparent"
                title={darkMode ? "Beralih ke Terang" : "Beralih ke Gelap"}
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-zinc-500" />}
              </button>

            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">
        
        {/* Protected DB Notice Banner */}
        {!hideDbNotice && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-start justify-between gap-3 relative shadow-3xs"
          >
            {/* Accent strip */}
            <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-650" />
            
            <div className="flex items-start gap-3 pl-1.5">
              <Database className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-xs font-black text-zinc-850 dark:text-zinc-100 uppercase tracking-wider">🔒 Database Offline Terproteksi Aman</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal font-semibold">
                  Aplikasi ini menyimpan seluruh absensi langsung di penyimpanan internal ponsel Anda (IndexedDB) secara offline. Data Anda tidak akan dikirim ke server luar guna menjaga privasi peserta.
                </p>
                <div className="pt-1.5 flex items-center gap-4 text-3xs font-black uppercase text-red-650 tracking-wider">
                  <button onClick={() => setActiveTab('sinkronisasi')} className="hover:underline flex items-center gap-1 cursor-pointer">
                    <span>Menu Sinkronisasi HP</span>
                    <ArrowRight className="w-3" />
                  </button>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleDismissDbNotice}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-805 rounded-lg text-zinc-400 transition-colors cursor-pointer"
              title="Sembunyikan info"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Tab Navigation Menu */}
        <nav className="bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-1 shadow-2xs">
          <button
            onClick={() => setActiveTab('input')}
            className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-wide cursor-pointer ${
              activeTab === 'input' 
                ? 'bg-red-650 text-white shadow-2xs' 
                : 'text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-805'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Isi Presensi</span>
          </button>

          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-wide cursor-pointer ${
              activeTab === 'riwayat' 
                ? 'bg-red-650 text-white shadow-2xs' 
                : 'text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-805'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Sesi</span>
          </button>

          <button
            onClick={() => setActiveTab('laporan')}
            className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-wide cursor-pointer ${
              activeTab === 'laporan' 
                ? 'bg-red-650 text-white shadow-2xs' 
                : 'text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-805'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Buat Laporan</span>
          </button>

          <button
            onClick={() => setActiveTab('jadwal')}
            className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-wide cursor-pointer ${
              activeTab === 'jadwal' 
                ? 'bg-red-650 text-white shadow-2xs' 
                : 'text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-805'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Jadwal Kelas</span>
          </button>

          <button
            onClick={() => setActiveTab('sinkronisasi')}
            className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-wide cursor-pointer ${
              activeTab === 'sinkronisasi' 
                ? 'bg-red-650 text-white shadow-2xs' 
                : 'text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-805'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Sinkronisasi</span>
          </button>
        </nav>

        {/* Content Render Area */}
        <AnimatePresence mode="wait">
          {renderActivePage()}
        </AnimatePresence>

      </main>

      {/* Humble Elegant Footer Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-805 py-6 mt-12 select-none">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-1.5">
          <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400 dark:text-zinc-500">AbsenBocil 😊 Siswa Presensi &amp; WhatsApp Bulanan Lapor</p>
          <p className="text-3xs text-zinc-400 dark:text-zinc-500 font-semibold">Tersimpan secara sandboxed penuh di Browser lokal. Hak Cipta Terlindungi.</p>
        </div>
      </footer>

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
