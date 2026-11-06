# AGENT MEMORY — Genta Buana (company profile + CMS sewa sound system)

> WAJIB dibaca AI agent/developer di awal sesi dan diupdate di akhir sesi setelah fitur selesai + dites.
> Terakhir diupdate: 2026-11-06 — sesi: build awal fase 1–5 (Apps Script, API layer, publik, admin, SEO) + redesign tema hitam-oranye sesuai referensi pemilik.

## 1. Ringkasan Project
- Website company profile + CMS untuk usaha sewa sound system "Genta Buana". Pengunjung: lihat pricelist/galeri lalu pesan **langsung via WhatsApp** (form booking sudah dihapus atas permintaan pemilik). Pemilik (non-teknis) mengelola konten di `/admin`.
- Stack: Next.js 16.4 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS 4 + lucide-react v1; Zod 4; jose (JWT). Backend: Google Apps Script Web App (V8). DB: Google Sheets. File: Google Drive. Hosting: Vercel.
- Repo tunggal: Next.js di root, kode Apps Script di `apps-script/src` (clasp, `rootDir: src`).

## 2. Keputusan Arsitektur (jangan diubah tanpa diskusi)
- **Browser tidak pernah memanggil Apps Script.** Semua lewat server Next (`src/server/gas/client.ts`, `import 'server-only'`).
- Kontrak API: `POST {apiKey, action, payload}` → `{success, data, message, code?}`. Web App selalu HTTP 200, status dibaca dari `success`/`code`.
- **Halaman publik pakai satu action `public.snapshot`**, dicache dengan `unstable_cache` (tag `public-content`, revalidate `REVALIDATE_SECONDS`). Admin memanggil `updateTag('public-content')` di setiap server action tulis. Keputusan memakai `unstable_cache` (bukan `'use cache'`/cacheComponents) diambil supaya tidak perlu Suspense di semua halaman admin yang dinamis (cookies).
- Halaman publik `export const revalidate = 3600` (ISR). Filter pricelist/galeri di client agar halaman tetap statis.
- **Password di-hash di Next.js (scrypt)**, bukan di Apps Script (tidak ada bcrypt/scrypt). Apps Script hanya menyimpan hash dan menjaga rate limit di CacheService (memori Vercel tidak dibagi antar-instance).
- Cache Apps Script: versi per tabel di Script Properties (`CACHE_VER_<tabel>`) + chunking CacheService. Tulis menaikkan versi → anti race.
- Semua tulis di Apps Script lewat `withLock()` (re-entrant). Fungsi `Db.*` tulis mengasumsikan lock sudah dipegang.
- Kolom sheet dipetakan berdasarkan NAMA header; seluruh sel Plain Text; teks diawali `= + - @` diberi apostrof (anti formula injection).
- Upload gambar: kompres di browser (`src/shared/lib/compress-image.ts`) → Route Handler `/api/admin/upload` (bukan Server Action, karena limit body 1MB) → `upload.image` → Drive (ANYONE_WITH_LINK). Ditampilkan via `https://drive.google.com/thumbnail?id=..&sz=w1600`. File lama di-trash otomatis saat record dihapus/foto dilepas (diff di `Crud.js update`).
- **Mode mock** (`GAS_MOCK=true`): `src/server/gas/harness.ts` menjalankan kode Apps Script ASLI di `node:vm` dengan fake SpreadsheetApp/DriveApp/CacheService/dll. State dipersist di `.mock-gas/state.json` (dengan init lock untuk build worker paralel). Dipakai untuk dev lokal, unit test, dan E2E. Diblokir bila `VERCEL=1`.
- Proteksi admin berlapis: `src/proxy.ts` (Next 16, pengganti middleware) + `requireAdmin()` di layout + `assertAdmin()` di setiap server action/route.

## 3. Konvensi yang harus diikuti
- Error dari Apps Script → `GasError(code, message, details)`; tampilkan ke user via `userMessage(err)` (menyembunyikan detail CONFIG/UNAUTHORIZED).
- Server action admin mengembalikan `ActionResult {ok, message?, errors?, data?}`; field error dari Zod via `fieldErrors()`.
- **Jangan mengekspor konstanta/non-komponen dari file `'use client'` lalu memakainya di server component** (akan jadi client reference → `undefined`). Contoh yang sudah dipindah: `NAV` → `features/public/components/nav.ts`.
- Ikon: `lucide-react` (v1 tidak punya logo brand → `src/shared/components/BrandIcons.tsx`). Dilarang emoji di UI.
- Tema publik: hitam netral `ink-*` + oranye `brand-400 #ff7f3e` + aksen `lime-accent`; font Poppins; tombol `rounded-md`. Admin: tema terang slate + aksen brand. Token di `src/app/globals.css` (`@theme`).
- CRUD admin config-driven: tambah field → update `apps-script/src/Config.js` (TABLES), `src/features/content/types.ts`, `schemas.ts`, `src/features/admin/resources.ts`.
- Bahasa UI & pesan error: Bahasa Indonesia.

