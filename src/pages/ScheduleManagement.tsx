import React from 'react';
import {motion} from 'motion/react';
import {Bell, CalendarDays, Clock, Plus, Trash2} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {buildICalendar} from '../utils/calendar';
import {Button} from '../ui/Button';
import {Field} from '../ui/Field';

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

type Schedule = {
  id?: number;
  title: string;
  hari: string;
  waktu: string;
  remindMinutesBefore: number;
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
    handleAddSchedule,
    handleDeleteSchedule,
    requestNotificationPermission,
  } = useApp();

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

          <form onSubmit={handleAddSchedule} className="cs-stack">
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
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </motion.div>
  );
};
