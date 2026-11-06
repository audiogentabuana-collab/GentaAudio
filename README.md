# Genta Buana — Website Company Profile + CMS

Website company profile untuk usaha sewa sound system **Genta Buana**, dilengkapi panel admin sederhana. Pemilik usaha bisa memperbarui paket, harga, galeri, testimoni, FAQ, dan kontak sendiri tanpa menyentuh kode.

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, ikon `lucide-react`
- **Backend/API**: Google Apps Script (Web App `doPost`)
- **Database**: Google Spreadsheet (1 sheet = 1 tabel)
- **File gambar**: Google Drive (1 folder upload)
- **Hosting**: Vercel

```
Browser ──► Next.js di Vercel (Server Components / Server Actions / Route Handlers)
                 │  POST { apiKey, action, payload }   ← hanya dari server, API key tidak pernah ke browser
                 ▼
          Apps Script Web App ── LockService (tulis) · CacheService (baca)
                 ├──► Google Spreadsheet
                 └──► Google Drive (folder upload)
```

Halaman publik **dicache** oleh Next.js, jadi tetap cepat walaupun Apps Script lambat (1–4 detik). Setiap kali admin menyimpan perubahan, cache langsung diperbarui.

---

## Daftar isi

1. [Struktur folder](#1-struktur-folder)
2. [Coba di komputer sendiri (tanpa akun Google)](#2-coba-di-komputer-sendiri-mode-mock)
3. [Setup Google: Spreadsheet, Drive, Apps Script](#3-setup-google-spreadsheet-drive-apps-script)
4. [Deploy Web App & update tanpa ganti URL](#4-deploy-web-app-apps-script)
5. [Isi `.env` lalu jalankan dengan data asli](#5-isi-env-dan-jalankan-dengan-data-asli)
6. [Deploy ke Vercel](#6-deploy-ke-vercel)
7. [Panduan singkat untuk pemilik usaha](#7-panduan-singkat-untuk-pemilik-usaha)
8. [Daftar action API](#8-daftar-action-api)
9. [Skema Spreadsheet](#9-skema-spreadsheet)
10. [Batasan Apps Script & solusinya](#10-batasan-apps-script--solusinya)
11. [Keamanan](#11-keamanan)
12. [Testing](#12-testing)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Struktur folder

```
gentabuana/
├── apps-script/                 # Kode Google Apps Script (dikelola dengan clasp)
│   ├── .clasp.json.example      # salin → .clasp.json lalu isi scriptId (file asli di-gitignore)
│   └── src/
│       ├── appsscript.json      # manifest: zona waktu, setelan web app, izin akses
│       ├── Main.js              # doPost/doGet + router action
│       ├── Config.js            # skema tabel & batasan
│       ├── Db.js                # baca/tulis sheet (berdasarkan nama header)
│       ├── Cache.js             # CacheService + versioning + chunking
│       ├── Lock.js              # LockService untuk semua operasi tulis
│       ├── Validate.js          # validasi dasar sisi Apps Script
│       ├── DriveStore.js        # simpan/hapus gambar di Drive
│       ├── RateLimit.js         # pembatas percobaan login & booking
│       ├── Setup.js             # setup(), initApiKey(), checkConfig(), clearCache()
│       └── handlers/            # Crud, Settings, Bookings, Auth, Public
├── src/
│   ├── app/
│   │   ├── (public)/            # Beranda, pricelist, detail paket, galeri, tentang, FAQ, kontak
│   │   ├── admin/               # login + panel admin
│   │   ├── api/admin/upload/    # upload gambar (Route Handler)
│   │   ├── sitemap.ts · robots.ts
│   ├── features/
│   │   ├── content/             # tipe data & schema Zod (dipakai bersama)
│   │   ├── public/              # komponen & server action halaman publik
│   │   └── admin/               # komponen, konfigurasi resource & server action admin
│   ├── server/                  # khusus server: klien Apps Script, mock, sesi, password, data cache
│   ├── shared/                  # komponen & util bersama
│   └── proxy.ts                 # proteksi /admin (Next.js 16: pengganti middleware.ts)
├── scripts/hash-password.mjs    # buat hash password admin
├── tests/unit/                  # Vitest (logika Apps Script + util)
├── tests/e2e/                   # Playwright (alur publik & admin)
├── .env.example
└── AGENT_MEMORY.md              # catatan teknis untuk developer/AI agent berikutnya
```

---

## 2. Coba di komputer sendiri (mode mock)

Mode mock menjalankan **kode Apps Script asli** di Node.js dengan Spreadsheet/Drive tiruan. Dengan begitu website dan panel admin bisa dicoba tanpa akun Google.

Prasyarat: Node.js 20.9 atau lebih baru.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Di `.env.local`, isi `SESSION_SECRET` dengan hasil perintah berikut, lalu ubah `GAS_MOCK=true`:

```bash
npm run gen-secret
```

```bash
npm run dev
```

- Website: http://localhost:3000
- Admin: http://localhost:3000/admin (login `admin` / `admin12345`, bisa diubah lewat `MOCK_ADMIN_USERNAME`/`MOCK_ADMIN_PASSWORD`)
- Data mock tersimpan di folder `.mock-gas/`. Hapus folder itu untuk kembali ke data contoh.

---

## 3. Setup Google: Spreadsheet, Drive, Apps Script

Lakukan dengan akun Google milik usaha. Akun inilah yang menjadi "pemilik" data dan file.

### 3.1 Buat Spreadsheet

1. Buka https://sheets.new dan beri nama, misalnya **Genta Buana — Database**.
2. Salin **ID Spreadsheet** dari URL:
   `https://docs.google.com/spreadsheets/d/`**`1AbCdEf...xyz`**`/edit`
3. Sheet dan header **tidak perlu dibuat manual**. Semuanya dibuat otomatis oleh `setup()`.

### 3.2 Buat folder Drive untuk upload

1. Buka https://drive.google.com, lalu klik **Baru → Folder** dan beri nama **Genta Buana — Upload**.
2. Buka foldernya, lalu salin **ID folder** dari URL:
   `https://drive.google.com/drive/folders/`**`1XyZ...abc`**
3. Folder tidak perlu dibagikan. Setiap file yang di-upload otomatis diatur "Anyone with the link: Viewer" oleh script.

### 3.3 Buat proyek Apps Script

Pilih **salah satu** cara berikut.

**Cara A — pakai clasp (disarankan untuk developer)**

1. Aktifkan Apps Script API di https://script.google.com/home/usersettings (set ke **On**).
2. Buka https://script.google.com, lalu buat **Proyek baru** dengan nama **Genta Buana API**.
3. Buka **Project Settings** (ikon roda gigi) dan salin **Script ID**.
4. Di repo ini, salin file contoh konfigurasi clasp lalu isi `scriptId`:

```bash
cp apps-script/.clasp.json.example apps-script/.clasp.json
```

5. Login dan kirim kode:

```bash
npm run gas:login
```

```bash
npm run gas:push
```

   `push` akan menimpa file di editor online, termasuk manifest `appsscript.json`.

**Cara B — copy-paste manual (tanpa terminal)**

1. Buat proyek baru di https://script.google.com.
2. Buka **Project Settings**, lalu centang **Show "appsscript.json" manifest file in editor**.
3. Untuk setiap file di `apps-script/src/` (termasuk isi folder `handlers/`), buat file dengan nama yang sama di editor lalu salin isinya. Ganti juga isi `appsscript.json`.

### 3.4 Isi Script Properties

Buka **Project Settings → Script Properties → Add script property**:

| Property | Isi | Wajib |
|---|---|---|
| `SPREADSHEET_ID` | ID dari langkah 3.1 | Ya |
| `DRIVE_FOLDER_ID` | ID dari langkah 3.2 | Ya |
| `API_KEY` | String acak minimal 32 karakter. Paling mudah: jalankan fungsi `initApiKey` dari editor (lihat 3.5), atau isi dengan hasil `npm run gen-secret` | Ya |
| `ADMIN_INITIAL_USERNAME` | Username admin pertama, mis. `owner` | Ya (untuk admin pertama) |
| `ADMIN_INITIAL_PASSWORD_HASH` | Hasil `npm run hash-password` (seluruh baris `scrypt$...`) | Ya (untuk admin pertama) |
| `NOTIFY_EMAIL` | Email yang menerima notifikasi booking baru | Opsional |

> Password admin **tidak pernah** disimpan dalam bentuk teks biasa. Yang disimpan hanya hash scrypt-nya. Setelah login pertama, password bisa diganti dari menu **Pengaturan** di admin. Property `ADMIN_INITIAL_PASSWORD_HASH` boleh dihapus setelah `setup()` berhasil.

### 3.5 Jalankan `setup()`

1. Di editor Apps Script, pilih fungsi **`setup`** di dropdown atas, lalu klik **Run**.
2. Pertama kali akan muncul permintaan izin: **Review permissions**, pilih akun, lalu **Advanced → Go to Genta Buana API (unsafe) → Allow**. Peringatan "unsafe" muncul karena script ini milik Anda sendiri dan tidak melewati verifikasi Google. Ini wajar.
3. Lihat **Execution log**. Seharusnya tertulis `SETUP SELESAI`, daftar sheet yang dibuat, dan hasil `Cek konfigurasi`.

`setup()` aman dijalankan berkali-kali: data yang sudah ada tidak ditimpa, kolom yang kurang ditambahkan, dan seed hanya diisi bila sheet kosong. Fungsi ini juga memasang trigger agar cache otomatis dibersihkan saat Anda mengedit Spreadsheet secara manual.

Fungsi lain yang bisa dijalankan dari editor:

- `initApiKey`: membuat `API_KEY` acak lalu menampilkannya di log.
- `checkConfig`: mengecek semua Script Properties serta akses ke Spreadsheet dan Drive.
- `clearCache`: membersihkan cache Apps Script.

---

## 4. Deploy Web App (Apps Script)

### 4.1 Deploy pertama kali

1. Di editor, klik **Deploy → New deployment**.
2. Klik ikon roda gigi di **Select type**, lalu pilih **Web app**.
3. Isi:
   - Description: `v1`
   - **Execute as: Me** (akun pemilik)
   - **Who has access: Anyone**
4. Klik **Deploy**, lalu salin **Web app URL** (berakhiran `/exec`). URL ini menjadi `GAS_WEB_APP_URL`.

> "Anyone" diperlukan karena yang memanggil adalah server Vercel, bukan pengguna yang login Google. Endpoint tetap terlindungi oleh `API_KEY`, dan tanpa key yang benar semua request ditolak.

Tes cepat (ganti URL dan KEY):

```bash
curl -L -X POST "https://script.google.com/macros/s/XXXX/exec" -H "Content-Type: text/plain" -d '{"apiKey":"KEY_ANDA","action":"system.ping","payload":{}}'
```

Hasil yang benar: `{"success":true,"data":{"version":"1.0.0",...},"message":"OK"}`

### 4.2 Update kode TANPA mengganti URL

Kalau Anda membuat **New deployment** lagi, URL-nya akan berubah. Supaya URL tetap sama:

**Lewat editor:** **Deploy → Manage deployments**, pilih deployment yang aktif, klik ikon **pensil (Edit)**, lalu pada **Version** pilih **New version** dan klik **Deploy**. URL tidak berubah.

**Lewat clasp:**

```bash
npm run gas:push
```

```bash
npm run gas:deployments
```

Salin ID deployment yang dipakai website (bukan yang `@HEAD`), lalu:

```bash
npm run gas:redeploy -- AKfycbx_ID_DEPLOYMENT_ANDA
```

> Perubahan kode yang hanya di-*save* atau di-*push* **belum** aktif di URL `/exec` sampai deployment diperbarui seperti langkah di atas.

---

## 5. Isi `.env` dan jalankan dengan data asli

```bash
cp .env.example .env.local
```

| Variabel | Isi |
|---|---|
| `GAS_WEB_APP_URL` | URL `/exec` dari langkah 4.1 |
| `GAS_API_KEY` | **Sama persis** dengan Script Property `API_KEY` |
| `SESSION_SECRET` | Hasil `npm run gen-secret` (berbeda dari API key) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` (lokal) / domain asli (produksi) |
| `REVALIDATE_SECONDS` | Opsional, default `3600` |
| `GAS_TIMEOUT_MS` | Opsional, default `15000` |
| `NEXT_IMAGE_UNOPTIMIZED` | Opsional, `true` bila kuota Image Optimization Vercel habis |
| `GAS_MOCK` | `false` |

```bash
npm run dev
```

Buka http://localhost:3000/admin dan login dengan `ADMIN_INITIAL_USERNAME` serta password yang Anda hash di langkah 3.4.

---

## 6. Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di https://vercel.com/new, **Import** repository tersebut. Framework otomatis terdeteksi sebagai Next.js, jadi tidak ada setting build yang perlu diubah.
3. Di **Environment Variables**, isi semua variabel dari tabel di bagian 5. `NEXT_PUBLIC_SITE_URL` diisi dengan domain produksi, mis. `https://gentabuana.com`. **Jangan** isi `GAS_MOCK` (atau isi `false`).
4. Klik **Deploy**.
5. (Opsional) **Settings → Domains** untuk memasang domain sendiri. Setelah itu perbarui `NEXT_PUBLIC_SITE_URL` lalu **Redeploy**.
6. Daftarkan `https://domain-anda/sitemap.xml` di Google Search Console.

Catatan:

- Folder `apps-script/` dan `tests/` tidak ikut di-deploy ke Vercel (lihat `.vercelignore`).
- Mengubah env var di Vercel butuh **Redeploy** agar berlaku.
- **Paket Vercel:** syarat penggunaan paket Hobby (gratis) ditujukan untuk penggunaan **non-komersial**. Website usaha termasuk komersial, jadi pertimbangkan paket **Pro**. Kalau tetap ingin gratis, Next.js ini juga bisa di-host di platform lain yang mendukung Next.js. Paket Hobby juga membatasi kuota Image Optimization. Bila kuota habis, set `NEXT_IMAGE_UNOPTIMIZED=true`.

---

## 7. Panduan singkat untuk pemilik usaha

Buka `https://domain-anda/admin` lalu login.

| Menu | Kegunaan |
|---|---|
| **Dashboard** | Ringkasan: booking baru, jumlah paket, dan aksi cepat. Tombol **Muat ulang data website** dipakai setelah Anda mengedit Google Sheet secara langsung. |
| **Inbox Booking** | Daftar permintaan dari form booking. Tekan **Chat pelanggan** untuk membuka WhatsApp dengan pesan siap kirim, lalu ubah status menjadi *Dihubungi / Deal / Batal*. |
| **Paket & Pricelist** | Tambah atau ubah paket, harga, spesifikasi, dan foto. Centang **Unggulan** agar paket tampil di beranda. |
| **Kategori Paket** | Kelompok paket untuk filter di Pricelist. |
| **Peralatan** | Alat yang disewakan satuan. |
| **Galeri / Portofolio** | Album foto acara (beberapa foto per album). |
| **Testimoni / FAQ** | Ulasan pelanggan & tanya-jawab. |
| **Pengaturan** | Nama usaha, tagline, nomor WhatsApp, alamat, peta, media sosial, logo, foto utama, dan ganti password. |

Tips:

- **Tombol panah** mengatur urutan tampil. **Saklar Tampil** menyembunyikan item tanpa menghapusnya.
- Foto dari HP otomatis dikecilkan sebelum di-upload, jadi tidak perlu diedit dulu. Foto pertama menjadi foto utama.
- Menghapus paket/album juga memindahkan fotonya ke Trash Google Drive (bisa dipulihkan selama 30 hari).
- Tagline beranda: separuh awal otomatis berwarna oranye. Untuk mengatur sendiri, pisahkan dengan `|`, mis. `Sewa Sound System | untuk Setiap Acara`.
- Mengedit langsung di Google Sheet boleh. Kalau tampilan website belum berubah, klik **Muat ulang data website** di Dashboard.

---

## 8. Daftar action API

Format request: `POST { apiKey, action, payload }`. Format response: `{ success, data, message, code? }`.
`code` berisi salah satu dari `BAD_REQUEST`, `VALIDATION`, `UNAUTHORIZED`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `BUSY`, `CONFIG`, `INTERNAL`.

| Action | Payload | Keterangan |
|---|---|---|
| `system.ping` | – | Cek koneksi |
| `system.clearCache` | – | Bersihkan cache Apps Script |
| `public.snapshot` | – | Semua konten aktif untuk halaman publik (1 panggilan) |
| `dashboard.stats` | – | Ringkasan dashboard |
| `settings.get` / `settings.update` | `{ values: {key: value} }` | Profil usaha (hanya key yang diizinkan) |
| `<tabel>.list` | `{ includeInactive? }` | `<tabel>` = `categories`, `packages`, `equipment`, `gallery`, `testimonials`, `faqs` |
| `<tabel>.get` | `{ id }` atau `{ slug }` | |
| `<tabel>.create` | `{ data }` | id, timestamp, sort_order, slug unik dibuat otomatis |
| `<tabel>.update` | `{ id, data }` | Parsial. Foto yang dilepas dipindah ke Trash |
| `<tabel>.delete` | `{ id }` | Foto terkait dipindah ke Trash |
| `<tabel>.reorder` | `{ ids: [...] }` | Urutan baru |
| `<tabel>.toggle` | `{ id, is_active }` | Tampil/sembunyi |
| `bookings.create` | `{ name, phone, event_date, location, package_id?, message?, ip }` | Dari form publik, dengan rate limit 5/jam/IP |
| `bookings.list` | `{ status? }` | Terbaru dulu, termasuk `package_name` |
| `bookings.updateStatus` | `{ id, status, admin_note? }` | `baru` / `dihubungi` / `deal` / `batal` |
| `bookings.delete` | `{ id }` | |
| `upload.image` | `{ fileName, mimeType, base64 }` | JPG/PNG/WEBP ≤ 2MB, menghasilkan `{ fileId, url }` |
| `upload.delete` | `{ fileId }` | Hanya file di folder upload |
| `auth.getCredential` | `{ username, ip }` | Mengambil hash untuk diverifikasi di Next.js (dengan rate limit) |
| `auth.loginFailed` / `auth.loginSucceeded` | `{ username, ip }` / `{ id, username }` | |
| `admins.get` / `admins.changePassword` | `{ id }` / `{ id, password_hash }` | |

`setup()` sengaja **tidak** tersedia lewat API.

---

## 9. Skema Spreadsheet

Semua tabel memakai kolom standar **`id` (UUID), `sort_order`, `is_active`, `created_at`, `updated_at`**. Kolom dibaca berdasarkan **nama header**, jadi urutan kolom boleh digeser. Seluruh sel diformat **Plain Text** supaya nomor HP dan tanggal tidak berubah otomatis.

| Sheet | Kolom khusus |
|---|---|
| `settings` | `key`, `value`, `updated_at` (key-value) |
| `categories` | `name`, `slug`, `description` |
| `packages` | `category_id`, `name`, `slug`, `description`, `price`, `price_unit` (`per_acara`/`per_hari`), `specs` (JSON `[{"label","value"}]`), `capacity`, `image_ids` (JSON array), `is_featured` |
| `equipment` | `name`, `description`, `price`, `unit`, `image_id` |
| `gallery` | `title`, `event_type`, `event_date` (YYYY-MM-DD), `location`, `description`, `image_ids` |
| `testimonials` | `name`, `event`, `message`, `rating` (1–5) |
| `faqs` | `question`, `answer` |
| `bookings` | `name`, `phone` (format 62…), `event_date`, `location`, `package_id`, `message`, `status`, `admin_note` |
| `admins` | `username`, `password_hash`, `role`, `last_login_at` |

Kalau mengedit manual: isi boolean dengan `TRUE`/`FALSE`, dan isi `image_ids`/`specs` dengan JSON yang valid.

---

## 10. Batasan Apps Script & solusinya

| Batasan | Dampak | Solusi di proyek ini |
|---|---|---|
| Respon lambat (cold start 1–4 detik) | Halaman lambat bila setiap kunjungan memanggil Apps Script | Halaman publik dicache Next.js (ISR + tag `public-content`). Apps Script hanya dipanggil saat cache diperbarui. Ditambah CacheService di Apps Script. |
| Batas ±30 eksekusi bersamaan per akun | Error saat trafik tinggi | Pengunjung publik hampir tidak pernah langsung memanggil Apps Script (karena cache). |
| Batas waktu 6 menit per eksekusi | Proses panjang gagal | Semua operasi kecil (per baris / per file). |
| Web App tidak bisa membaca header & tidak bisa mengatur status HTTP | Auth via header tidak bisa | API key dikirim di body. Status sukses/gagal dibaca dari field `success` + `code`. |
| Respon berupa redirect 302 ke `script.googleusercontent.com` | Klien harus mengikuti redirect | `fetch(..., { redirect: 'follow' })`. |
| Ukuran body: Vercel Functions ±4,5MB, Server Action default 1MB | Upload foto besar gagal | Foto dikompres di browser (≤1MB, lebar ≤1600px), dikirim **satu foto per request** lewat Route Handler. |
| CacheService: maks 100KB per value, TTL maks 6 jam | Data besar tidak bisa dicache utuh | Data dipecah (chunking) + versioning per tabel. |
| Kontensi LockService | Dua penyimpanan bersamaan bisa bentrok | Semua tulis di dalam `LockService`. Bila antrian penuh muncul pesan "Server sibuk, coba lagi" (kode `BUSY`), dan bacaan di-retry 1×. |
| Kuota MailApp (±100 email/hari untuk akun gratis) | Notifikasi email bisa berhenti | Email bersifat opsional. Booking tetap tersimpan walau email gagal. |
| Endpoint `drive.google.com/thumbnail` tidak resmi dan bisa di-throttle | Gambar sesekali gagal dimuat | Gambar dicache oleh Next Image (31 hari). Bisa juga dinonaktifkan via `NEXT_IMAGE_UNOPTIMIZED`. |
| Akun Google Workspace bisa melarang sharing publik | Gambar tidak tampil | Upload gagal dengan pesan jelas. Gunakan akun Gmail biasa atau minta admin Workspace mengizinkan sharing. |
| Data cache Next.js tetap bertahan antar deploy | Setelah mengganti Spreadsheet, data lama bisa tampil s/d 1 jam | Klik **Muat ulang data website** di Dashboard. |
| Rate limit berbasis CacheService tidak atomik | Batas percobaan bersifat perkiraan | Cukup untuk mencegah brute force dan spam. |

---

## 11. Keamanan

- API key & URL Apps Script **hanya** ada di server (`import 'server-only'`) dan tidak pernah dikirim ke browser.
- Perbandingan API key di Apps Script dilakukan dengan waktu konstan.
- Password admin di-hash dengan **scrypt** (N=16384) di Next.js. Verifikasi tetap dilakukan walau username tidak ada (hash dummy), sehingga username tidak bisa ditebak dari waktu respon.
- Sesi berupa JWT HS256 di cookie **httpOnly, Secure, SameSite=Lax**, berlaku 7 hari.
- Rate limit: login 5×/15 menit per username dan 20× per IP; booking 5×/jam per IP. Form booking juga dilindungi honeypot dan waktu isi minimum.
- Proteksi berlapis: `proxy.ts` untuk `/admin` ditambah pengecekan sesi di setiap halaman, server action, dan route upload. Route upload juga memeriksa Origin.
- Validasi dua sisi: Zod di Next.js dan validasi dasar di Apps Script (whitelist field, panjang, tipe). Teks yang diawali `= + - @` disimpan sebagai teks, bukan formula.
- `upload.delete` hanya bisa menghapus file di folder upload.
- Header keamanan (`X-Frame-Options`, `nosniff`, dll.), dan `/admin` diberi `noindex`.

Rotasi API key: ganti `API_KEY` di Script Properties **dan** `GAS_API_KEY` di Vercel, lalu Redeploy Vercel.

---

## 12. Testing

```bash
npm run lint
```

```bash
npm run typecheck
```

Unit test (logika Apps Script dijalankan di Node dengan Google service tiruan, ditambah util & schema):

```bash
npm test
```

E2E Playwright (production build + mode mock, tidak butuh akun Google):

```bash
npm run test:e2e
```

CI GitHub Actions (`.github/workflows/ci.yml`) menjalankan semua langkah di atas setiap push.

---

## 13. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| Admin: "Server data belum terkonfigurasi dengan benar" | Cek log Vercel. Penyebab umumnya: `GAS_API_KEY` ≠ `API_KEY`, URL bukan `/exec`, atau deployment belum "Anyone". |
| `Apps Script tidak mengembalikan JSON` | Web App belum di-deploy dengan **Who has access: Anyone**, atau URL salah. |
| Perubahan kode Apps Script tidak berefek | Deployment belum diperbarui (lihat 4.2). |
| `Sheet "x" belum ada` | Jalankan `setup()`. |
| Admin tidak bisa login setelah setup | Pastikan `ADMIN_INITIAL_PASSWORD_HASH` berisi seluruh baris `scrypt$...`, lalu cek sheet `admins`. Kalau perlu, hapus barisnya dan jalankan `setup()` lagi. |
| "Terlalu banyak percobaan login" | Tunggu 15 menit, atau jalankan `clearCache` di editor Apps Script. |
| Gambar tidak muncul | Pastikan file di folder upload berstatus "Anyone with the link". Cek juga kuota Image Optimization Vercel (`NEXT_IMAGE_UNOPTIMIZED=true`). |
| Website belum berubah setelah edit di Sheet | Dashboard admin → **Muat ulang data website**. |
