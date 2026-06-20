# AbsenBocil 😊

**AbsenBocil** adalah aplikasi pencatatan presensi peserta didik modern berbasis web dengan arsitektur **Offline-First**. Dirancang khusus untuk mempermudah guru, fasilitator, atau koordinator dalam mengelola kehadiran siswa, menjadwalkan kelas, menyusun rekap, dan memproses laporan mingguan secara otomatis tanpa ketergantungan koneksi internet.

> 🌐 **GitHub Pages:** [https://husenEF.github.io/absen-bocil](https://husenEF.github.io/absen-bocil) *(Sesuaikan nama repositori GitHub Anda jika berbeda)*

---

## 💡 Deskripsi Repositori GitHub (Copy-Paste ini ke GitHub About/Description Anda)
`Aplikasi pencatatan absensi peserta didik otomatis dengan database lokal IndexedDB offline-first, dilengkapi penjadwal kelas dan saringan laporan rekap mingguan modular per 2 bulan.`

---

## ✨ Fitur Unggulan

1. **Penyimpanan Lokal Terproteksi (IndexedDB via Dexie):**
   - Menggunakan teknologi database modern langsung di dalam browser Anda. Data tidak dikirim ke server luar, menjamin keamanan data pribadi siswa 100%.

2. **Smart Weekly Report Generator:**
   - Menyusun teks rangkuman kehadiran mingguan otomatis yang berformat indah.
   - Mengintegrasikan karakter bintang (`*`) ganda yang kompatibel dengan format teks tebal (bold) di **WhatsApp**, memudahkan koordinator membagikannya langsung ke grup pengurus/wali murid.

3. **Paginasi Pintar per 2 Bulan (Bi-Monthly Pagination):**
   - Ketika data absen sudah sangat banyak, laporan secara otomatis dipecah per periode 2 bulan sekali (seperti Januari-Februari, Maret-April, Mei-Juni).
   - Menghindari visual yang bertumpuk dan membingungkan untuk kenyamanan navigasi yang responsif.

4. **Koreksi Otomatis Huruf Kapital & Badge Interaktif:**
   - Memformat string nama yang dimasukkan secara dinamis agar rapi (misalnya: `husen, budi` menjadi `Husen, Budi`).
   - Menyediakan badge list siswa terdaftar pintar yang dapat diklik langsung untuk menambah/menghapus kehadiran peserta secara kilat dari textarea secara interaktif.

5. **Aman dengan Cadangan Data (JSON Backup & Restore):**
   - Fitur ekspor basis data lokal menjadi satu file `.json` utuh.
   - Pulihkan basis data kapan saja di komputer atau browser lain dengan fitur import cadangan data instan tanpa kehilangan histori.

6. **Agenda & Pengingat Jadwal (Alarm Reminder Widget):**
   - Buat agenda pelajaran/pertemuan mingguan, letakkan link Google Meet, dan atur alarm pengingat.
   - Status visual dinamis: mendeteksi waktu kelas *"Sedang Berlangsung"* atau *"Telah Lewat"*.

---

## 🛠️ Spesifikasi Teknis

Aplikasi ini dibangun menggunakan tumpukan teknologi modern berkecepatan tinggi:
- **Framework:** [React 19](https://react.dev/) + [Vite](https://vite.dev/) (cepat, responsif, & super ringan)
- **Bahasa:** TypeScript (Type-safe & andal)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) dengan dukungan **Mode Gelap (Dark Mode)** adaptif yang nyaman di mata.
- **Database:** IndexedDB (melalui pustaka [Dexie.js](https://dexie.org/))
- **Ikonografi:** [Lucide React](https://lucide.dev/)
- **Animasi Mikro:** [Motion](https://motion.dev/) dari Framer

---

## 🚀 Panduan Development Lokal

### 1. Prasyarat
Pastikan Anda sudah menginstal **Node.js** di komputer Anda.

### 2. Instalasi Dependensi
Jalankan perintah berikut di terminal repositori Anda:
```bash
npm install
```

### 3. Menjalankan Server Pengembangan
Untuk melihat aplikasi berjalan lokal di browser:
```bash
npm run dev
```
Aplikasi akan dapat diakses secara instan di `http://localhost:3000`.

### 4. Produksi & Build Aplikasi
Untuk mengompilasi dan mengoptimalkan aset produksi:
```bash
npm run build
```
Hasil kompilasi file statis siap sebar akan berada di dalam direktori `dist/`.

---

## 📦 Penerapan di GitHub Pages (GitHub Pages Deployment)

Aplikasi **AbsenBocil** sepenuhnya dirancang sebagai Client-Side SPA (Single Page Application). Hal ini membuatnya sangat cocok, ringan, dan gratis untuk di-host di **GitHub Pages**.

### Cara mengunggah ke GitHub Pages Anda secara manual:
1. Jalankan perintah kompilasi produksi:
   ```bash
   npm run build
   ```
2. Pastikan file `dist/index.html` dan isi direktori `dist/` didaftarkan ke konfigurasi sebar halaman statis repositori Anda.
3. Pada halaman repositori GitHub Anda, buka tab **Settings** -> **Pages**.
4. Di bagian **Build and deployment**, pilih Source: **Deploy from a branch** atau jalankan workflow integrasi otomatis GitHub Actions Anda.

---

*Dibuat dengan cinta untuk mempermudah administrasi guru-guru hebat di seluruh Indonesia! 😊*
