import React, {useMemo, useState} from 'react';
import {motion} from 'motion/react';
import {Check, Eraser, Plus, Save, Search, UserPlus, X} from 'lucide-react';
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
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');

  const linkedSchedule = schedules.find((s) => s.id === selectedScheduleId);
  const occurrences = linkedSchedule?.hari ? getWeekdayOccurrences(linkedSchedule.hari) : [];
  const hasRoster = allRegisteredStudents.length > 0;

  /*
   * The whole roster, always.
   *
   * Picking a class used to hide every santri outside it, which meant a
   * teacher who taught five groups could not mark a santri who turned up to
   * the wrong one, and a new name added mid-session vanished from the screen.
   * The class now only fills in the date; the search below is the one thing
   * that narrows the list, and it is the teacher's choice rather than a side
   * effect of something else.
   */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRegisteredStudents;
    return allRegisteredStudents.filter((n) => n.toLowerCase().includes(q));
  }, [allRegisteredStudents, query]);

  /* Counts cover every santri, not just the ones the search left on screen:
     filtering is a way of looking, not a change to what gets saved. */
  const tally = useMemo(() => {
    const counts = {hadir: 0, sakit: 0, izin: 0, alpa: 0};
    let marked = 0;
    for (const name of allRegisteredStudents) {
      const status = sessionStatusFor(name);
      if (status) {
        counts[status] += 1;
        marked += 1;
      }
    }
    return {counts, marked, total: allRegisteredStudents.length};
  }, [allRegisteredStudents, sessionStatusFor]);

  const remaining = tally.total - tally.marked;
  const isFiltered = query.trim().length > 0;

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

        {/* One card for the one question: which session is this? The class,
            the date and the catch-up jump all answer it together. */}
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

          {schedules.length > 0 ? (
            <div className="cs-field">
              <p className="cs-field__label" id="kelas_label">
                Kelas
              </p>
              <p className="cs-field__hint">
                Memilih kelas mengisi tanggalnya dan mengelompokkan sesi ini di laporan.
                Daftar santri tetap lengkap.
              </p>
              <ul className="cs-groups" aria-labelledby="kelas_label">
                <li className="cs-group">
                  <button
                    type="button"
                    className="cs-group__btn"
                    aria-pressed={selectedScheduleId === undefined}
                    onClick={() => setSelectedScheduleId(undefined)}
                  >
                    Tanpa jadwal
                    <span className="cs-group__when">Sesi lepas</span>
                  </button>
                </li>
                {schedules.map((s) => (
                  <li key={s.id} className="cs-group">
                    <button
                      type="button"
                      className="cs-group__btn"
                      aria-pressed={selectedScheduleId === s.id}
                      onClick={() => setSelectedScheduleId(s.id)}
                    >
                      {s.title}
                      <span className="cs-group__when">
                        {s.hari}, {s.waktu}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

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
      </div>

      <form onSubmit={handleSaveAttendance} className="cs-col">
        <section className="cs-card">
          <p className="cs-label">
            Daftar santri
            <span className="cs-label__count">
              {tally.marked}/{tally.total} ditandai
            </span>
          </p>

          {hasRoster ? (
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
                  aria-valuenow={tally.marked}
                  aria-valuemin={0}
                  aria-valuemax={tally.total}
                  aria-label="Santri yang sudah ditandai"
                >
                  {STATUS_ORDER.map((key) => (
                    <div
                      key={key}
                      className={`cs-progress__seg cs-progress__seg--${key}`}
                      style={{
                        width: `${(tally.counts[key] / Math.max(tally.total, 1)) * 100}%`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Worth its space once a roster outgrows one screen. */}
              {allRegisteredStudents.length > 8 ? (
                <div className="cs-search">
                  <Search className="cs-icon cs-search__icon" aria-hidden="true" />
                  <input
                    type="search"
                    className="cs-input cs-search__input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Cari nama santri"
                    placeholder="Cari nama santri"
                  />
                  {isFiltered ? (
                    <button
                      type="button"
                      className="cs-iconbtn cs-search__clear"
                      onClick={() => setQuery('')}
                      aria-label="Hapus pencarian"
                    >
                      <X className="cs-icon" />
                    </button>
                  ) : null}
                </div>
              ) : null}

              {isFiltered ? (
                <p className="cs-muted" aria-live="polite">
                  Menampilkan {visible.length} dari {tally.total} santri. Tanda yang sudah
                  Anda beri tetap tersimpan.
                </p>
              ) : null}

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

              {visible.length > 0 ? (
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
              ) : (
                <div className="cs-empty">
                  <h3 className="cs-empty__title">Tidak ada nama yang cocok</h3>
                  <p className="cs-empty__body">
                    Tidak ada santri bernama “{query.trim()}”. Coba kata lain, atau
                    tambahkan namanya ke daftar.
                  </p>
                  <Button onClick={() => setQuery('')}>Tampilkan semua santri</Button>
                </div>
              )}

              {tally.marked > 0 ? (
                <ul className="cs-tally" aria-live="polite" aria-label="Ringkasan kehadiran">
                  {STATUS_ORDER.filter((k) => tally.counts[k] > 0).map((k) => (
                    <li key={k} className={`cs-chip cs-chip--${k}`}>
                      {STATUS_LABEL[k]} {tally.counts[k]}
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
                  disabled={tally.marked === 0}
                >
                  Kosongkan tanda
                </Button>
              </div>
            </>
          ) : (
            /* A real empty state. This screen used to show six invented
               students here, which a new teacher would save as real data. */
            <div className="cs-empty">
              <h3 className="cs-empty__title">Belum ada santri</h3>
              <p className="cs-empty__body">
                Tambahkan nama santri di bawah. Daftar ini tersimpan, jadi Anda cukup
                mengetiknya sekali.
              </p>
              <Button icon={<UserPlus className="cs-icon" />} onClick={() => setShowAdd(true)}>
                Tambah santri pertama
              </Button>
            </div>
          )}
        </section>

        {/* Folded away by default: a roster is typed once and marked every
            week, so the form sat above the Save button taking room from the
            thing teachers actually come back for. */}
        <section className={`cs-card${showAdd ? '' : ' cs-card--action'}`}>
          <Button
            variant="ghost"
            icon={<Plus className="cs-icon" />}
            aria-expanded={showAdd}
            onClick={() => setShowAdd((v) => !v)}
          >
            {showAdd ? 'Tutup tambah santri' : 'Tambah santri'}
          </Button>

          {showAdd ? (
            <>
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
            </>
          ) : null}
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
            disabled={tally.marked === 0}
          >
            Simpan presensi
          </Button>

          <p className="cs-muted" aria-live="polite">
            {tally.marked === 0
              ? 'Tandai kehadiran santri untuk menyimpan.'
              : remaining > 0
                ? `${tally.marked} ditandai · ${remaining} belum ikut tersimpan`
                : `Semua ${tally.total} santri sudah ditandai`}
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
