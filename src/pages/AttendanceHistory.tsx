import React, {useState} from 'react';
import {motion} from 'motion/react';
import {
  CalendarDays,
  Download,
  History,
  Pencil,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {formatIndonesianDate} from '../utils/date';
import {STATUS_LABEL, STATUS_ORDER, type StatusKey} from '../styles/palette';
import {nameKey, tally} from '../roster';
import {Button} from '../ui/Button';
import {Field} from '../ui/Field';
import {ConfirmDialog} from '../ui/ConfirmDialog';

/** Status counts for a session, whichever shape it was saved in. */
const summarise = (record: {peserta: string[]; statuses?: Record<string, StatusKey>}) => {
  if (record.statuses && Object.keys(record.statuses).length > 0) {
    return tally(record.statuses);
  }
  // Saved before statuses existed: everyone listed was present.
  return {hadir: record.peserta.length, sakit: 0, izin: 0, alpa: 0};
};

export const AttendanceHistory: React.FC = () => {
  const {
    records,
    students,
    loading,
    schedules,
    setActiveTab,
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
    handleClearAllRecords,
    handleFullBackupExport,
    selectedRecordIds,
    handleToggleSelectRecord,
    handleSelectAllRecords,
    handleDeselectAllRecords,
    handleExportCSV,
    handleExportJSON,
    handleCopySelectedCSV,
  } = useApp();

  const [showExport, setShowExport] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  if (loading) {
    return (
      <div className="cs-card" aria-live="polite">
        <p className="cs-muted">Memuat presensi yang tersimpan di ponsel ini…</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0}}
      className="cs-page"
    >
      <section className="cs-card">
        <div className="cs-card__head">
          <h2 className="cs-card__title">
            <History className="cs-icon" aria-hidden="true" />
            Riwayat presensi
          </h2>
          {records.length > 0 ? (
            <Button
              variant="secondary"
              icon={<Download className="cs-icon" />}
              aria-expanded={showExport}
              onClick={() => setShowExport((v) => !v)}
            >
              Ekspor
            </Button>
          ) : null}
        </div>
        <p className="cs-muted">
          {records.length > 0
            ? `${records.length} sesi tersimpan di ponsel ini.`
            : 'Semua presensi tersimpan di ponsel ini, bukan di internet.'}
        </p>

        {showExport && records.length > 0 ? (
          <div className="cs-card cs-card--inset">
            <h3 className="cs-subtitle">Ekspor presensi</h3>
            <p className="cs-muted">
              {selectedRecordIds.length > 0
                ? `${selectedRecordIds.length} sesi dipilih.`
                : 'Pilih sesi yang ingin diekspor.'}
            </p>
            <div className="cs-row">
              <Button onClick={handleSelectAllRecords}>Pilih semua</Button>
              <Button
                variant="ghost"
                disabled={selectedRecordIds.length === 0}
                onClick={handleDeselectAllRecords}
              >
                Kosongkan pilihan
              </Button>
            </div>
            <div className="cs-row">
              <Button
                variant="primary"
                disabled={selectedRecordIds.length === 0}
                onClick={handleExportCSV}
              >
                Unduh CSV
              </Button>
              <Button disabled={selectedRecordIds.length === 0} onClick={handleExportJSON}>
                Unduh JSON
              </Button>
              <Button
                variant="ghost"
                disabled={selectedRecordIds.length === 0}
                onClick={handleCopySelectedCSV}
              >
                Salin CSV
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {records.length === 0 ? (
        <section className="cs-card">
          <div className="cs-empty">
            <CalendarDays className="cs-empty__icon" aria-hidden="true" />
            <h3 className="cs-empty__title">Belum ada presensi</h3>
            <p className="cs-empty__body">
              Setiap sesi yang Anda simpan akan muncul di sini, lengkap dengan siapa
              yang hadir.
            </p>
            <Button variant="primary" onClick={() => setActiveTab('input')}>
              Catat presensi pertama
            </Button>
          </div>
        </section>
      ) : null}

      {records.map((record) => {
        const counts = summarise(record);
        const linked = schedules.find((s) => s.id === record.scheduleId);
        const isEditing = editingId === record.id;

        return (
          <section key={record.id} className="cs-card">
            {isEditing ? (
              <>
                <h3 className="cs-subtitle">Ubah sesi</h3>

                <Field id={`edit-date-${record.id}`} label="Tanggal kegiatan">
                  {(p) => (
                    <input
                      {...p}
                      className="cs-input"
                      type="date"
                      value={editingTanggal}
                      onChange={(e) => setEditingTanggal(e.target.value)}
                    />
                  )}
                </Field>

                <Field id={`edit-sched-${record.id}`} label="Jadwal rutin" optional>
                  {(p) => (
                    <select
                      {...p}
                      className="cs-select"
                      value={editingScheduleId ?? ''}
                      onChange={(e) =>
                        setEditingScheduleId(e.target.value ? Number(e.target.value) : undefined)
                      }
                    >
                      <option value="">Tidak terhubung jadwal</option>
                      {schedules.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} — setiap {s.hari}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>

                <Field
                  id={`edit-names-${record.id}`}
                  label="Santri yang hadir"
                  hint="Pisahkan dengan koma."
                >
                  {(p) => (
                    <textarea
                      {...p}
                      className="cs-textarea"
                      rows={3}
                      value={editingNames}
                      onChange={(e) => setEditingNames(e.target.value)}
                    />
                  )}
                </Field>

                <div className="cs-row">
                  <Button variant="primary" onClick={() => record.id && saveEditedRecord(record.id)}>
                    Simpan perubahan
                  </Button>
                  <Button variant="ghost" onClick={cancelEditing}>
                    Batal
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="cs-card__head">
                  <h3 className="cs-subtitle">{formatIndonesianDate(record.tanggal)}</h3>
                  <label className="cs-check">
                    <input
                      type="checkbox"
                      checked={record.id ? selectedRecordIds.includes(record.id) : false}
                      onChange={() => record.id && handleToggleSelectRecord(record.id)}
                    />
                    <span>Pilih untuk ekspor</span>
                  </label>
                </div>

                {linked ? (
                  <p className="cs-muted">
                    {linked.title} — setiap {linked.hari}, {linked.waktu}
                  </p>
                ) : null}

                <ul className="cs-tally" aria-label="Ringkasan kehadiran">
                  {STATUS_ORDER.filter((k) => counts[k] > 0).map((k) => (
                    <li key={k} className={`cs-chip cs-chip--${k}`}>
                      {STATUS_LABEL[k]} {counts[k]}
                    </li>
                  ))}
                </ul>

                <p className="cs-names">
                  {record.peserta.length > 0 ? record.peserta.join(', ') : 'Tidak ada yang hadir.'}
                </p>

                {record.statuses
                  ? STATUS_ORDER.filter((k) => k !== 'hadir').map((k) => {
                      // An absent santri is by definition not in `peserta`,
                      // so their display name has to come from the roster;
                      // looking in peserta always fell through to the raw
                      // lower-cased key ("budi santoso").
                      const names = Object.entries(record.statuses ?? {})
                        .filter(([, v]) => v === k)
                        .map(([key]) => {
                          const student = students.find((st) => st.nameKey === key);
                          const inRecord = record.peserta.find((n) => nameKey(n) === key);
                          return student?.name ?? inRecord ?? key;
                        });
                      if (names.length === 0) return null;
                      return (
                        <p key={k} className="cs-muted">
                          <strong>{STATUS_LABEL[k]}:</strong> {names.join(', ')}
                        </p>
                      );
                    })
                  : null}

                <div className="cs-row">
                  <Button
                    variant="secondary"
                    icon={<Pencil className="cs-icon" />}
                    onClick={() => startEditing(record)}
                  >
                    Ubah
                  </Button>
                  <Button
                    variant="ghost"
                    icon={<Trash2 className="cs-icon" />}
                    onClick={() => record.id && handleDeleteRecord(record.id, record.tanggal)}
                  >
                    Hapus
                  </Button>
                </div>
              </>
            )}
          </section>
        );
      })}

      {records.length > 0 ? (
        <section className="cs-card cs-card--danger">
          <h2 className="cs-subtitle">
            <TriangleAlert className="cs-icon" aria-hidden="true" /> Hapus semua presensi
          </h2>
          <p className="cs-muted">
            Menghapus seluruh {records.length} sesi dari ponsel ini. Tindakan ini tidak
            dapat dibatalkan, jadi unduh cadangan dulu.
          </p>
          <div className="cs-row">
            <Button variant="primary" onClick={handleFullBackupExport}>
              Unduh cadangan
            </Button>
            <Button variant="warning" onClick={() => setConfirmClear(true)}>
              Hapus semua presensi
            </Button>
          </div>
        </section>
      ) : null}

      <ConfirmDialog
        open={confirmClear}
        title="Hapus semua presensi?"
        body={
          <>
            <p>
              {records.length} sesi akan dihapus dari ponsel ini dan tidak dapat
              dikembalikan.
            </p>
            <p>Daftar santri dan jadwal tetap tersimpan.</p>
          </>
        }
        confirmPhrase="HAPUS"
        confirmLabel="Hapus semua presensi"
        cancelLabel="Jangan hapus"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          void handleClearAllRecords();
        }}
      />
    </motion.div>
  );
};
