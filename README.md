# ClassSync (AbsenBocil)

Presensi kelas yang jalan tanpa internet. Dibuat untuk guru, ustadz/ustadzah, dan
koordinator kursus yang mencatat kehadiran sambil berdiri di depan kelas, lalu
mengirim rekapnya ke grup WhatsApp.

Semua data tersimpan di dalam browser perangkat itu sendiri. Tidak ada server,
tidak ada akun, tidak ada data santri yang dikirim ke mana pun.

- **Vercel:** https://class-sync-lilac.vercel.app
- **GitHub Pages:** https://husenef.github.io/Absensi-Bocil/

---

## Cara kerjanya

### Mencatat presensi

Layar presensi terbuka dengan **tidak ada satu pun santri yang tertandai**. Ini
disengaja: daftar yang otomatis menandai semua orang "Hadir" akan mencatat satu
kelas penuh begitu tombol Simpan ditekan, padahal gurunya belum melihat daftarnya.
Santri yang tidak ditandai disimpan sebagai *tidak ditandai*, bukan ditebak hadir.

Setiap santri punya empat tanda — **H**adir, **S**akit, **I**zin, **A**lpa. Menekan
tanda yang sudah terpilih akan melepasnya lagi, jadi salah tekan bisa dibatalkan.

- **Tandai sisanya hadir** hanya mengisi santri yang belum ditandai. Tanda yang
  sudah Anda beri tidak tersapu oleh tombol ini.
- Tombol Simpan menghitung sisanya: *"12 ditandai · 3 belum ikut tersimpan"*.

### Kelas dan tanggal

Memilih kelas (misalnya "Ngaji Pagi, setiap Senin 07:00") melakukan dua hal:
mengisi tanggalnya dan mengelompokkan sesi itu di laporan. **Daftar santri tetap
lengkap** — guru yang mengampu lima kelompok tetap bisa menandai santri yang
datang ke kelas yang bukan jadwalnya.

Untuk mengisi presensi yang terlewat, pilihan *"Pindah ke sesi hari …"* melompat
ke pekan-pekan sebelumnya pada hari yang sama.

### Mencari santri

Daftar di atas delapan nama mendapat kotak pencarian. Pencarian hanya mengubah
apa yang tampil di layar — tanda yang sudah diberi tetap tersimpan, dan hitungan
di tombol Simpan tetap mencakup seluruh daftar, bukan hanya yang terlihat.

### Laporan WhatsApp

Laporan disusun per periode dua bulan, dipecah per pekan, siap disalin ke grup:

```
Mohon untuk dikirimkan Laporan Kursus periode September - Oktober 2026

26 Oktober-1 November 2026
* Tgl Kursus : 26/10,
* Peserta : Ubin (H), Budi Santoso (S), Aan (I), Dewi Lestari (A)
* Tgl Kursus : 28/10
* Peserta : Aan (H), Ubin (H)
```

Setiap santri yang ditandai disebut lengkap dengan hurufnya — yang hadir dulu,
baru yang berhalangan. Koordinator jadi bisa membedakan santri yang sakit dari
santri yang memang tidak tercatat sama sekali.

### Lainnya

- **Riwayat** — menengok, mengubah, atau menghapus sesi yang sudah tersimpan.
- **Jadwal** — kelas mingguan berulang, lengkap dengan pengingat dan ekspor ke
  kalender HP.
- **Sinkron HP** — memindahkan data antar perangkat lewat QR code atau tautan,
  tanpa server perantara. Data yang masuk digabungkan, bukan menimpa.
- **Cadangan** — ekspor/impor seluruh basis data sebagai satu berkas JSON.
- **Mode gelap** dan **PWA** — bisa dipasang di layar utama dan dibuka offline.

---

## Teknologi

