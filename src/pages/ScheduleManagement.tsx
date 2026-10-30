import React, {useState} from 'react';
import {motion} from 'motion/react';
import {Bell, CalendarDays, Check, Clock, Pencil, Plus, Trash2, UserMinus, UserPlus} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {buildICalendar} from '../utils/calendar';
import {Button} from '../ui/Button';
import {Field} from '../ui/Field';
import type {StudentRecord} from '../roster';

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

type Schedule = {
  id?: number;
  title: string;
  hari: string;
  waktu: string;
  remindMinutesBefore: number;
  guru?: string;
};

/**
 * The teacher's name on a saved class, editable in place. Classes saved
 * before the field existed have none, so this is how they get one.
 */
const GuruEditor: React.FC<{
  schedule: Schedule;
  onSave: (id: number, guru: string) => Promise<void>;
}> = ({schedule, onSave}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(schedule.guru ?? '');

  if (!editing) {
    return (
      <div className="cs-row">
        <p className="cs-muted">
          Guru: {schedule.guru ? <strong>{schedule.guru}</strong> : 'belum diisi'}
        </p>
        <Button
          variant="ghost"
          icon={<Pencil className="cs-icon" />}
          aria-label={`Ubah guru ${schedule.title}`}
          onClick={() => {
            setDraft(schedule.guru ?? '');
            setEditing(true);
          }}
        >
          Ubah guru
        </Button>
      </div>
    );
  }

  return (
    <form
      className="cs-addrow"
      onSubmit={async (e) => {
        e.preventDefault();
        if (schedule.id === undefined) return;
        await onSave(schedule.id, draft);
        setEditing(false);
      }}
    >
      <Field id={`sch-guru-${schedule.id}`} label="Nama guru" optional>
        {(p) => (
          <input
            {...p}
            className="cs-input"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
        )}
      </Field>
      <Button type="submit" icon={<Check className="cs-icon" />}>
        Simpan
      </Button>
      <Button variant="ghost" onClick={() => setEditing(false)}>
        Batal
      </Button>
    </form>
  );
};

/**
 * The santri who belong to one class, and the means to change that.
 *
 * A santri is in one class at most, so adding someone already elsewhere moves
 * them, and the picker says so before it happens rather than after.
 */
