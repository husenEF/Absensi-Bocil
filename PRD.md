# 📄 Product Requirement Document (PRD) - ClassSync

**ClassSync** adalah aplikasi pencatatan presensi peserta didik modern berbasis web yang berfokus pada arsitektur **Offline-First**, kedaulatan data lokal, keamanan tinggi, dan otomatisasi pembuatan laporan mingguan.

---

## 🧭 1. Latar Belakang & Tujuan
Tugas administratif mencatat kehadiran secara konsisten di kursus atau lembaga pendidikan non-formal sering kali menyita waktu pengajar jika dilakukan secara manual. Banyak aplikasi yang memerlukan server eksternal, internet yang selalu aktif, atau pengiriman data sensitif siswa ke server asing. 

**ClassSync** memecahkan masalah ini dengan menyediakan aplikasi pencatatan kehadiran yang:
1. **100% Client-Side & Offline-First**: Dapat berfungsi penuh tanpa koneksi internet dengan database internal browser.
2. **Sangat Aman**: Data disimpan lokal di komputer atau perangkat genggam pengguna sendiri, mematuhi standar privasi data pribadi.
3. **Generator Laporan Instan**: Otomatis menyusun laporan mingguan siap kirim yang kompatibel ganda (Markdown & WhatsApp Bold Formatting).

---

## 🛠️ 2. Arsitektur & Teknologi Utama
Aplikasi ini diimplementasikan menggunakan:
- **Framework & Bundler**: React 18+ / React 19 + Vite + TypeScript (Type-Safe, Cepat, Efisien).
- **Styling & Interaktivitas**: Tailwind CSS v4 dengan sistem Mode Gelap/Terang adaptif, Lucide React, dan Motion (Framer).
- **Penyimpanan (Local Storage Engine)**: Dexie.js (IndexedDB wrapper) untuk penanganan kueri asinkron lokal yang tangguh dan andal.

---

## 📊 3. Skema Basis Data (Database Schema)
IndexedDB dikonfigurasikan di dalam `src/db.ts` dengan struktur entitas sebagai berikut:

```typescript
// Registrasi Database Dexie
class AbsensiDatabase extends Dexie {
  absensi!: Dexie.Table<AbsensiRecord, number>;
  schedules!: Dexie.Table<ScheduleRecord, number>;
  
  constructor() {
    super('AbsensiBocilDB');
    this.version(1).stores({
      absensi: '++id, tanggal, scheduleId, createdAt',
      schedules: '++id, title, hari, waktu, createdAt'
    });
  }
}
```

### A. Tabel `absensi` (Pencatatan Presensi)
Menyimpan riwayat absensi per hari.
- `id` (Number, Auto-Increment): Kunci utama unik.
- `tanggal` (String): Format tanggal ISO `YYYY-MM-DD`.
- `peserta` (Array of Strings): Daftar nama peserta didik yang hadir di pertemuan tersebut.
- `scheduleId` (Number, Optional): Referensi ke index kunci utama dari tabel `schedules`. Menunjukkan keterhubungan antara presensi ini dengan jadwal pelajaran tertentu.
- `createdAt` (Number): Epoch timestamp milidetik waktu perekaman data.

### B. Tabel `schedules` (Sesi Jadwal Kerja / Kursus)
Menyimpan daftar jadwal berulang di setiap pekannya.
- `id` (Number, Auto-Increment): Kunci utama unik.
- `title` (String): Nama sesi kelas atau judul agenda.
- `hari` (String): Hari berlangsungnya kelas (e.g., `Senin`, `Selasa`, dsb).
- `waktu` (String): Jam mulai kelas format 24 jam (e.g., `19:00`).
- `remindMinutesBefore` (Number): Detik atau menit alarm berbunyi sebelum kelas dimulai (bila diaktifkan).
- `createdAt` (Number): Epoch timestamp waktu pembuatan jadwal.

---

