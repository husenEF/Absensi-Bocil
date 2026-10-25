import React, {useState} from 'react';
import {motion} from 'motion/react';
import {Calendar, Check, Plus, Save, UserPlus, Users} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {formatIndonesianDate} from '../utils/date';
import {STATUS_LABEL, STATUS_ORDER} from '../styles/palette';
import {Button} from '../ui/Button';
import {Field} from '../ui/Field';
import {StatusPicker} from '../ui/StatusPicker';
import {ConfirmDialog} from '../ui/ConfirmDialog';

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const formatYMD = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/** Past and upcoming occurrences of a schedule's weekday, for catching up. */
const getWeekdayOccurrences = (hariName: string, countPast = 8, countFuture = 1) => {
  const dayIndex = INDO_DAYS.indexOf(hariName);
  if (dayIndex === -1) return [];

  const now = new Date();
  const thisWeek = new Date();
  thisWeek.setDate(now.getDate() + (dayIndex - now.getDay()));

  const list: Array<{dateStr: string; label: string}> = [];

  for (let i = countFuture; i >= 1; i--) {
    const d = new Date(thisWeek);
    d.setDate(thisWeek.getDate() + i * 7);
    list.push({dateStr: formatYMD(d), label: `Pekan depan — ${formatIndonesianDate(formatYMD(d))}`});
  }

  const tw = formatYMD(thisWeek);
  list.push({dateStr: tw, label: `Pekan ini — ${formatIndonesianDate(tw)}`});

  for (let i = 1; i <= countPast; i++) {
    const d = new Date(thisWeek);
    d.setDate(thisWeek.getDate() - i * 7);
    const dateStr = formatYMD(d);
    const rel = i === 1 ? 'Pekan lalu' : `${i} pekan lalu`;
    list.push({dateStr, label: `${rel} — ${formatIndonesianDate(dateStr)}`});
  }

  return list;
};

