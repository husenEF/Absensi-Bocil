import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, ChevronDown, ChevronUp, Eraser, Plus, Save, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatIndonesianDate } from "../utils/date";
import { STATUS_CODE, STATUS_LABEL, STATUS_ORDER } from "../styles/palette";
import { nameKey, parseNameList, splitByClass } from "../roster";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { StatusPicker } from "../ui/StatusPicker";
import { ConfirmDialog } from "../ui/ConfirmDialog";

const INDO_DAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const formatYMD = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/** Past and upcoming occurrences of a schedule's weekday, for catching up. */
const getWeekdayOccurrences = (
  hariName: string,
  countPast = 8,
  countFuture = 1,
) => {
  const dayIndex = INDO_DAYS.indexOf(hariName);
  if (dayIndex === -1) return [];

  const now = new Date();
  const thisWeek = new Date();
  thisWeek.setDate(now.getDate() + (dayIndex - now.getDay()));

  const list: Array<{ dateStr: string; label: string }> = [];

  for (let i = countFuture; i >= 1; i--) {
    const d = new Date(thisWeek);
    d.setDate(thisWeek.getDate() + i * 7);
    list.push({
      dateStr: formatYMD(d),
      label: `Pekan depan — ${formatIndonesianDate(formatYMD(d))}`,
    });
  }

  const tw = formatYMD(thisWeek);
  list.push({ dateStr: tw, label: `Pekan ini — ${formatIndonesianDate(tw)}` });

  for (let i = 1; i <= countPast; i++) {
    const d = new Date(thisWeek);
    d.setDate(thisWeek.getDate() - i * 7);
    const dateStr = formatYMD(d);
    const rel = i === 1 ? "Pekan lalu" : `${i} pekan lalu`;
    list.push({ dateStr, label: `${rel} — ${formatIndonesianDate(dateStr)}` });
  }

  return list;
};

