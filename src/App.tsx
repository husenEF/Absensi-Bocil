import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { AttendanceInput } from './pages/AttendanceInput';
import { AttendanceHistory } from './pages/AttendanceHistory';
import { ReportGenerator } from './pages/ReportGenerator';
import { ScheduleManagement } from './pages/ScheduleManagement';
import { SyncManagement } from './pages/SyncManagement';

// Import custom app logo image generated
// @ts-ignore
import logoImg from './assets/images/absenbocil_logo_1781882615871.jpg';

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
      
      {/* Toast Alert floating - standard positioning inside viewport */}
      <AnimatePresence>
        {toast && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className={`flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-xl border text-xs font-bold font-sans ${
                toast.type === 'success' ? 'bg-zinc-900 border-zinc-800 text-white' : 
                toast.type === 'error' ? 'bg-brick-ember/10 border-brick-ember/20 text-brick-ember' : 
                'bg-smoky-rose/10 border-smoky-rose/20 text-smoky-rose'
              }`}
            >
              {toast.type === 'success' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-brick-ember" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-cool-steel" />}
              <span>{toast.message}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modernist Header */}
      <header className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-150 dark:border-zinc-805/80 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* Premium custom high-fidelity brand launcher logo */}
            <div className="relative">
              <img 
                src={logoImg} 
                alt="AbsenBocil logo" 
                referrerPolicy="no-referrer"
                className="w-11 h-11 object-cover rounded-xl shadow-xs border border-zinc-200/40 dark:border-zinc-800"
              />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-brick-ember border-2 border-white dark:border-zinc-900" />
            </div>

            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-brick-ember leading-tight uppercase font-sans">
                AbsenBocil<span className="text-zinc-700 dark:text-zinc-200 font-semibold tracking-normal text-xs ml-0.5 font-sans lowercase">.app</span>
              </h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-black tracking-widest uppercase mt-0.5">Presensi Offline &amp; WA Lapor</p>
            </div>
          </div>

          {/* Config & Dark toggle buttons */}
          <div className="flex items-center gap-1.5">
            <div className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
              onlineStatus
                ? 'bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200/85 dark:border-zinc-850'
                : 'bg-brick-ember/10 text-brick-ember border-brick-ember/20'
            }`}>
              {onlineStatus ? 'Lokal Aktif' : 'Offline'}
            </div>

            <button
              type="button"
              onClick={() => setDarkMode(prev => !prev)}
              className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 text-zinc-650 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors"
              title="Beralih Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4 text-zinc-500" />}
            </button>
          </div>
        </div>
      </header>

      {/* PWA Promotion notification */}
      {deferredPrompt && (
        <div className="bg-brick-ember text-white">
          <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2.5 text-2xs font-extrabold uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Instal AbsenBocil di layar HP Anda!</span>
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
      <main className="flex-grow max-w-4xl w-full mx-auto px-4 py-6 space-y-5 pb-24">
        
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
                <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-widest">Database Terproteksi Aman</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                  Aplikasi menyimpan seluruh presensi langsung di penyimpanan internal ponsel Anda (IndexedDB) secara offline. Data aman, privat, dan tidak dikirim ke server luar guna menjaga hak privasi siswa.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismissDbNotice}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 cursor-pointer transition-colors"
              title="Sembunyikan info"
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
      <footer className="border-t border-zinc-200 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-900/40 py-6 select-none mt-12 pb-28">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-1.5">
          <p className="text-[10px] uppercase font-black tracking-widest text-zinc-450 dark:text-zinc-500">AbsenBocil 😊 Siswa Presensi &amp; WhatsApp Bulanan Lapor</p>
          <p className="text-3xs text-zinc-400 dark:text-zinc-500 font-semibold font-mono">Tersimpan secara sandboxed penuh di Browser lokal Anda. Hak Cipta Terlindungi.</p>
        </div>
      </footer>

      {/* Sticky Mobile bottom tabs for high-fidelity native feeling */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-150 dark:border-zinc-805 px-2 py-3.5 flex items-center justify-around gap-1 z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] select-none">
        <div className="max-w-xl w-full mx-auto flex items-center justify-around gap-1">
          
          {/* Tab 1: Input presensi */}
          <button
            onClick={() => setActiveTab('input')}
            className={`flex flex-col items-center justify-center py-1 flex-1 transition-all relative cursor-pointer ${
              activeTab === 'input' 
                ? 'text-brick-ember font-black' 
                : 'text-zinc-450 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350 font-bold'
            }`}
          >
            <PlusCircle className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'input' ? 'scale-110 text-brick-ember' : ''}`} />
            <span className="text-[10px] sm:text-xs mt-1 tracking-tight">Presensi</span>
            {activeTab === 'input' && (
              <motion.div layoutId="nav-dot" className="absolute -bottom-2.5 w-6 h-1 bg-brick-ember rounded-full" />
            )}
          </button>

          {/* Tab 2: Riwayat Sesi */}
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex flex-col items-center justify-center py-1 flex-1 transition-all relative cursor-pointer ${
              activeTab === 'riwayat' 
                ? 'text-brick-ember font-black' 
                : 'text-zinc-450 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350 font-bold'
            }`}
          >
            <History className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'riwayat' ? 'scale-110 text-brick-ember' : ''}`} />
            <span className="text-[10px] sm:text-xs mt-1 tracking-tight">Riwayat</span>
            {activeTab === 'riwayat' && (
              <motion.div layoutId="nav-dot" className="absolute -bottom-2.5 w-6 h-1 bg-brick-ember rounded-full" />
            )}
          </button>

          {/* Tab 3: Buat Laporan */}
          <button
            onClick={() => setActiveTab('laporan')}
            className={`flex flex-col items-center justify-center py-1 flex-1 transition-all relative cursor-pointer ${
              activeTab === 'laporan' 
                ? 'text-brick-ember font-black' 
                : 'text-zinc-450 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350 font-bold'
            }`}
          >
            <FileText className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'laporan' ? 'scale-110 text-brick-ember' : ''}`} />
            <span className="text-[10px] sm:text-xs mt-1 tracking-tight">Laporan</span>
            {activeTab === 'laporan' && (
              <motion.div layoutId="nav-dot" className="absolute -bottom-2.5 w-6 h-1 bg-brick-ember rounded-full" />
            )}
          </button>

          {/* Tab 4: Jadwal Kelas */}
          <button
            onClick={() => setActiveTab('jadwal')}
            className={`flex flex-col items-center justify-center py-1 flex-1 transition-all relative cursor-pointer ${
              activeTab === 'jadwal' 
                ? 'text-brick-ember font-black' 
                : 'text-zinc-450 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-355 font-bold'
            }`}
          >
            <Clock className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'jadwal' ? 'scale-110 text-brick-ember' : ''}`} />
            <span className="text-[10px] sm:text-xs mt-1 tracking-tight">Jadwal</span>
            {activeTab === 'jadwal' && (
              <motion.div layoutId="nav-dot" className="absolute -bottom-2.5 w-6 h-1 bg-brick-ember rounded-full" />
            )}
          </button>

          {/* Tab 5: Sinkronisasi */}
          <button
            onClick={() => setActiveTab('sinkronisasi')}
            className={`flex flex-col items-center justify-center py-1 flex-1 transition-all relative cursor-pointer ${
              activeTab === 'sinkronisasi' 
                ? 'text-brick-ember font-black' 
                : 'text-zinc-450 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350 font-bold'
            }`}
          >
            <ArrowRightLeft className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'sinkronisasi' ? 'scale-110 text-brick-ember' : ''}`} />
            <span className="text-[10px] sm:text-xs mt-1 tracking-tight">Sinkron HP</span>
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
