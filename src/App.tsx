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
  Battery,
  Signal,
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

  // Mobile status bar local time
  const [tickerTime, setTickerTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setTickerTime(`${hrs}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex items-center justify-center py-0 md:py-8 transition-colors duration-200">
      
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
              {toast.type === 'success' && <span className="w-2 h-2 rounded-full bg-emerald-505 animate-pulse" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-brick-ember" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-cool-steel" />}
              <span>{toast.message}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Extreme High-Fidelity Mobile Phone Frame Wrapper on desktop */}
      <div className="w-full max-w-[480px] min-h-screen md:min-h-[850px] md:max-h-[920px] bg-white dark:bg-zinc-900 md:rounded-[40px] md:border-[12px] md:border-zinc-850 dark:md:border-zinc-800 shadow-2xl flex flex-col relative overflow-hidden transition-all duration-300 md:aspect-[9/19.5]">
        
        {/* iOS Dynamic Island Notch */}
        <div className="hidden md:flex absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-6.5 bg-black rounded-full z-50 items-center justify-center shadow-inner">
          <div className="w-3 h-3 bg-zinc-900 rounded-full absolute left-4 border border-zinc-800/40" />
          <div className="w-1.5 h-1.5 bg-zinc-90 w-1 rounded-full absolute right-6 opacity-30" />
        </div>

        {/* Floating Battery & Carrier simulated status bar */}
        <div className="bg-white/95 dark:bg-zinc-900/95 border-b border-zinc-100 dark:border-zinc-850 px-5 pt-3 pb-2 flex items-center justify-between text-[11px] font-black tracking-wide text-zinc-550 dark:text-zinc-400 z-30 select-none">
          <div className="font-bold font-mono pl-1">{tickerTime || '08:00'}</div>
          <div className="flex items-center gap-1.5 pr-1 scale-95 origin-right">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center gap-0.5">
              <span>96%</span>
              <Battery className="w-4 h-4 rotate-0 shrink-0" />
            </div>
          </div>
        </div>

        {/* PWA Promotion notification inline pop */}
        {deferredPrompt && (
          <div className="bg-brick-ember text-white px-4 py-2.5 flex items-center justify-between gap-2.5 text-3xs font-extrabold uppercase tracking-wider relative z-20">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Instal AbsenBocil di layar HP Anda!</span>
            </div>
            <button
              onClick={executePWAPrompt}
              className="px-2.5 py-1 bg-white text-brick-ember rounded-md font-bold cursor-pointer hover:bg-zinc-100"
            >
              Pasang
            </button>
          </div>
        )}

        {/* Mobile App View Header */}
        <header className="bg-white dark:bg-zinc-900 border-b border-zinc-150 dark:border-zinc-805/80 px-4 py-3.5 shrink-0">
          <div className="flex items-center justify-between gap-3">
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
                <h1 className="text-sm font-black tracking-tight text-brick-ember leading-tight uppercase font-sans">
                  AbsenBocil<span className="text-zinc-700 dark:text-zinc-200 font-semibold tracking-normal text-xs ml-0.5 font-sans lowercase">.app</span>
                </h1>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-black tracking-widest uppercase mt-0.5">Presensi Offline &amp; WA Lapor</p>
              </div>
            </div>

            {/* Config & Dark toggle buttons */}
            <div className="flex items-center gap-1.5">
              <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                onlineStatus
                  ? 'bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-850'
                  : 'bg-brick-ember/10 text-brick-ember border-brick-ember/20'
              }`}>
                {onlineStatus ? 'Lokal' : 'Offline'}
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

        {/* Scrollable Viewport Arena */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-24 bg-[#fafcfc] dark:bg-zinc-950">
          
          {/* Main system alert banners */}
          {!hideDbNotice && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-start justify-between gap-3 relative shadow-3xs"
            >
              <div className="absolute top-0 bottom-0 left-0 w-1 bg-brick-ember rounded-l-2xl" />
              <div className="flex items-start gap-2.5 pl-1.5">
                <Database className="w-4.5 h-4.5 text-brick-ember shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-[10px] font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-widest">Database Terproteksi</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                    Simpan presensi langsung di penyimpanan internal ponsel Anda (IndexedDB) secara aman 100% offline.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismissDbNotice}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-805 rounded-lg text-zinc-400 cursor-pointer text-3xs"
                title="Dismiss info"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {/* Active View Container with nice page transition fade */}
          <AnimatePresence mode="wait">
            {renderActivePage()}
          </AnimatePresence>

        </div>

        {/* Sticky Mobile bottom tabs for high-fidelity native feeling */}
        <nav className="absolute bottom-0 inset-x-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-150 dark:border-zinc-805 px-2 py-2 flex items-center justify-around gap-1 z-40 shadow-[0_-5px_15px_rgba(0,0,0,0.03)] select-none">
          
          {/* Tab 1: Input presensi */}
          <button
            onClick={() => setActiveTab('input')}
            className={`flex flex-col items-center justify-center py-1 flex-1 transition-all relative cursor-pointer ${
              activeTab === 'input' 
                ? 'text-brick-ember font-black' 
                : 'text-zinc-450 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-355 font-bold'
            }`}
          >
            <PlusCircle className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'input' ? 'scale-110 text-brick-ember' : ''}`} />
            <span className="text-[9px] mt-1 tracking-tight">Presensi</span>
            {activeTab === 'input' && (
              <motion.div layoutId="nav-dot" className="absolute -bottom-1 w-5 h-1 bg-brick-ember rounded-full" />
            )}
          </button>

          {/* Tab 2: Riwayat Sesi */}
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex flex-col items-center justify-center py-1 flex-1 transition-all relative cursor-pointer ${
              activeTab === 'riwayat' 
                ? 'text-brick-ember font-black' 
                : 'text-zinc-450 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-355 font-bold'
            }`}
          >
            <History className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'riwayat' ? 'scale-110 text-brick-ember' : ''}`} />
            <span className="text-[9px] mt-1 tracking-tight">Riwayat</span>
            {activeTab === 'riwayat' && (
              <motion.div layoutId="nav-dot" className="absolute -bottom-1 w-5 h-1 bg-brick-ember rounded-full" />
            )}
          </button>

          {/* Tab 3: Buat Laporan */}
          <button
            onClick={() => setActiveTab('laporan')}
            className={`flex flex-col items-center justify-center py-1 flex-1 transition-all relative cursor-pointer ${
              activeTab === 'laporan' 
                ? 'text-brick-ember font-black' 
                : 'text-zinc-450 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-355 font-bold'
            }`}
          >
            <FileText className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'laporan' ? 'scale-110 text-brick-ember' : ''}`} />
            <span className="text-[9px] mt-1 tracking-tight">Laporan</span>
            {activeTab === 'laporan' && (
              <motion.div layoutId="nav-dot" className="absolute -bottom-1 w-5 h-1 bg-brick-ember rounded-full" />
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
            <span className="text-[9px] mt-1 tracking-tight">Jadwal</span>
            {activeTab === 'jadwal' && (
              <motion.div layoutId="nav-dot" className="absolute -bottom-1 w-5 h-1 bg-brick-ember rounded-full" />
            )}
          </button>

          {/* Tab 5: Sinkronisasi */}
          <button
            onClick={() => setActiveTab('sinkronisasi')}
            className={`flex flex-col items-center justify-center py-1 flex-1 transition-all relative cursor-pointer ${
              activeTab === 'sinkronisasi' 
                ? 'text-brick-ember font-black' 
                : 'text-zinc-450 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-355 font-bold'
            }`}
          >
            <ArrowRightLeft className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'sinkronisasi' ? 'scale-110 text-brick-ember' : ''}`} />
            <span className="text-[9px] mt-1 tracking-tight">Sinkron HP</span>
            {activeTab === 'sinkronisasi' && (
              <motion.div layoutId="nav-dot" className="absolute -bottom-1 w-5 h-1 bg-brick-ember rounded-full" />
            )}
          </button>
        </nav>

        {/* Elegant simulated mobile home button indicator for native feel on desktop */}
        <div className="hidden md:block absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-350 dark:bg-zinc-700 rounded-full z-50 pointer-events-none" />

      </div>

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