| Bagian | Pilihan |
| --- | --- |
| Framework | React 19 + Vite 6 + TypeScript |
| Styling | Tailwind CSS v4 dengan token sendiri (`src/styles/`) |
| Basis data | IndexedDB lewat [Dexie](https://dexie.org/) |
| Ikon | [Lucide](https://lucide.dev/) |
| Animasi | [Motion](https://motion.dev/) |
| Uji unit | Vitest + Testing Library + fake-indexeddb |
| Uji end-to-end | Playwright |

### Desain

Antarmukanya dibangun dari satu bahasa visual: garis tepi tinta 2px dengan
bayangan padat (tanpa blur, tanpa gradien), supaya tetap terbaca di layar HP
murah di bawah sinar matahari.

Warna dipakai secara hemat dan punya arti tetap:

- **Kuning sinyal** (`#ffd966` siang, emas `#d4af37` malam) hanya untuk satu aksi
  utama dan tab yang sedang aktif. Karena kuning pucat tidak akan pernah mencapai
  kontras 3:1 di atas kertas putih, batas visualnya selalu datang dari garis tepi
  tinta — bukan dari warnanya.
- **Empat warna tanda** (hijau, kuning, biru, oranye) hanya milik Hadir, Sakit,
  Izin, dan Alpa. Tidak ada elemen lain yang memakainya, sehingga sebuah warna di
  layar selalu menjawab satu pertanyaan: santri ini hadir atau tidak. Satu-satunya
  perkecualian yang disengaja: Sakit memakai kuning yang sama dengan tombol utama.
- Semua yang lain — tombol, judul, garis, bahkan aksi hapus — memakai tinta.
- **Mode gelap** memakai arang lembut `#2c2c2c`, bukan hitam pekat, dan garis
  tepinya dibalik menjadi abu terang: garis hitam di atas halaman gelap tidak
  menggambar apa pun. Hadir dan Izin ikut diredupkan supaya satu layar penuh
  tanda tidak menyilaukan di ruangan gelap.

Setiap pasangan warna diuji terhadap WCAG 2.2 AA di `src/styles/palette.test.ts`,
jadi sebuah warna tidak bisa diubah menjadi tidak terbaca tanpa ada tes yang gagal.
Setiap tanda juga membawa huruf, supaya maknanya tidak pernah bergantung pada
warna saja.

---

## Menjalankan secara lokal

Butuh **Node.js 20** atau lebih baru.

```bash
npm install
npm run dev          # http://localhost:3000
```

### Perintah lain

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi ke `dist/` |
| `npm run preview` | Menyajikan hasil build |
| `npm run lint` | Pemeriksaan tipe (`tsc --noEmit`) |
| `npm run test` | Uji unit, mode tonton |
| `npm run test:run` | Uji unit sekali jalan |
| `npm run test:coverage` | Uji unit dengan laporan cakupan |
| `npm run test:e2e` | Uji end-to-end (Playwright) |
| `npm run test:e2e:ui` | Uji end-to-end dengan antarmuka |
| `npm run test:all` | Tipe + unit + end-to-end |

---

## Pengujian

### Uji unit

Vitest dengan jsdom dan `fake-indexeddb`, jadi basis datanya nyata tanpa perlu
browser.

```bash
npm run test:run
```

Yang dijaga: logika daftar santri dan status (`src/roster.test.ts`), migrasi basis
data v3 → v4 (`src/db.test.ts`), kontras dan token desain (`src/styles/`),
komponen antarmuka (`src/ui/ui.test.tsx`), serta layar presensi secara utuh lewat
provider yang sebenarnya (`src/pages/AttendanceInput.test.tsx`).

### Uji end-to-end

Playwright menjalankan hasil **build produksi** lewat `vite preview`, bukan server
pengembangan — service worker di mode pengembangan bisa menyajikan bundel basi,
dan itu justru salah satu hal yang ingin ditangkap oleh tes ini.

Sekali saja, pasang browsernya:

```bash
npx playwright install chromium
```

Lalu:

```bash
npm run test:e2e              # desktop + mobile
npm run test:e2e -- --project=desktop
npm run test:e2e:ui           # mode interaktif
```

Berkasnya ada di `e2e/`:

| Berkas | Cakupan |
| --- | --- |
| `checkin.spec.ts` | Alur presensi utuh, dari layar kosong sampai tersimpan |
| `report.spec.ts` | Bentuk laporan WhatsApp |
| `accessibility.spec.ts` | Cincin fokus, operasi lewat papan ketik, huruf pada tanda, 320px tanpa geser samping, ukuran sasaran sentuh |
| `pages.spec.ts` | Jadwal (tambah, hapus, muncul di presensi), Sinkron, dan sapuan ukuran sasaran sentuh di kelima tab |

Karena aplikasinya tidak punya API, data contoh ditulis langsung ke IndexedDB
lewat `e2e/helpers.ts`.

---

## Penyebaran

Aplikasi ini sepenuhnya statis — hasil `npm run build` di `dist/` bisa disajikan
dari hosting statis mana pun.

### Vercel

Repositori sudah membawa [`vercel.json`](./vercel.json), jadi tidak ada yang perlu
disetel di dasbor.

Proyek ini sudah tayang di https://class-sync-lilac.vercel.app — setiap dorongan
ke `main` otomatis masuk ke produksi, dan setiap pull request mendapat tautan
pratinjaunya sendiri.

**Untuk menyiapkan salinan sendiri:** buka [vercel.com/new](https://vercel.com/new),
impor repositori ini, lalu Deploy. Framework (Vite), perintah build, dan
direktori keluaran terbaca sendiri.

**Lewat CLI:**

```bash
npm i -g vercel
vercel          # pratinjau
vercel --prod   # produksi
```

Tidak ada *environment variable* yang perlu diisi — tidak ada backend dan tidak
ada kunci API.

`vercel.json` mengatur tiga hal: mengarahkan semua rute ke `index.html` supaya
tautan dalam tetap jalan, menyimpan aset ber-hash selamanya di cache, dan
melarang `sw.js` serta `index.html` di-cache supaya pengguna tidak terjebak di
versi lama setelah rilis baru.

### GitHub Pages

Sudah otomatis lewat [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
setiap dorongan ke `main` akan dibangun dan disebar.

Di GitHub Actions, `vite.config.ts` memakai base path `/Absensi-Bocil/`; di luar
itu (Vercel, Netlify, atau berkas lokal) base-nya relatif. Kalau nama repositori
Anda berbeda, sesuaikan nilainya di `vite.config.ts`.

Aktifkan sekali di **Settings → Pages → Source: GitHub Actions**.

### Hosting statis lain

```bash
npm run build
# sajikan isi dist/
```

Satu-satunya syarat: semua rute diarahkan ke `index.html`, dan `sw.js` tidak
di-cache lama.

---

## Catatan data dan privasi

Basis datanya berada di IndexedDB browser, pada perangkat itu saja. Konsekuensinya
jujur saja:

- Membersihkan data situs akan **menghapus** presensi yang tersimpan.
- Mode penyamaran tidak menyimpan apa pun setelah jendelanya ditutup.
- Data tidak ikut berpindah antar browser atau perangkat dengan sendirinya —
  gunakan **Sinkron HP** atau cadangan JSON.

Unduh cadangan sesekali. Itu satu-satunya salinan.

---

## Struktur

```
src/
  pages/        Lima layar: presensi, riwayat, laporan, jadwal, sinkron
  ui/           Komponen bersama (Button, Field, StatusPicker, ConfirmDialog)
  context/      AppContext — seluruh state dan aksi aplikasi
  styles/       Token desain, komponen CSS, palet beserta uji kontrasnya
  roster.ts     Logika daftar santri dan status, murni dan teruji
  db.ts         Skema Dexie dan migrasi
e2e/            Uji end-to-end Playwright
```

---

Dibuat untuk mempermudah administrasi guru-guru hebat di seluruh Indonesia.
