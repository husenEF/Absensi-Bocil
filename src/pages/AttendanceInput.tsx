import React, {useMemo, useState} from 'react';
import {motion} from 'motion/react';
import {Check, Eraser, Plus, Save, UserPlus} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {formatIndonesianDate} from '../utils/date';
import {STATUS_CODE, STATUS_LABEL, STATUS_ORDER} from '../styles/palette';
import {nameKey} from '../roster';
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

/** Which set of santri is on screen. A number is a schedule's id. */
type GroupFilter = 'semua' | 'lainnya' | number;

export const AttendanceInput: React.FC = () => {
  const {
    tanggalInput,
    setTanggalInput,
    namesInput,
    setNamesInput,
    selectedScheduleId,
    setSelectedScheduleId,
    allRegisteredStudents,
    scheduleGroups,
    sessionStatusFor,
    setSessionStatus,
    handleMarkAllPresent,
    handleClearSession,
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
  const [group, setGroup] = useState<GroupFilter>('semua');

  const linkedSchedule = schedules.find((s) => s.id === selectedScheduleId);
  const occurrences = linkedSchedule?.hari ? getWeekdayOccurrences(linkedSchedule.hari) : [];
  const hasRoster = allRegisteredStudents.length > 0;

  const ungrouped = scheduleGroups.find((g) => g.id === undefined);
  const classGroups = scheduleGroups.filter((g) => g.id !== undefined);

  /** The santri on screen right now. */
  const visible = useMemo(() => {
    if (group === 'semua') return allRegisteredStudents;
    if (group === 'lainnya') return ungrouped?.names ?? [];
    return scheduleGroups.find((g) => g.id === group)?.names ?? [];
  }, [group, allRegisteredStudents, scheduleGroups, ungrouped]);

  /* Counts follow what is on screen, so the number under the Save button and
     the rows the teacher can see always agree. */
  const visibleTally = useMemo(() => {
    const counts = {hadir: 0, sakit: 0, izin: 0, alpa: 0};
    let marked = 0;
    for (const name of visible) {
      const status = sessionStatusFor(name);
      if (status) {
        counts[status] += 1;
        marked += 1;
      }
    }
    return {counts, marked, total: visible.length};
  }, [visible, sessionStatusFor]);

  const remaining = visibleTally.total - visibleTally.marked;

  /**
   * Choosing a class both filters the register and links the session to that
   * schedule, because they are the same decision: this is the class I am
   * marking. Keeping them as two controls meant a teacher could file Tahfidz
   * attendance under the morning class without noticing.
   */
  const chooseGroup = (next: GroupFilter) => {
    setGroup(next);
    setSelectedScheduleId(typeof next === 'number' ? next : undefined);
  };

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

  const groupLabel =
    group === 'semua'
      ? 'Semua santri'
      : group === 'lainnya'
        ? 'Belum masuk kelompok'
        : (classGroups.find((g) => g.id === group)?.title ?? 'Kelompok');

  return (
    <motion.div
      initial={{opacity: 0, y: 8}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0}}
      className="cs-page cs-page--split"
    >
      <div className="cs-col cs-col--aside">
        {/* What was just saved — shown in place, so saving does not move the
            teacher to a screen they did not ask for. */}
        {lastSaved ? (
          <section className="cs-card cs-card--success" aria-live="polite">
            <p className="cs-label">
              Presensi tersimpan
              <Check className="cs-icon" aria-hidden="true" />
            </p>
            <div className="cs-today">
              <span className="cs-today__date">{formatIndonesianDate(lastSaved.tanggal)}</span>
            </div>
            <ul className="cs-tally" aria-label="Ringkasan kehadiran">
              {STATUS_ORDER.filter((key) => lastSaved.tally[key] > 0).map((key) => (
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

        <section className="cs-card">
          <p className="cs-label">Sesi yang dicatat</p>

          <div className="cs-today">
            <span className="cs-today__date">
              {tanggalInput ? formatIndonesianDate(tanggalInput) : 'Pilih tanggal'}
            </span>
            <span className="cs-today__meta">
              {linkedSchedule
                ? `${linkedSchedule.title} · setiap ${linkedSchedule.hari}, ${linkedSchedule.waktu}`
                : 'Tidak terhubung jadwal rutin'}
            </span>
          </div>

          <Field id="tanggal_kegiatan" label="Tanggal kegiatan">
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

        {/* Kelompok. Only worth showing once there is more than one class to
            choose between — a single chip is a label pretending to be a
            control. */}
        {classGroups.length > 0 || (ungrouped?.names.length ?? 0) > 0 ? (
          <section className="cs-card">
            <p className="cs-label">
              Kelompok kelas
              <span className="cs-label__count">{visible.length} santri</span>
            </p>

            <ul className="cs-groups">
              <li className="cs-group">
                <button
                  type="button"
                  className="cs-group__btn"
                  aria-pressed={group === 'semua'}
                  onClick={() => chooseGroup('semua')}
                >
                  Semua santri
                  <span className="cs-group__when">{allRegisteredStudents.length} nama</span>
                </button>
              </li>

              {classGroups.map((g) => (
                <li key={g.id} className="cs-group">
                  <button
                    type="button"
                    className="cs-group__btn"
                    aria-pressed={group === g.id}
                    onClick={() => chooseGroup(g.id as number)}
                  >
                    {g.title}
                    <span className="cs-group__when">
                      {g.hari}, {g.waktu} · {g.names.length} nama
                    </span>
                  </button>
                </li>
              ))}

              {(ungrouped?.names.length ?? 0) > 0 ? (
                <li className="cs-group">
                  <button
                    type="button"
                    className="cs-group__btn"
                    aria-pressed={group === 'lainnya'}
                    onClick={() => chooseGroup('lainnya')}
                  >
                    Belum masuk kelompok
                    <span className="cs-group__when">{ungrouped?.names.length} nama</span>
                  </button>
                </li>
              ) : null}
            </ul>

            <p className="cs-muted">
              Kelompok tersusun dari sesi yang sudah tercatat. Seorang santri masuk ke
              sebuah kelas setelah pertama kali ditandai di sana.
            </p>
          </section>
        ) : null}
      </div>

      <form onSubmit={handleSaveAttendance} className="cs-col">
        <section className="cs-card">
          <p className="cs-label">
            {groupLabel}
            <span className="cs-label__count">
              {visibleTally.marked}/{visibleTally.total} ditandai
            </span>
          </p>

          {hasRoster && visible.length > 0 ? (
            <>
              <div className="cs-progress">
                <div className="cs-progress__head">
                  <span>
                    {remaining === 0
                      ? 'Semua santri sudah ditandai'
                      : `${remaining} santri menunggu ditandai`}
                  </span>
                </div>
                <div
                  className="cs-progress__rail"
                  role="progressbar"
                  aria-valuenow={visibleTally.marked}
                  aria-valuemin={0}
                  aria-valuemax={visibleTally.total}
                  aria-label="Santri yang sudah ditandai"
                >
                  {STATUS_ORDER.map((key) => (
                    <div
                      key={key}
                      className={`cs-progress__seg cs-progress__seg--${key}`}
                      style={{
                        width: `${(visibleTally.counts[key] / Math.max(visibleTally.total, 1)) * 100}%`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <ul className="cs-legend" aria-hidden="true">
                {STATUS_ORDER.map((k) => (
                  <li key={k}>
                    <span className={`cs-legend__mark cs-legend__mark--${k}`}>
                      {STATUS_CODE[k]}
                    </span>
                    {STATUS_LABEL[k]}
                  </li>
                ))}
              </ul>

              <ul className="cs-roster">
                {visible.map((name) => (
                  <li
                    key={name}
                    className={`cs-roster__row${
                      sessionStatusFor(name) ? '' : ' is-unmarked'
                    }`}
                  >
                    <span className="cs-roster__name">{name}</span>
                    <StatusPicker
                      personName={name}
                      groupId={nameKey(name)}
                      value={sessionStatusFor(name)}
                      onChange={(status) => setSessionStatus(name, status)}
                    />
                  </li>
                ))}
              </ul>

              {visibleTally.marked > 0 ? (
                <ul className="cs-tally" aria-live="polite" aria-label="Ringkasan kehadiran">
                  {STATUS_ORDER.filter((k) => visibleTally.counts[k] > 0).map((k) => (
                    <li key={k} className={`cs-chip cs-chip--${k}`}>
                      {STATUS_LABEL[k]} {visibleTally.counts[k]}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="cs-row">
                <Button
                  variant="secondary"
                  icon={<Check className="cs-icon" />}
                  onClick={handleMarkAllPresent}
                  disabled={remaining === 0}
                >
                  Tandai sisanya hadir
                </Button>
                <Button
                  variant="ghost"
                  icon={<Eraser className="cs-icon" />}
                  onClick={handleClearSession}
                  disabled={visibleTally.marked === 0}
                >
                  Kosongkan tanda
                </Button>
              </div>
            </>
          ) : hasRoster ? (
            /* The roster has names, but none of them belong to this class yet. */
            <div className="cs-empty">
              <h3 className="cs-empty__title">Kelompok ini masih kosong</h3>
              <p className="cs-empty__body">
                Pilih Semua santri untuk menandai siapa pun. Santri yang Anda tandai di
                sesi ini akan masuk ke kelompok {groupLabel} berikutnya.
              </p>
              <Button onClick={() => chooseGroup('semua')}>Tampilkan semua santri</Button>
            </div>
          ) : (
            /* A real empty state. This screen used to show six invented
               students here, which a new teacher would save as real data. */
            <div className="cs-empty">
              <h3 className="cs-empty__title">Belum ada santri</h3>
              <p className="cs-empty__body">
                Tambahkan nama santri di bawah. Daftar ini tersimpan, jadi Anda cukup
                mengetiknya sekali.
              </p>
            </div>
          )}
        </section>

        <section className="cs-card">
          <p className="cs-label">Tambah santri</p>

          <div className="cs-addrow">
            <Field id="quick_add_name" label="Nama santri" error={newNameError}>
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

        {/* The bar rides over the register, so it stays the one action and one
            line about it — anything more and it covers the rows being read. */}
        <div className="cs-save">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            icon={<Save className="cs-icon" />}
            disabled={visibleTally.marked === 0}
          >
            Simpan presensi
          </Button>

          <p className="cs-muted" aria-live="polite">
            {visibleTally.marked === 0
              ? 'Tandai kehadiran santri untuk menyimpan.'
              : remaining > 0
                ? `${visibleTally.marked} ditandai · ${remaining} belum ikut tersimpan`
                : `Semua ${visibleTally.total} santri sudah ditandai`}
          </p>
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
