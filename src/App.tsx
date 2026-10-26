import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AppProvider, useApp } from "./context/AppContext";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { Button } from "./ui/Button";
import { AttendanceInput } from "./pages/AttendanceInput";
import { AttendanceHistory } from "./pages/AttendanceHistory";
import { ReportGenerator } from "./pages/ReportGenerator";
import { ScheduleManagement } from "./pages/ScheduleManagement";
import { SyncManagement } from "./pages/SyncManagement";

import {
  PlusCircle,
  History,
  FileText,
  Clock,
  Sun,
  Moon,
  AlertCircle,
  Info,
  X,
  ArrowRightLeft,
} from "lucide-react";

type TabId = "input" | "riwayat" | "laporan" | "jadwal" | "sinkronisasi";

/** The five places the app goes, in the order a teacher meets them. */
const TABS: Array<{
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "input", label: "Presensi", icon: PlusCircle },
  { id: "riwayat", label: "Riwayat", icon: History },
  { id: "laporan", label: "Laporan", icon: FileText },
  { id: "jadwal", label: "Jadwal", icon: Clock },
  { id: "sinkronisasi", label: "Sinkron", icon: ArrowRightLeft },
];

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
  } = useApp();

  const renderActivePage = () => {
    switch (activeTab) {
      case "riwayat":
        return <AttendanceHistory key="riwayat" />;
      case "laporan":
        return <ReportGenerator key="laporan" />;
      case "jadwal":
        return <ScheduleManagement key="jadwal" />;
      case "sinkronisasi":
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
              Data yang masuk berisi {pendingImport?.sessions ?? 0} sesi
              presensi dan {pendingImport?.schedules ?? 0} jadwal.
            </p>
            <p>
              Data ini akan digabungkan dengan yang sudah ada di HP ini.
              Presensi pada tanggal yang sama akan disatukan, bukan ditimpa.
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
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`cs-toast cs-toast--${toast.type}`}
            >
              {toast.type === "error" && (
                <AlertCircle className="cs-icon" aria-hidden="true" />
              )}
              {toast.type === "info" && (
                <Info className="cs-icon" aria-hidden="true" />
              )}
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

      <header className="cs-masthead">
        <div className="cs-masthead__inner">
          <div>
            <h1 className="cs-wordmark">ClassSync</h1>
            <p className="cs-masthead__sub">Presensi kelas, tanpa internet</p>
          </div>

          <div className="cs-row">
            {onlineStatus ? null : (
              <span className="cs-masthead__offline">Mode offline</span>
            )}

            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              className="cs-iconbtn"
              aria-label={
                darkMode ? "Ganti ke tema terang" : "Ganti ke tema gelap"
              }
            >
              {darkMode ? (
                <Sun className="cs-icon" />
              ) : (
                <Moon className="cs-icon" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="cs-main">
        {/* Notices are single rows. Both are read once and dismissed, so
            neither earns the height of a panel above the register. */}
        {(deferredPrompt || !hideDbNotice) && (
          <div className="cs-shell cs-notices">
            {deferredPrompt && (
              <section className="cs-card cs-card--bar">
                <p className="cs-muted">
                  Pasang ClassSync di layar utama untuk membukanya seperti
                  aplikasi biasa.
                </p>
                <Button variant="primary" onClick={executePWAPrompt}>
                  Pasang
                </Button>
              </section>
            )}

            {!hideDbNotice && (
              <section className="cs-card cs-card--bar cs-card--inset">
                <p className="cs-muted">
                  Presensi tersimpan di ponsel ini saja dan tidak dikirim ke
                  mana pun. Ingat untuk mengunduh cadangan sesekali.
                </p>
                <button
                  type="button"
                  onClick={handleDismissDbNotice}
                  className="cs-iconbtn"
                  aria-label="Sembunyikan keterangan ini"
                >
                  <X className="cs-icon" />
                </button>
              </section>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">{renderActivePage()}</AnimatePresence>
      </main>

      <footer className="cs-footer">
        <p>ClassSync — presensi kelas dan laporan WhatsApp.</p>
        <p>Semua data tersimpan di ponsel ini.</p>
        {/* The build this phone is actually running. An installed app can sit
            on a cached shell for weeks, so "which version are you on?" is the
            first question any bug report needs answered — and the teacher has
            to be able to read it off the screen to answer it. */}
        <p className="cs-footer__version">
          Versi <span className="tabular">{__APP_VERSION__}</span>
        </p>
      </footer>

      <nav aria-label="Menu utama" className="cs-tabs">
        <div className="cs-tabs__inner">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? "page" : undefined}
              className="cs-tab"
            >
              <Icon className="cs-icon" aria-hidden="true" />
              <span className="cs-tab__label">{label}</span>
            </button>
          ))}
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
