# Alamat lama: `/Absensi-Bocil/`

Isi folder ini **bukan bagian dari aplikasi**. Ini situs kecil yang berdiri di
alamat lama ClassSync dan mengantar pengunjung ke alamat baru.

## Kenapa perlu

Repositori ini dulu bernama `Absensi-Bocil`, jadi GitHub Pages menyajikannya di
`https://husenef.github.io/Absensi-Bocil/`. Setelah repositorinya diganti nama
menjadi `classsync`, alamat itu jadi 404 — dan GitHub tidak mengalihkan alamat
Pages lama ke yang baru.

Masalahnya bukan sekadar tautan mati. ClassSync adalah PWA: ponsel yang sudah
memasangnya punya service worker di `/Absensi-Bocil/` yang menjawab navigasi
dari cache-nya sendiri dulu. Tanpa penanganan khusus, ponsel itu akan terus
menyajikan shell versi lama **selamanya** — percobaan muat ulang di belakang
gagal, kegagalannya ditelan, dan pengajarnya melihat aplikasi yang tidak pernah
berubah lagi tanpa satu pun pesan galat.

## Cara kerjanya

- [`sw.js`](sw.js) — service worker terakhir yang disajikan alamat ini. Browser
  selalu mengambil ulang berkas worker saat navigasi dan membandingkannya
  byte-per-byte, jadi berkas inilah satu-satunya tuas yang masih menjangkau
  pemasangan lama. Ia mengambil alih, memindahkan tab yang terbuka, lalu
  menghapus pendaftaran dirinya sendiri.
- [`index.html`](index.html) — halaman untuk orang yang membuka penanda buku
  lama. Ia melepas worker lama lalu mengalihkan.

Keduanya sengaja **tidak** memanggil `caches.delete()` secara serampangan:
Cache Storage dikunci per *origin*, bukan per path, dan rumah baru aplikasi ada
di origin `husenef.github.io` yang sama dengan nama cache yang sama
(`classsync-shell-v<versi>`). Menghapus semuanya justru akan mencabut shell
offline dari pemasangan yang sedang kita tuju.

Catatan presensi pengguna tidak terpengaruh sama sekali. IndexedDB juga dikunci
per origin, jadi data yang tersimpan di `/Absensi-Bocil/` langsung terbaca di
`/classsync/`.

## Cara menyebarkannya

Isi folder ini tinggal di repositori `classsync` supaya ikut ditinjau bersama
hal yang ditunjuknya, tetapi **disajikan dari repositori terpisah** yang
memegang nama lama:

```bash
# sekali saja, dari akar repositori ini
gh repo create husenEF/Absensi-Bocil --public \
  --description "ClassSync pindah ke github.com/husenEF/classsync"

git init -b main /tmp/absensi-bocil-redirect
cp legacy-redirect/index.html legacy-redirect/sw.js /tmp/absensi-bocil-redirect/
cd /tmp/absensi-bocil-redirect
git add . && git commit -m "Point the old address at ClassSync's new home"
git remote add origin https://github.com/husenEF/Absensi-Bocil.git
git push -u origin main

# lalu nyalakan Pages dari branch main, folder root
gh api -X POST repos/husenEF/Absensi-Bocil/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```

Kalau salah satu berkas di sini diubah, salin ulang keduanya ke repositori itu.