## 🚀 4. Fitur & Spek Fungsionalitas
### 4.1. Input Absensi & Integrasi Hubungan Jadwal (Linked Schedule)
- **Seleksi Tanggal**: Memilih tanggal pelaksanaan kursus/kelas secara manual, yang otomatis tervalidasi.
- **Hubungkan Ke Sesi Jadwal (Linked Schedule)** *(Opsional)*: 
  - Pengguna dapat memilih satu jadwal aktif dari daftar dropdown jadwal yang didaftarkan.
  - Memilih jadwal otomatis memperbarui kolom Tanggal Kegiatan berdasarkan tanggal perhitungan hari di pekan berjalan.
  - **Saran Nama Presensi Sebelumnya**: Jika dipilih sesi jadwal yang terhubung, sistem berjalan di latar belakang melacak data kehadiran terakhir untuk sesi tersebut. Jika ada, tombol salin nama muncul agar pengajar dapat menyalin daftar peserta pekan lalu secara kilat dengan 1-klik tanpa perlu mengetik ulang untuk siswa yang konsisten hadir.
- **Auto-Formatting Huruf**: Nama yang dipisahkan koma secara otomatis diformat kapital awal katanya secara rapi setelah disimpan.
- **Smart Student Badges Selector**: Menampilkan daftar nama kumulatif yang pernah diinput secara otomatis. Badge ini interaktif: klik badge nama untuk melompat memasukkannya ke dalam teks kehadiran, atau klik silang untuk menghapusnya demi menghilangkan pengetikan manual.

### 4.2. Pengingat Agenda & Widget Jadwal (Schedule Widget)
- Pengguna dapat menambahkan entri jadwal mingguan berkala, tautan ruang belajar (Google Meet, Zoom), dan durasi pengingat.
- Status interaktif terjadwal diperbarui secara real-time: status menunjukkan `"Akan Datang"`, `"Sedang Berlangsung"`, atau `"Telah Lewat"`.
- Pintasan cepat: Tombol `"Input Absensi Sesi Ini"` ditempatkan langsung di item kartu jadwal, memindahkan pengguna langsung ke tab input presensi lengkap dengan tanggal dan sesi terhubung yang sudah terisi otomatis.

### 4.3. Saringan & Generator Laporan Mingguan Terpilah (Isolated Report Generator)
- **Komponen Periode**: Menghitung paginasi otomatis per 2-bulan (misal: Mei-Juni 2026), membagi rentang waktu bulan berjalan menjadi 4 pekan matriks laporan.
- **Filter Sesi Jadwal / Pengingat**:
  - Menyediakan filter dropdown khusus berisi opsi: "Semua Sesi", "Hanya Sesi Tanpa Hubungan Jadwal", atau daftar jadwal mengajar spesifik.
  - Memilih filter ini otomatis membagi dan menyaring daftar periksa di *"Pilih Presensi yang Disertakan"* agar tidak saling tumpang tindih dengan data jadwal kursus yang lain.
  - Mencegah kekeliruan pencampuran data siswa antar-kelas ketika menyusun laporan mingguan.
- **Format Output WhatsApp**: Menghasilkan teks laporan siap salin yang mengikuti format resmi koordinator. Penanda bintang (`*`) ganda diaplikasikan secara rapi.

### 4.4. Manajemen Data (Backup / Restore & Reset)
- Ekspor seluruh isi IndexedDB menjadi file JSON cadangan lokal yang terenkripsi aman secara struktural.
- Impor file JSON cadangan untuk memulihkan seluruh riwayat absen dan jadwal pembelajaran secara presisi di komputer atau perangkat browser mana saja.
- Fitur pembersihan permanen database melalui konfirmasi berganda untuk melindungi dari hilangnya data secara tidak sengaja.

---

## 🔒 5. Ketentuan Desain & Batasan Lingkungan
- **Aesthetic Light & Dark Mode**: Skema visual slate elegan berkilau dipadu rona aksen teal yang memikat, aman di mata untuk penggunaan di malam hari oleh para pendidik.
- **Desktop & Mobile Priority**: Desain sepenuhnya reponsif yang secara adaptif bersandar pada tatanan mobile-first guna mengoptimalkan operasional pengisian absensi langsung di lapangan via telepon seluler pintar pengajar.
- **Sandbox Safe**: Memanfaatkan database IndexedDB internal browser sehingga tidak membutuhkan setup server backend mandiri ataupun penyimpanan awan berbayar, menjamin aplikasi tetap gratis 100% selamanya.

---

*PRD ini diperbarui secara dinamis untuk mendokumentasikan evolusi fungsionalitas ClassSync.*
