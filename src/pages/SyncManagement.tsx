import React from 'react';
import {motion} from 'motion/react';
import {
  Camera,
  Copy,
  Database,
  Download,
  Link2,
  QrCode,
  Upload,
  Wifi,
  X,
} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {Button} from '../ui/Button';
import {Field} from '../ui/Field';

/** The three things a teacher does, in order, to move data to another phone. */
const STEPS = [
  {
    title: 'Buka halaman ini di kedua HP',
    body: 'Buka halaman Sinkron di HP pengirim dan di HP penerima.',
  },
  {
    title: 'Tampilkan QR di HP pengirim',
    body: 'Di HP pengirim, tekan Tampilkan QR untuk memadatkan data yang tersimpan.',
  },
  {
    title: 'Pindai QR dari HP penerima',
    body: 'Di HP penerima, tekan Pindai QR lalu bidik barcode tersebut dengan kamera.',
  },
];

export const SyncManagement: React.FC = () => {
  const {
    records,
    schedules,
    syncHashOutput,
    syncInputText,
    setSyncInputText,
    showQrModal,
    setShowQrModal,
    generatedQrUrl,
    setGeneratedQrUrl,
    isScanning,
    scanError,
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
    showToast,
  } = useApp();

  return (
    <motion.div
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0}}
      className="cs-page cs-page--wide"
    >
      <section className="cs-card">
        <div className="cs-card__head">
          <h2 className="cs-card__title">
            <Wifi className="cs-icon" aria-hidden="true" />
            Pindahkan data ke HP lain
          </h2>
          <ul className="cs-tally" aria-label="Data yang akan dipindahkan">
            <li className="cs-chip cs-chip--count">{schedules.length} jadwal</li>
            <li className="cs-chip cs-chip--count">{records.length} presensi</li>
          </ul>
        </div>
        <p className="cs-muted">
          Salin presensi dan jadwal ke HP pengajar lain. Semua berjalan langsung antar
          HP, tanpa internet.
        </p>
      </section>

      <section className="cs-card">
        <p className="cs-label">Caranya</p>
        <ol className="cs-grid-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="cs-card cs-card--inset">
              <span className="cs-step" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="cs-subtitle">{step.title}</h3>
              <p className="cs-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* The camera and the barcode only exist while one of them is in use. */}
      {isScanning || (showQrModal && generatedQrUrl) ? (
        <div className="cs-grid-2">
          {isScanning ? (
            <section className="cs-card">
              <div className="cs-card__head">
                <h3 className="cs-subtitle">
                  <Camera className="cs-icon" aria-hidden="true" />
                  Kamera aktif
                </h3>
                <Button
                  variant="ghost"
                  icon={<X className="cs-icon" />}
                  onClick={stopCameraScanner}
                >
                  Matikan kamera
                </Button>
              </div>

              <div className="cs-viewfinder">
                <video ref={videoRef} className="cs-viewfinder__video" />
              </div>
              <canvas ref={canvasRef} className="cs-visually-hidden" />

              <p className={scanError ? 'cs-field__error' : 'cs-muted'} aria-live="polite">
                {scanError ?? 'Arahkan kamera ke QR yang tampil di HP pengirim.'}
              </p>
            </section>
          ) : null}

          {showQrModal && generatedQrUrl ? (
            <section className="cs-card">
              <div className="cs-card__head">
                <h3 className="cs-subtitle">
                  <QrCode className="cs-icon" aria-hidden="true" />
                  QR siap dipindai
                </h3>
                <Button
                  variant="ghost"
                  icon={<X className="cs-icon" />}
                  onClick={() => {
                    setShowQrModal(false);
                    setGeneratedQrUrl('');
                  }}
                >
                  Tutup
                </Button>
              </div>

              <div className="cs-qr">
                <img src={generatedQrUrl} alt="QR sinkronisasi ClassSync" />
              </div>

              <p className="cs-muted">
                Pindai QR ini dari HP penerima dengan tombol <b>Pindai QR</b>.
              </p>
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="cs-grid-2">
        <section className="cs-card">
          <h3 className="cs-subtitle">
            <QrCode className="cs-icon" aria-hidden="true" />
            Lewat QR
          </h3>
          <p className="cs-muted">
            HP pengirim menampilkan QR, HP penerima memindainya dengan kamera.
          </p>
          <div className="cs-row">
            <Button icon={<QrCode className="cs-icon" />} onClick={handleGenerateQrCode}>
              Tampilkan QR
            </Button>
            <Button
              variant="primary"
              icon={<Camera className="cs-icon" />}
              onClick={() => (isScanning ? stopCameraScanner() : startCameraScanner())}
            >
              {isScanning ? 'Matikan kamera' : 'Pindai QR'}
            </Button>
          </div>
        </section>

        <section className="cs-card">
          <h3 className="cs-subtitle">
            <Link2 className="cs-icon" aria-hidden="true" />
            Kirim lewat WhatsApp
          </h3>
          <p className="cs-muted">
            Data Anda dibuat menjadi satu tautan. Kirim tautan itu lewat WhatsApp, lalu
            buka di HP tujuan.
          </p>
          <div className="cs-row">
            <Button icon={<Link2 className="cs-icon" />} onClick={handleCopyDirectSyncLink}>
              Salin tautan
            </Button>
          </div>
        </section>
      </div>

      <section className="cs-card">
        <p className="cs-label">Cara lain</p>

        <div className="cs-grid-2 cs-grid--top">
          <div className="cs-card cs-card--inset">
            <h3 className="cs-subtitle">Lewat file cadangan</h3>
            <p className="cs-muted">
              Simpan seluruh data sebagai satu file. Berguna juga sebagai cadangan
              rutin.
            </p>
            <div className="cs-row">
              <Button
                icon={<Download className="cs-icon" />}
                onClick={handleFullBackupExport}
              >
                Unduh cadangan
              </Button>

              {/* A file picker has to be a label wrapping the input; styled as
                  a button so it reads as the pair of the one beside it. */}
              <label className="cs-btn cs-btn--secondary">
                <span className="cs-btn__icon" aria-hidden="true">
                  <Upload className="cs-icon" />
                </span>
                <span className="cs-btn__label">Pilih file cadangan</span>
                <input
                  type="file"
                  accept=".json"
                  className="cs-visually-hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const parsed = JSON.parse(event.target?.result as string);
                        handleSmartMergeImport(parsed);
                      } catch {
                        showToast('Gagal membaca berkas JSON.', 'error');
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>

          <div className="cs-card cs-card--inset">
            <h3 className="cs-subtitle">Lewat kode teks</h3>
            <p className="cs-muted">
              HP pengirim membuat kode, lalu tempelkan kode itu di sini.
            </p>

            <div className="cs-row">
              <Button onClick={handleGenerateSyncHash}>Buat kode</Button>
              {syncHashOutput ? (
                <Button
                  variant="ghost"
                  icon={<Copy className="cs-icon" />}
                  onClick={() => {
                    navigator.clipboard.writeText(syncHashOutput);
                    showToast('Kode disalin.', 'success');
                  }}
                >
                  Salin kode
                </Button>
              ) : null}
            </div>

            <Field
              id="sync-code-input"
              label="Kode dari HP pengirim"
              hint="Tempelkan kodenya, lalu tekan Gabungkan."
            >
              {(p) => (
                <input
                  {...p}
                  className="cs-input"
                  type="text"
                  value={syncInputText}
                  onChange={(e) => setSyncInputText(e.target.value)}
                />
              )}
            </Field>

            {/* Was a button labelled "OK", which said nothing about what
                pressing it would do to the teacher's data. */}
            <div className="cs-row">
              <Button onClick={handleImportSyncHash}>Gabungkan</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Only offered when there is nothing to destroy. Loading the sample
          wipes every real session, and it used to sit here permanently,
          styled like any other button, next to the backup controls. */}
      {records.length === 0 && schedules.length === 0 ? (
        <section className="cs-card cs-card--danger">
          <h3 className="cs-subtitle">
            <Database className="cs-icon" aria-hidden="true" />
            Coba dengan data contoh
          </h3>
          <p className="cs-muted">
            Mengisi aplikasi dengan presensi contoh supaya Anda bisa mencoba laporannya.
            Hapus kapan saja lewat Riwayat.
          </p>
          <div className="cs-row">
            <Button onClick={handleLoadSampleData}>Muat data contoh</Button>
          </div>
        </section>
      ) : null}
    </motion.div>
  );
};