const ClassMembers: React.FC<{
  schedule: Schedule;
  schedules: Schedule[];
  students: StudentRecord[];
  onAssign: (name: string, scheduleId: number | undefined) => Promise<void>;
}> = ({schedule, schedules, students, onAssign}) => {
  const [pick, setPick] = useState('');
  const members = students.filter((st) => st.scheduleId === schedule.id);
  const candidates = students.filter((st) => st.scheduleId !== schedule.id);
  const titleOf = (id: number | undefined) => schedules.find((x) => x.id === id)?.title;

  return (
    <div className="cs-fold">
      <p className="cs-label">
        Santri
        <span className="cs-label__count">{members.length}</span>
      </p>

      {members.length > 0 ? (
        <ul className="cs-namelist" aria-label={`Santri ${schedule.title}`}>
          {members.map((st) => (
            <li key={st.nameKey} className="cs-namelist__row">
              <span className="cs-namelist__name">{st.name}</span>
              <Button
                variant="ghost"
                icon={<UserMinus className="cs-icon" />}
                aria-label={`Keluarkan ${st.name} dari ${schedule.title}`}
                onClick={() => void onAssign(st.name, undefined)}
              >
                Keluarkan
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cs-muted">
          Belum ada santri. Anggota kelas tampil paling atas saat mencatat presensi
          kelas ini.
        </p>
      )}

      {candidates.length > 0 ? (
        <div className="cs-addrow">
          <Field id={`sch-member-${schedule.id}`} label="Tambah santri">
            {(p) => (
              <select
                {...p}
                className="cs-select"
                value={pick}
                onChange={(e) => setPick(e.target.value)}
              >
                <option value="">Pilih santri</option>
                {candidates.map((st) => {
                  const from = titleOf(st.scheduleId);
                  return (
                    <option key={st.nameKey} value={st.name}>
                      {from ? `${st.name} — pindah dari ${from}` : st.name}
                    </option>
                  );
                })}
              </select>
            )}
          </Field>
          <Button
            icon={<UserPlus className="cs-icon" />}
            disabled={!pick}
            onClick={async () => {
              await onAssign(pick, schedule.id);
              setPick('');
            }}
          >
            Tambah
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export const ScheduleManagement: React.FC = () => {
  /**
   * Hand the schedule to the phone's own calendar.
   *
   * In-app reminders only run while the app is open — a PWA with no push
   * server cannot do better — so this is the way a teacher actually gets
   * reminded when the app is closed.
   */
  const handleExportCalendar = (schedules: Schedule[]) => {
    const ics = buildICalendar(schedules);
    const blob = new Blob([ics], {type: 'text/calendar;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jadwal-classsync.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const {
    schedules,
    scheduleTitle,
    setScheduleTitle,
    scheduleHari,
    setScheduleHari,
    scheduleWaktu,
    setScheduleWaktu,
    scheduleRemindMinutesBefore,
    setScheduleRemindMinutesBefore,
    scheduleGuru,
    setScheduleGuru,
    updateScheduleGuru,
    handleAddSchedule,
    handleDeleteSchedule,
    requestNotificationPermission,
    students,
    assignStudentToSchedule,
  } = useApp();

  const roster = students
    .filter((st) => st.active)
    .sort((a, b) => a.name.localeCompare(b.name, 'id', {sensitivity: 'base'}));
  const unplaced = roster.filter((st) => st.scheduleId === undefined).length;
  const titleOf = (id: number | undefined) => schedules.find((x) => x.id === id)?.title;

  /* Santri ticked in the new-class form, by name. */
  const [newMembers, setNewMembers] = useState<string[]>([]);
  const toggleNewMember = (name: string) =>
    setNewMembers((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );

  return (
    <motion.div
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0}}
      className="cs-page cs-page--split"
    >
      <div className="cs-col cs-col--aside">
        <section className="cs-card">
          <div className="cs-card__head">
            <h2 className="cs-card__title">
              <Clock className="cs-icon" aria-hidden="true" />
              Jadwal kelas
            </h2>
          </div>
          <p className="cs-muted">
            Simpan kelas yang berulang setiap pekan, supaya tanggalnya terisi sendiri
            saat mencatat presensi.
          </p>
          <div className="cs-row">
            <Button
              icon={<Bell className="cs-icon" />}
              onClick={requestNotificationPermission}
            >
              Izinkan notifikasi
            </Button>
          </div>
        </section>

        <section className="cs-card">
          <p className="cs-label">Tambah jadwal</p>

          <form
            onSubmit={async (e) => {
              if (await handleAddSchedule(e, newMembers)) setNewMembers([]);
            }}
            className="cs-stack"
          >
            <Field id="sch-title" label="Nama kelas" hint="Contoh: Iqra sore">
              {(p) => (
                <input
                  {...p}
                  className="cs-input"
                  type="text"
                  required
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                />
              )}
            </Field>

            <Field id="sch-guru" label="Nama guru" hint="Contoh: Ust. Ahmad" optional>
              {(p) => (
                <input
                  {...p}
                  className="cs-input"
                  type="text"
                  value={scheduleGuru}
                  onChange={(e) => setScheduleGuru(e.target.value)}
                />
              )}
            </Field>

            <div className="cs-grid-2">
              <Field id="sch-day" label="Hari">
                {(p) => (
                  <select
                    {...p}
                    className="cs-select"
                    value={scheduleHari}
                    onChange={(e) => setScheduleHari(e.target.value)}
                  >
                    {HARI_LIST.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <Field id="sch-time" label="Jam mulai">
                {(p) => (
                  <input
                    {...p}
                    className="cs-input"
                    type="time"
                    required
                    value={scheduleWaktu}
                    onChange={(e) => setScheduleWaktu(e.target.value)}
                  />
                )}
              </Field>
            </div>

            <Field id="sch-remind" label="Ingatkan saya">
              {(p) => (
                <select
                  {...p}
                  className="cs-select"
                  value={scheduleRemindMinutesBefore}
                  onChange={(e) => setScheduleRemindMinutesBefore(Number(e.target.value))}
                >
                  <option value={0}>Saat kelas dimulai</option>
                  <option value={5}>5 menit sebelumnya</option>
                  <option value={10}>10 menit sebelumnya</option>
                  <option value={15}>15 menit sebelumnya</option>
                  <option value={30}>30 menit sebelumnya</option>
                  <option value={60}>1 jam sebelumnya</option>
                </select>
              )}
            </Field>

            {roster.length > 0 ? (
              <fieldset className="cs-stack">
                <legend className="cs-field__label">
                  Santri di kelas ini ({newMembers.length})
                </legend>
                <ul className="cs-namelist" aria-label="Pilih santri untuk kelas baru">
                  {roster.map((st) => {
                    const from = titleOf(st.scheduleId);
                    return (
                      <li key={st.nameKey} className="cs-namelist__row">
                        <label className="cs-check">
                          <input
                            type="checkbox"
                            checked={newMembers.includes(st.name)}
                            onChange={() => toggleNewMember(st.name)}
                          />
                          <span>
                            {st.name}
                            {from ? ` — pindah dari ${from}` : ''}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            ) : null}

            <Button type="submit" variant="primary" block icon={<Plus className="cs-icon" />}>
              Simpan jadwal
            </Button>
          </form>
        </section>

        <section className="cs-card cs-card--inset">
          <h3 className="cs-subtitle">Tentang pengingat</h3>
          <p className="cs-muted">
            Pengingat hanya berbunyi selama aplikasi ini terbuka. Agar tetap diingatkan
            saat aplikasi tertutup, simpan jadwalnya ke kalender HP Anda dengan tombol di
            daftar jadwal.
          </p>
        </section>
      </div>

      <div className="cs-col">
        <section className="cs-card">
          <div className="cs-card__head">
            <h2 className="cs-card__title">
              <CalendarDays className="cs-icon" aria-hidden="true" />
              Jadwal tersimpan ({schedules.length})
            </h2>
            {schedules.length > 0 ? (
              <Button
                icon={<CalendarDays className="cs-icon" />}
                onClick={() => handleExportCalendar(schedules)}
              >
                Simpan ke kalender HP
              </Button>
            ) : null}
          </div>

          {schedules.length === 0 ? (
            <div className="cs-empty">
              <CalendarDays className="cs-empty__icon" aria-hidden="true" />
              <h3 className="cs-empty__title">Belum ada jadwal</h3>
              <p className="cs-empty__body">
                Anda tetap bisa mencatat presensi tanpa jadwal. Jadwal hanya mengisi
                tanggalnya untuk Anda.
              </p>
            </div>
          ) : (
            <>
            {unplaced > 0 ? (
              <p className="cs-muted">
                {unplaced} santri belum punya kelas. Mereka tetap bisa ditandai di
                kelas mana pun.
              </p>
            ) : null}
            <ul className="cs-stack" aria-label="Jadwal tersimpan">
              {schedules.map((s) => (
                <li key={s.id} className="cs-card cs-card--inset">
                  <div className="cs-card__head">
                    <h3 className="cs-subtitle">{s.title}</h3>
                    <Button
                      variant="ghost"
                      icon={<Trash2 className="cs-icon" />}
                      onClick={() => s.id && handleDeleteSchedule(s.id, s.title)}
                    >
                      Hapus
                    </Button>
                  </div>
                  <p className="cs-muted">
                    Setiap {s.hari}, pukul {s.waktu} ·{' '}
                    {s.remindMinutesBefore === 0
                      ? 'diingatkan saat mulai'
                      : `diingatkan ${s.remindMinutesBefore} menit sebelumnya`}
                  </p>
                  <GuruEditor key={s.guru ?? ''} schedule={s} onSave={updateScheduleGuru} />
                  <ClassMembers
                    schedule={s}
                    schedules={schedules}
                    students={roster}
                    onAssign={assignStudentToSchedule}
                  />
                </li>
              ))}
            </ul>
            </>
          )}
        </section>
      </div>
    </motion.div>
  );
};
