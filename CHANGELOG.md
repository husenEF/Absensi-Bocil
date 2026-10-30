# Changelog

What changed in ClassSync, newest first.

The version shown in the app's footer matches a heading below. It is also the
service worker's cache name, so a teacher reading "Versi 2.3.0" off their phone
is telling you exactly which shell is cached on it.

Versions follow [semantic versioning](https://semver.org): the **major** number
moves when saved data or an export changes shape in a way an older build cannot
read, the **minor** number when something new appears, the **patch** number when
something that was already there is fixed.

Releases are cut with `npm run release -- patch|minor|major`, which promotes the
`## Unreleased` heading below. Write what you changed under it as you go — the
release will refuse to run on an empty one.

## Unreleased

## 2.5.0 — 2026-10-30

### Added

- **A fifth mark, Lainnya (E), with a reason.** For anything Sakit, Izin and
  Alpa do not cover. Marking a santri Lainnya opens a text field under their
  row for the reason; only santri still on Lainnya when the session is saved
  keep theirs. Riwayat lists them as *Nama — alasan*.
- **Classes have a teacher.** *Nama guru* on the Jadwal form, and *Ubah guru*
  on every saved class so classes made before this can get one.
- **The teacher is marked too.** Picking a class on Presensi shows
  *Kehadiran guru* with the same five marks, and a reason for Lainnya. It is
  saved with the session but never counted among the santri. Riwayat shows it
  above the tally.
- **A second WhatsApp layout, *Format rapi*.** Under *Bentuk laporan* on
  Laporan: a heading, the class and its teacher, each session as one line per
  mark with its count, the teacher's mark next to the date, and a weekly
  total. The choice is remembered. *Format klasik* stays the default and is
  unchanged, except that a Lainnya mark carries its reason: `Aan (E: alasan)`.
- **The theme follows the phone.** The masthead button now goes *ikuti
  perangkat* → the opposite theme → the phone's own theme held fixed → back,
  and while following the phone it switches live when the phone does. A theme
  chosen in an earlier version is kept.

### Changed

- A report longer than WhatsApp's 4096 characters is flagged as soon as it is
  put together, not only when sending.
- The Excel sheet's *Nama Guru* starts from the class's teacher when the class
  has no draft yet.
- Sync between phones brings a class's teacher across when this phone has
  none, and a session's teacher mark and Lainnya reasons with it.

## 2.4.0 — 2026-10-26

### Added

- **Santri can be placed in a class.** One class per santri; placing them
  elsewhere moves them, and every picker says "pindah dari …" first.
  - **When the class is created:** the Jadwal form lists the santri to tick.
  - **Afterwards, on Jadwal:** each class card lists its santri, with a picker
    to add more and a button to take one out.
  - **On Presensi:** *Kelola kelas & daftar santri* gives each santri a class
    picker, and a santri added while a class is picked joins it (a ticked
    *Masukkan ke …* box).
- **Picking a class on Presensi lists its members first** and folds everyone
  else under *Santri lain* — folded, never hidden, so a santri who turns up to
  the wrong class can still be marked. The fold opens by itself when it holds a
  mark, a name just added, the only search match, or when the class has no
  members yet. *Tandai sisanya hadir* fills the class only.
- **Picking a class moves the date to that class's day** — today when it is
  that weekday, otherwise last week's — as long as the date is still today's
  default. The hint already said it did; it never had. A date the teacher
  picked on purpose is left alone.
- **A session has a time.** Presensi has a *Jam* field next to the date,
  filled with the class's own time and editable, so a class moved to another
  day or hour is still recorded as that class. Riwayat shows the time when it
  differs from the class's usual one.
- **Exporting every class groups the WhatsApp report by class.** One header,
  then a `*Kelas*` section per class with the usual weekly blocks inside, and
  *Tanpa kelas* last for sessions filed under none. A session moved to another
  day stays in its class's section. Exporting one class, or a period with only
  one, reads exactly as before.
  Inside each section empty weeks still read "Tgl Kursus : -", so every
  class's section has exactly the coordinator's format.
- **The Excel sheet follows the class too.** *Kelompok kelas* now applies in
  Excel mode: the sheet fills from that class's sessions, gives every member a
  row even before their first session, and keeps a draft per class. The
  all-classes draft stays under the period's existing key, so drafts saved
  before this release still open.
- Existing santri whose every session was filed under one class are placed in
  it on upgrade; anyone seen in two classes is left for the teacher. The class
  travels with Sinkron and is matched to the class of the same name, day and
  time on the other phone, without overwriting a class already set there.

### Changed

- **The app is served from `husenef.github.io/classsync/`.** The repository is
  named after the thing it contains rather than a nickname, and the Pages base
  path is now derived from `GITHUB_REPOSITORY` at build time instead of being
  written down in `vite.config.ts` — a hardcoded path survives exactly until
  the next rename, and then serves a blank page with a 200 and nothing in the
  build log to explain it.

### Fixed

- **A renamed repository would have frozen every installed phone on the old
  build.** The worker at the old address answers navigations from its own cache
  first, so once `/Absensi-Bocil/` began returning 404 the background
  revalidate would fail, the failure would be swallowed, and the app would
  simply never update again — no error to report. The old address now serves a
  worker whose only job is to take over, move any open tab to the new address
  and unregister itself, alongside a page that does the same for an old
  bookmark. See `legacy-redirect/`.

## 2.3.0 — 2026-10-26

### Added

- **Santri can be taken off the roster.** A folded list on the Presensi page
  with a delete button per row, applied immediately with an undo, matching how
  deleting a session already works. A santri named in a saved session is
  *retired* rather than deleted: the roster is rebuilt from the records on
  every load, so a hard delete would resurrect them on the next refresh and the
  session would lose the name it was written with. One nobody ever recorded is
  deleted outright. Typing the name again brings either of them back.
- **The version is shown in the footer**, and is now the single source of truth
  for the service worker's cache name — so shipping a release and retiring the
  previous cached shell are the same action.

### Changed

- **Riwayat tiles on a wide screen.** The saved sessions filled a 34rem column
  down the middle of a laptop; a month of them was several screens of scrolling
  with the rest of the window empty. They now fill the shell as a grid, one
  column on a phone and as many as fit above 1024px.
- **Dark mode is built off one ramp** — the ClassSync soft-dark scale, with the
  four attendance marks as its muted accents. A `#555` rule beside a `#202020`
  tray beside a `#3e3e3e` card never belonged to the same family.

### Fixed

- **Panels in a column had no gap below 1024px.** `.cs-col` was only made a
  flex container inside the wide-screen media query, so on a phone it was a
  plain block and the cards inside it sat flush against each other, separated
  by nothing but the 4px offset shadow of the card above.
- **`.cs-page` never honoured its own `max-width`.** It is a flex item of
  `.cs-main`, and `margin-inline: auto` on a flex item beats the default
  stretch, so every page shrink-wrapped to its content — which is why the wide
  and split layouts were still being drawn at two thirds of the shell.
- **Izin was unreadable at night.** `#4a82c4` carries its letter at 4.17:1 in
  dark ink and 3.62:1 in light, so no ink made it legible; it is lifted to the
  nearest blue of the same hue that clears the 4.5:1 minimum.
- **A santri added back after being removed stayed missing.** `upsertStudent`
  found the retired row and silently did nothing.

## 2.2.0 — earlier

Everything up to the PWA identity work: the ClassSync rebrand and palette, the
visual register with per-santri Hadir/Sakit/Izin/Alpa marks, the check-in home
page, the weekly WhatsApp report, the Excel report schema, QR and link sync
between phones, the installable PWA with its icons and offline shell, and the
migration that adopts databases left by earlier builds.

These predate this changelog and were not individually versioned; `2.2` is the
number the sync payload has been carrying, and the history is in the git log.