## 4. Status Fitur
| Fitur | Status | Catatan |
|---|---|---|
| Apps Script (router, CRUD generik, settings, booking, auth, upload Drive, setup+seed) | Done, tested | 32 test di `tests/unit/apps-script.test.ts` |
| API layer Next (gas client, mock, cache, sesi, schema) | Done, tested | `tests/unit/lib.test.ts` |
| Halaman publik (beranda, pricelist+filter, detail, galeri+lightbox, tentang, FAQ, kontak + penyusun pesan WA, WA melayang) | Done, tested E2E | Kontak memakai `WhatsAppComposer` (tidak menyimpan data) |
| Admin (login+rate limit, dashboard, CRUD 6 resource, upload multi-gambar, reorder, toggle, pengaturan, ganti password) | Done, tested E2E | Inbox booking dihapus |
| Form booking + inbox | Dihapus | Keputusan pemilik: semua pemesanan via WhatsApp. Action `bookings.*` & sheet `bookings` di Apps Script dibiarkan (tidak dipakai) agar mudah diaktifkan lagi |
| SEO (metadata, OG image dinamis, sitemap, robots, JSON-LD LocalBusiness/Service/FAQPage/Breadcrumb) | Done, tested E2E | OG image ada di `src/app/(public)/opengraph-image.tsx` (URL ber-hash karena route group) |
| CI GitHub Actions | Dibuat | lint, typecheck, vitest, playwright (mode mock) |
| Deploy nyata ke Google + Vercel | Belum | Butuh akun pemilik; ikuti README bagian 3–6 |

## 5. Next step / yang belum dikerjakan
- Isi data asli usaha (alamat, WA, IG, foto) lewat admin setelah deploy; placeholder `[ISI ...]` ada di seed settings & gallery.
- Opsional: manajemen multi-admin (role `staff` sudah ada di skema, belum ada UI), invalidasi sesi saat ganti password (saat ini JWT tetap valid s/d 7 hari), notifikasi WA otomatis.
- Opsional: foto contoh untuk seed (sekarang placeholder ikon speaker).

## 6. Known issues / hutang teknis
- Rate limit berbasis CacheService tidak atomik (perkiraan) — cukup untuk brute force ringan.
- Endpoint Drive thumbnail tidak resmi; bila diblokir Google, alternatif: proxy route yang membaca file via Apps Script (lebih lambat) atau pindah storage.
- Data cache Next (`.next/cache` / Vercel Data Cache) bertahan lintas deploy; E2E menghapus `.next/cache` sebelum build. Di produksi gunakan tombol "Muat ulang data website".
- Upload yang ditinggalkan (form tidak disimpan) bisa meninggalkan file yatim di folder Drive.

## 7. Catatan untuk agent berikutnya
- Env Next: `GAS_WEB_APP_URL`, `GAS_API_KEY`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, `REVALIDATE_SECONDS`, `GAS_TIMEOUT_MS`, `NEXT_IMAGE_UNOPTIMIZED`, `GAS_MOCK`, `MOCK_ADMIN_USERNAME`, `MOCK_ADMIN_PASSWORD`.
- Script Properties: `API_KEY`, `SPREADSHEET_ID`, `DRIVE_FOLDER_ID`, `ADMIN_INITIAL_USERNAME`, `ADMIN_INITIAL_PASSWORD_HASH`, `NOTIFY_EMAIL` (opsional, tidak dipakai lagi), `CACHE_VER_*` (otomatis).
- Perintah: `npm run dev` (pakai `.env.local` dengan `GAS_MOCK=true` untuk lokal), `npm test`, `npm run test:e2e`, `npm run typecheck` (menjalankan `next typegen` dulu untuk `PageProps`/`RouteContext`).
- Playwright memakai browser pra-terpasang versi 1.63 (`@playwright/test` dipin 1.63.0).
- Ubah kode Apps Script → `npm run gas:bundle` (perbarui `apps-script/dist/Code.gs` untuk jalur copy-paste; ada test sinkronisasi) → jalankan unit test (harness memuat file asli) → `npm run gas:push` → update deployment (README 4.2), jangan buat deployment baru (URL berubah).