export const AttendanceInput: React.FC = () => {
  const {
    tanggalInput,
    setTanggalInput,
    namesInput,
    setNamesInput,
    selectedScheduleId,
    setSelectedScheduleId,
    allRegisteredStudents,
    sessionStatusFor,
    setSessionStatus,
    handleMarkAllPresent,
    sessionTally,
    untouchedCount,
    handleAddStudent,
    handleSaveAttendance,
    lastSaved,
    dismissLastSaved,
    pendingOverwrite,
    confirmOverwrite,
    cancelOverwrite,
    schedules,
    setActiveTab,
  } = useApp();

  const [newName, setNewName] = useState('');
  const [newNameError, setNewNameError] = useState<string | undefined>();
  const [showBulk, setShowBulk] = useState(false);

  const linkedSchedule = schedules.find((s) => s.id === selectedScheduleId);
  const occurrences = linkedSchedule?.hari ? getWeekdayOccurrences(linkedSchedule.hari) : [];
  const hasRoster = allRegisteredStudents.length > 0;

  const submitNewName = async () => {
    if (!newName.trim()) {
      setNewNameError('Masukkan nama santri.');
      return;
    }
    const ok = await handleAddStudent(newName);
    if (ok) {
      setNewName('');
      setNewNameError(undefined);
    }
  };

  return (
    <motion.div
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0}}
      className="cs-page"
    >
      {/* What was just saved — shown in place, so saving does not move the
          teacher to a screen they did not ask for. */}
      {lastSaved ? (
        <section className="cs-card cs-card--success" aria-live="polite">
          <h2 className="cs-card__title">
            <Check className="cs-icon" aria-hidden="true" />
            Presensi tersimpan
          </h2>
          <p className="cs-muted">{formatIndonesianDate(lastSaved.tanggal)}</p>
          <ul className="cs-tally" aria-label="Ringkasan kehadiran">
            {STATUS_ORDER.map((key) => (
              <li key={key} className={`cs-chip cs-chip--${key}`}>
                {STATUS_LABEL[key]} {lastSaved.tally[key]}
              </li>
            ))}
          </ul>
          <div className="cs-row">
            <Button variant="secondary" onClick={() => setActiveTab('riwayat')}>
              Lihat riwayat
            </Button>
            <Button variant="ghost" onClick={dismissLastSaved}>
              Catat sesi lain
            </Button>
          </div>
        </section>
      ) : null}

      <form onSubmit={handleSaveAttendance} className="cs-page">
        <section className="cs-card">
          <h2 className="cs-card__title">
            <Calendar className="cs-icon" aria-hidden="true" />
            Presensi sesi baru
          </h2>

          <div className="cs-grid-2">
            <Field
              id="tanggal_kegiatan"
              label="Tanggal kegiatan"
              hint={tanggalInput ? formatIndonesianDate(tanggalInput) : undefined}
            >
              {(p) => (
                <input
                  {...p}
                  className="cs-input"
                  type="date"
                  required
                  value={tanggalInput}
                  onChange={(e) => setTanggalInput(e.target.value)}
                />
              )}
            </Field>

            <Field
              id="linked_schedule"
              label="Hubungkan dengan jadwal rutin"
              optional
              hint="Sesi yang terhubung akan dikelompokkan di laporan."
            >
              {(p) => (
                <select
                  {...p}
                  className="cs-select"
                  value={selectedScheduleId ?? ''}
                  onChange={(e) =>
                    setSelectedScheduleId(e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">Tidak terhubung jadwal</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} — setiap {s.hari}, {s.waktu}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          {occurrences.length > 0 ? (
            <Field
              id="jump_occurrence"
              label={`Pindah ke sesi hari ${linkedSchedule?.hari}`}
              hint="Untuk mengisi presensi yang terlewat."
            >
              {(p) => (
                <select
                  {...p}
                  className="cs-select"
                  value={occurrences.some((o) => o.dateStr === tanggalInput) ? tanggalInput : ''}
                  onChange={(e) => e.target.value && setTanggalInput(e.target.value)}
                >
                  {!occurrences.some((o) => o.dateStr === tanggalInput) ? (
                    <option value="">Tanggal lain — {formatIndonesianDate(tanggalInput)}</option>
                  ) : null}
                  {occurrences.map((o) => (
                    <option key={o.dateStr} value={o.dateStr}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          ) : null}
        </section>

        <section className="cs-card">
          <div className="cs-card__head">
            <h2 className="cs-card__title">
              <Users className="cs-icon" aria-hidden="true" />
              Daftar santri
            </h2>
            {hasRoster ? (
              <Button variant="ghost" icon={<Check className="cs-icon" />} onClick={handleMarkAllPresent}>
                Tandai semua hadir
              </Button>
            ) : null}
          </div>

          {hasRoster ? (
            <>
              <p className="cs-muted" aria-live="polite">
                {allRegisteredStudents.length} santri ·{' '}
                {STATUS_ORDER.map((k) => `${STATUS_LABEL[k]} ${sessionTally[k]}`).join(' · ')}
              </p>

              <ul className="cs-roster">
                {allRegisteredStudents.map((name) => (
                  <li key={name} className="cs-roster__row">
                    <span className="cs-roster__name">{name}</span>
                    <StatusPicker
                      personName={name}
                      value={sessionStatusFor(name)}
                      onChange={(status) => setSessionStatus(name, status)}
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            /* A real empty state. This screen used to show six invented
               students here, which a new teacher would save as real data. */
            <div className="cs-empty">
              <Users className="cs-empty__icon" aria-hidden="true" />
              <h3 className="cs-empty__title">Belum ada santri</h3>
              <p className="cs-empty__body">
                Tambahkan nama santri di bawah. Daftar ini tersimpan, jadi Anda cukup
                mengetiknya sekali.
              </p>
            </div>
          )}

          <div className="cs-addrow">
            <Field id="quick_add_name" label="Tambah santri" error={newNameError}>
              {(p) => (
                <input
                  {...p}
                  className="cs-input"
                  type="text"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (newNameError) setNewNameError(undefined);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void submitNewName();
                    }
                  }}
                />
              )}
            </Field>
            <Button icon={<UserPlus className="cs-icon" />} onClick={submitNewName}>
              Tambah
            </Button>
          </div>

          <div>
            <Button
              variant="ghost"
              icon={<Plus className="cs-icon" />}
              aria-expanded={showBulk}
              onClick={() => setShowBulk((v) => !v)}
            >
              Tambah beberapa nama sekaligus
            </Button>
            {showBulk ? (
              <div className="cs-bulk">
                <Field
                  id="daftar_peserta"
                  label="Nama santri"
                  hint="Pisahkan dengan koma. Contoh: Husen, Budi, Ahmad"
                >
                  {(p) => (
                    <textarea
                      {...p}
                      className="cs-textarea"
                      rows={3}
                      value={namesInput}
                      onChange={(e) => setNamesInput(e.target.value)}
                    />
                  )}
                </Field>
                <Button
                  onClick={async () => {
                    const ok = await handleAddStudent(namesInput);
                    if (ok) setNamesInput('');
                  }}
                >
                  Tambahkan ke daftar
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        <div className="cs-save">
          {hasRoster && untouchedCount > 0 ? (
            <p className="cs-muted" aria-live="polite">
              {untouchedCount} santri masih bertanda Hadir dan belum Anda periksa.
            </p>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            icon={<Save className="cs-icon" />}
            disabled={!hasRoster}
          >
            Simpan presensi
          </Button>
        </div>
      </form>

      {/* Overwriting a saved session says what is being replaced, rather than
          the browser's unstyled "are you sure". */}
      <ConfirmDialog
        open={pendingOverwrite !== null}
        title="Perbarui presensi hari ini?"
        body={
          <>
            <p>
              Sudah ada presensi tersimpan untuk{' '}
              {pendingOverwrite ? formatIndonesianDate(pendingOverwrite.tanggal) : ''} berisi{' '}
              {pendingOverwrite?.existingCount ?? 0} santri hadir.
            </p>
            <p>
              Catatan itu akan diganti dengan yang baru ({pendingOverwrite?.peserta.length ?? 0}{' '}
              hadir).
            </p>
          </>
        }
        confirmLabel="Perbarui presensi"
        cancelLabel="Jangan ganti"
        onCancel={cancelOverwrite}
        onConfirm={() => void confirmOverwrite()}
      />
    </motion.div>
  );
};