export const AttendanceInput: React.FC = () => {
  const {
    tanggalInput,
    setTanggalInput,
    waktuInput,
    setWaktuInput,
    namesInput,
    setNamesInput,
    selectedScheduleId,
    setSelectedScheduleId,
    allRegisteredStudents,
    students,
    sessionStatusFor,
    setSessionStatus,
    sessionKeteranganFor,
    setSessionKeterangan,
    sessionGuruStatus,
    setSessionGuruStatus,
    sessionGuruKeterangan,
    setSessionGuruKeterangan,
    handleMarkAllPresent,
    handleClearSession,
    handleAddStudent,
    handleRemoveStudent,
    assignStudentToSchedule,
    handleSaveAttendance,
    lastSaved,
    dismissLastSaved,
    pendingOverwrite,
    confirmOverwrite,
    cancelOverwrite,
    schedules,
    setActiveTab,
  } = useApp();

  const [newName, setNewName] = useState("");
  const [newNameError, setNewNameError] = useState<string | undefined>();
  const [showBulk, setShowBulk] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [query, setQuery] = useState("");
  const [showOthers, setShowOthers] = useState(false);
  /* New santri join the picked class unless the teacher unticks it. */
  const [joinClass, setJoinClass] = useState(true);
  /** Names added on this screen, so a new santri never lands out of sight. */
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());

  const linkedSchedule = schedules.find((s) => s.id === selectedScheduleId);

  /*
   * Picking a class moves the date to that class's latest day — today when
   * it is that weekday, otherwise last week's — but only while the date is
   * still today's default. A date the teacher chose on purpose (a class moved
   * to another day) is theirs, and is left alone.
   */
  const pickClass = (id: number | undefined) => {
    setSelectedScheduleId(id);
    const hari = schedules.find((s) => s.id === id)?.hari;
    const today = formatYMD(new Date());
    if (!hari || tanggalInput !== today) return;
    const latest = getWeekdayOccurrences(hari).find((o) => o.dateStr <= today);
    if (latest) setTanggalInput(latest.dateStr);
  };
  const occurrences = linkedSchedule?.hari
    ? getWeekdayOccurrences(linkedSchedule.hari)
    : [];
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
    const counts = { hadir: 0, sakit: 0, izin: 0, alpa: 0, etc: 0 };
    let marked = 0;
    for (const name of allRegisteredStudents) {
      const status = sessionStatusFor(name);
      if (status) {
        counts[status] += 1;
        marked += 1;
      }
    }
    return { counts, marked, total: allRegisteredStudents.length };
  }, [allRegisteredStudents, sessionStatusFor]);

  const remaining = tally.total - tally.marked;
  const isFiltered = query.trim().length > 0;

  /*
   * With a class picked, its members come first and everyone else is folded
   * below — folded, never removed, for the reasons above. Without a class
   * there is nothing to put first and the register is one list.
   */
  const roster = useMemo(
    () => splitByClass(allRegisteredStudents, students, selectedScheduleId),
    [allRegisteredStudents, students, selectedScheduleId],
  );
  const shown = useMemo(
    () => splitByClass(visible, students, selectedScheduleId),
    [visible, students, selectedScheduleId],
  );
  const grouped = linkedSchedule !== undefined;
  /* "Tandai sisanya hadir" only reaches the class, so it counts the class. */
  const membersRemaining = roster.members.filter((n) => !sessionStatusFor(n)).length;

  /*
   * The fold opens by itself whenever keeping it shut would hide something
   * the teacher needs: a visitor they have already marked, a name they just
   * added, a search that only matches out there, or a class with nobody in
   * it yet — an empty register reads as a broken page.
   */
  const othersNeeded =
    grouped &&
    (roster.members.length === 0 ||
      roster.others.some((n) => sessionStatusFor(n) || justAdded.has(nameKey(n))) ||
      (isFiltered && shown.members.length === 0 && shown.others.length > 0));

  useEffect(() => {
    setShowOthers(false);
  }, [selectedScheduleId]);

  useEffect(() => {
    if (othersNeeded) setShowOthers(true);
  }, [othersNeeded, selectedScheduleId]);

  const addNames = async (input: string): Promise<boolean> => {
    const ok = await handleAddStudent(
      input,
      grouped && joinClass ? selectedScheduleId : undefined,
    );
    if (ok) {
      setJustAdded((prev) => {
        const next = new Set(prev);
        for (const name of parseNameList(input)) next.add(nameKey(name));
        return next;
      });
    }
    return ok;
  };

  const renderRow = (name: string) => (
    <li
      key={name}
      className={`cs-roster__row${sessionStatusFor(name) ? "" : " is-unmarked"}`}
    >
      <span className="cs-roster__name">{name}</span>
      <StatusPicker
        personName={name}
        groupId={nameKey(name)}
        value={sessionStatusFor(name)}
        onChange={(status) => setSessionStatus(name, status)}
      />
      {sessionStatusFor(name) === "etc" ? (
        <input
          className="cs-input cs-roster__note"
          type="text"
          value={sessionKeteranganFor(name)}
          onChange={(e) => setSessionKeterangan(name, e.target.value)}
          aria-label={`Keterangan ${name}`}
          placeholder="Alasan, contoh: terlambat jemputan"
        />
      ) : null}
    </li>
  );

  const submitNewName = async () => {
    if (!newName.trim()) {
      setNewNameError("Masukkan nama santri.");
      return;
    }
    const ok = await addNames(newName);
    if (ok) {
      setNewName("");
      setNewNameError(undefined);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
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
              <span className="cs-today__date">
                {formatIndonesianDate(lastSaved.tanggal)}
              </span>
            </div>
            <ul className="cs-tally" aria-label="Ringkasan kehadiran">
              {STATUS_ORDER.filter((key) => lastSaved.tally[key] > 0).map(
                (key) => (
                  <li key={key} className={`cs-chip cs-chip--${key}`}>
                    {STATUS_LABEL[key]} {lastSaved.tally[key]}
                  </li>
                ),
              )}
            </ul>
            <div className="cs-row">
              <Button
                variant="secondary"
                onClick={() => setActiveTab("riwayat")}
              >
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
              {tanggalInput
                ? formatIndonesianDate(tanggalInput)
                : "Pilih tanggal"}
            </span>
            <span className="cs-today__meta">
              {linkedSchedule
                ? `${linkedSchedule.title} · setiap ${linkedSchedule.hari}, ${linkedSchedule.waktu}`
                : "Tidak terhubung jadwal rutin"}
              {waktuInput && waktuInput !== linkedSchedule?.waktu
                ? ` · sesi ini pukul ${waktuInput}`
                : ""}
            </span>
          </div>

          {schedules.length > 0 ? (
            <div className="cs-field">
              <p className="cs-field__label" id="kelas_label">
                Kelas
              </p>
              <p className="cs-field__hint">
                Memilih kelas mengisi tanggalnya dan mengelompokkan sesi ini di
                laporan. Anggota kelas tampil paling atas; santri lain tetap
                ada di bawahnya.
              </p>
              <ul className="cs-groups" aria-labelledby="kelas_label">
                <li className="cs-group">
                  <button
                    type="button"
                    className="cs-group__btn"
                    aria-pressed={selectedScheduleId === undefined}
                    onClick={() => pickClass(undefined)}
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
                      onClick={() => pickClass(s.id)}
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

          {/* Both stay editable with a class picked: a class moved to
              another day or hour is still that class's session. */}
          <div className="cs-grid-2">
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
            <Field id="waktu_kegiatan" label="Jam">
              {(p) => (
                <input
                  {...p}
                  className="cs-input"
                  type="time"
                  value={waktuInput}
                  onChange={(e) => setWaktuInput(e.target.value)}
                />
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
                  value={
                    occurrences.some((o) => o.dateStr === tanggalInput)
                      ? tanggalInput
                      : ""
                  }
                  onChange={(e) =>
                    e.target.value && setTanggalInput(e.target.value)
                  }
                >
                  {!occurrences.some((o) => o.dateStr === tanggalInput) ? (
                    <option value="">
                      Tanggal lain — {formatIndonesianDate(tanggalInput)}
                    </option>
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

        {/* The teacher is marked against the class they teach, so the card
            only appears once a class is picked. */}
        {linkedSchedule ? (
          <section className="cs-card" aria-labelledby="guru_label">
            <p className="cs-label" id="guru_label">
              Kehadiran guru
            </p>
            <div className="cs-guru">
              <span className="cs-roster__name">
                {linkedSchedule.guru || "Guru"}
              </span>
              <StatusPicker
                personName={`guru ${linkedSchedule.guru || linkedSchedule.title}`}
                groupId={`guru-${linkedSchedule.id}`}
                value={sessionGuruStatus}
                onChange={setSessionGuruStatus}
              />
              {sessionGuruStatus === "etc" ? (
                <input
                  className="cs-input"
                  type="text"
                  value={sessionGuruKeterangan}
                  onChange={(e) => setSessionGuruKeterangan(e.target.value)}
                  aria-label="Keterangan guru"
                  placeholder="Alasan, contoh: rapat"
                />
              ) : null}
            </div>
            {linkedSchedule.guru ? null : (
              <div className="cs-row">
                <p className="cs-muted">Nama guru kelas ini belum diisi.</p>
                <Button variant="ghost" onClick={() => setActiveTab("jadwal")}>
                  Isi di Jadwal
                </Button>
              </div>
            )}
          </section>
        ) : null}
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
                      ? "Semua santri sudah ditandai"
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
                  <Search
                    className="cs-icon cs-search__icon"
                    aria-hidden="true"
                  />
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
                      onClick={() => setQuery("")}
                      aria-label="Hapus pencarian"
                    >
                      <X className="cs-icon" />
                    </button>
                  ) : null}
                </div>
              ) : null}

              {isFiltered ? (
                <p className="cs-muted" aria-live="polite">
                  Menampilkan {visible.length} dari {tally.total} santri. Tanda
                  yang sudah Anda beri tetap tersimpan.
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

              {visible.length > 0 && !grouped ? (
                <ul className="cs-roster">{visible.map(renderRow)}</ul>
              ) : visible.length > 0 ? (
                <>
                  {roster.members.length === 0 ? (
                    <div className="cs-row">
                      <p className="cs-muted">
                        Belum ada santri di {linkedSchedule.title}.
                      </p>
                      <Button
                        variant="ghost"
                        onClick={() => setActiveTab("jadwal")}
                      >
                        Atur di Jadwal
                      </Button>
                    </div>
                  ) : shown.members.length > 0 ? (
                    <ul
                      className="cs-roster"
                      aria-label={`Santri ${linkedSchedule.title}`}
                    >
                      {shown.members.map(renderRow)}
                    </ul>
                  ) : null}

                  {shown.others.length > 0 ? (
                    <div>
                      <Button
                        variant="ghost"
                        icon={
                          showOthers ? (
                            <ChevronUp className="cs-icon" />
                          ) : (
                            <ChevronDown className="cs-icon" />
                          )
                        }
                        aria-expanded={showOthers}
                        onClick={() => setShowOthers((v) => !v)}
                      >
                        Santri lain ({shown.others.length})
                      </Button>
                      {showOthers ? (
                        <div className="cs-fold">
                          <ul className="cs-roster" aria-label="Santri lain">
                            {shown.others.map(renderRow)}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="cs-empty">
                  <h3 className="cs-empty__title">Tidak ada nama yang cocok</h3>
                  <p className="cs-empty__body">
                    Tidak ada santri bernama “{query.trim()}”. Coba kata lain,
                    atau tambahkan namanya ke daftar.
                  </p>
                  <Button onClick={() => setQuery("")}>
                    Tampilkan semua santri
                  </Button>
                </div>
              )}

              {tally.marked > 0 ? (
                <ul
                  className="cs-tally"
                  aria-live="polite"
                  aria-label="Ringkasan kehadiran"
                >
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
                  disabled={(grouped ? membersRemaining : remaining) === 0}
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
                Tambahkan nama santri di bawah. Daftar ini tersimpan, jadi Anda
                cukup mengetiknya sekali.
              </p>
              <Button
                icon={<UserPlus className="cs-icon" />}
                onClick={() => setShowAdd(true)}
              >
                Tambah santri pertama
              </Button>
            </div>
          )}
        </section>

        {/* Folded away by default: a roster is typed once and marked every
            week, so the form sat above the Save button taking room from the
            thing teachers actually come back for. */}
        <section
          className={`my-3 md:my-0 cs-card${
            showAdd || showManage ? "" : " cs-card--action"
          }`}
        >
          <Button
            variant="ghost"
            icon={<Plus className="cs-icon" />}
            aria-expanded={showAdd}
            onClick={() => setShowAdd((v) => !v)}
          >
            {showAdd ? "Tutup tambah santri" : "Tambah santri"}
          </Button>

          {showAdd ? (
            <>
              <div className="cs-addrow">
                <Field
                  id="quick_add_name"
                  label="Nama santri"
                  error={newNameError}
                >
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
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void submitNewName();
                        }
                      }}
                    />
                  )}
                </Field>
                <Button
                  icon={<UserPlus className="cs-icon" />}
                  onClick={submitNewName}
                >
                  Tambah
                </Button>
              </div>

              {grouped ? (
                <label className="cs-check">
                  <input
                    type="checkbox"
                    checked={joinClass}
                    onChange={(e) => setJoinClass(e.target.checked)}
                  />
                  Masukkan ke {linkedSchedule.title}
                </label>
              ) : null}

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
                        const ok = await addNames(namesInput);
                        if (ok) setNamesInput("");
                      }}
                    >
                      Tambahkan ke daftar
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {/* Placing santri in a class and taking names off the list. Folded
              away like the add form, and below it, because a roster is typed
              once and changed far less often than it is added to. */}
          {hasRoster ? (
            <div>
              <Button
                variant="ghost"
                icon={<Users className="cs-icon" />}
                aria-expanded={showManage}
                onClick={() => setShowManage((v) => !v)}
              >
                {showManage ? "Tutup kelola santri" : "Kelola kelas & daftar santri"}
              </Button>

              {showManage ? (
                <div className="cs-fold">
                  <p className="cs-muted">
                    Santri yang pernah dicatat tetap tersimpan di riwayat dan di
                    laporan. Menghapusnya di sini hanya berarti namanya tidak
                    ditawarkan lagi saat mencatat presensi baru.
                  </p>
                  <ul className="cs-namelist" aria-label="Daftar santri tersimpan">
                    {allRegisteredStudents.map((name) => (
                      <li key={name} className="cs-namelist__row">
                        <span className="cs-namelist__name">{name}</span>
                        {schedules.length > 0 ? (
                          <select
                            className="cs-select cs-namelist__class"
                            aria-label={`Kelas ${name}`}
                            value={
                              students.find((st) => st.nameKey === nameKey(name))
                                ?.scheduleId ?? ""
                            }
                            onChange={(e) =>
                              void assignStudentToSchedule(
                                name,
                                e.target.value ? Number(e.target.value) : undefined,
                              )
                            }
                          >
                            <option value="">Tanpa kelas</option>
                            {schedules.map((sc) => (
                              <option key={sc.id} value={sc.id}>
                                {sc.title}
                              </option>
                            ))}
                          </select>
                        ) : null}
                        <Button
                          variant="ghost"
                          icon={<Trash2 className="cs-icon" />}
                          aria-label={`Hapus ${name} dari daftar santri`}
                          onClick={() => void handleRemoveStudent(name)}
                        >
                          Hapus
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
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
              ? "Tandai kehadiran santri untuk menyimpan."
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
              Sudah ada presensi tersimpan untuk{" "}
              {pendingOverwrite
                ? formatIndonesianDate(pendingOverwrite.tanggal)
                : ""}{" "}
              berisi {pendingOverwrite?.existingCount ?? 0} santri hadir.
            </p>
            <p>
              Catatan itu akan diganti dengan yang baru (
              {pendingOverwrite?.peserta.length ?? 0} hadir).
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
