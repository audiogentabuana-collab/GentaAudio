/**
 * Validasi Zod (lapis pertama). Batasan dibuat sama dengan apps-script/src/Config.js.
 * Dipakai di client (pesan error form) dan WAJIB dipanggil lagi di server action.
 */
import { z } from 'zod';
import { BOOKING_STATUSES, SETTING_KEYS, type ResourceName } from './types';

export const FILE_ID_RE = /^[A-Za-z0-9_-]{10,128}$/;
const fileId = z.string().regex(FILE_ID_RE, 'ID gambar tidak valid');

const req = (label: string, max: number) =>
  z.string({ error: `${label} wajib diisi` }).trim().min(1, `${label} wajib diisi`).max(max, `${label} maksimal ${max} karakter`);
const opt = (label: string, max: number) =>
  z.string().trim().max(max, `${label} maksimal ${max} karakter`).optional().default('');

const price = z.coerce
  .number({ error: 'Harga harus berupa angka' })
  .int('Harga harus bilangan bulat')
  .min(0, 'Harga tidak boleh negatif')
  .max(1_000_000_000, 'Harga terlalu besar');

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(s + 'T00:00:00Z')), 'Tanggal tidak valid');

const baseFields = {
  is_active: z.boolean().optional(),
};

export const specSchema = z.object({
  label: z.string().trim().min(1, 'Nama item wajib diisi').max(60),
  value: z.string().trim().min(1, 'Keterangan wajib diisi').max(200),
});

export const categorySchema = z.object({
  name: req('Nama kategori', 80),
  slug: opt('Slug', 100),
  description: opt('Deskripsi', 500),
  ...baseFields,
});

export const packageSchema = z.object({
  category_id: z.string({ error: 'Pilih kategori' }).min(1, 'Pilih kategori'),
  name: req('Nama paket', 120),
  slug: opt('Slug', 140),
  description: opt('Deskripsi', 5000),
  price,
  price_unit: z.enum(['per_acara', 'per_hari']),
  specs: z.array(specSchema).max(50, 'Maksimal 50 item spesifikasi').default([]),
  capacity: opt('Kapasitas', 160),
  image_ids: z.array(fileId).max(12, 'Maksimal 12 foto').default([]),
  is_featured: z.boolean().default(false),
  ...baseFields,
});

export const equipmentSchema = z.object({
  name: req('Nama peralatan', 120),
  description: opt('Deskripsi', 2000),
  price,
  unit: opt('Satuan', 40),
  image_id: z.union([fileId, z.literal('')]).default(''),
  ...baseFields,
});

export const gallerySchema = z.object({
  title: req('Judul', 140),
  event_type: opt('Jenis acara', 80),
  event_date: z.union([dateStr, z.literal('')]).default(''),
  location: opt('Lokasi', 160),
  description: opt('Keterangan', 2000),
  image_ids: z.array(fileId).max(30, 'Maksimal 30 foto').default([]),
  ...baseFields,
});

export const testimonialSchema = z.object({
  name: req('Nama', 80),
  event: opt('Acara', 120),
  message: req('Isi testimoni', 1500),
  rating: z.coerce.number().int().min(1, 'Rating 1-5').max(5, 'Rating 1-5').default(5),
  ...baseFields,
});

export const faqSchema = z.object({
  question: req('Pertanyaan', 250),
  answer: req('Jawaban', 3000),
  ...baseFields,
});

export const resourceSchemas = {
  categories: categorySchema,
  packages: packageSchema,
  equipment: equipmentSchema,
  gallery: gallerySchema,
  testimonials: testimonialSchema,
  faqs: faqSchema,
} satisfies Record<ResourceName, z.ZodType>;

/* ---------------- Settings ---------------- */

const phoneRe = /^\+?[0-9\s-]{9,20}$/;
const optionalUrl = (label: string) =>
  z.union([z.literal(''), z.url({ error: `${label} harus berupa link (https://...)` }).max(600)]).default('');

export const settingsSchema = z
  .object({
    business_name: req('Nama usaha', 120),
    tagline: opt('Tagline', 200),
    description: opt('Deskripsi singkat', 1000),
    about: opt('Tentang kami', 6000),
    address: opt('Alamat', 400),
    service_area: opt('Area layanan', 400),
    whatsapp: z.string().trim().regex(phoneRe, 'Nomor WhatsApp tidak valid'),
    phone: z.union([z.literal(''), z.string().trim().regex(phoneRe, 'Nomor telepon tidak valid')]).default(''),
    email: z.union([z.literal(''), z.email({ error: 'Email tidak valid' })]).default(''),
    instagram: optionalUrl('Instagram'),
    facebook: optionalUrl('Facebook'),
    tiktok: optionalUrl('TikTok'),
    youtube: optionalUrl('YouTube'),
    maps_url: optionalUrl('Link Google Maps'),
    maps_embed_url: z
      .union([
        z.literal(''),
        z
          .string()
          .trim()
          .max(1200)
          .refine((v) => v.startsWith('https://www.google.com/maps/embed'), {
            message: 'Gunakan link dari Google Maps > Bagikan > Sematkan peta (diawali https://www.google.com/maps/embed)',
          }),
      ])
      .default(''),
    opening_hours: opt('Jam operasional', 300),
    logo_id: z.union([fileId, z.literal('')]).default(''),
    hero_image_id: z.union([fileId, z.literal('')]).default(''),
    wa_default_message: opt('Pesan WA default', 500),
    price_note: opt('Catatan harga', 500),
  })
  .strict();

/** Ambil src iframe bila pemilik menempelkan seluruh kode <iframe ...>. */
export function extractEmbedSrc(input: string): string {
  const m = /src=["']([^"']+)["']/i.exec(input);
  return (m ? m[1] : input).trim();
}

export const settingKeysSchema = z.enum(SETTING_KEYS);

/* ---------------- Booking (publik) ---------------- */

export const bookingSchema = z.object({
  name: req('Nama', 100),
  phone: z
    .string({ error: 'Nomor WhatsApp wajib diisi' })
    .trim()
    .regex(phoneRe, 'Nomor WhatsApp tidak valid (contoh: 0812xxxxxxx)'),
  event_date: dateStr.refine((s) => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    return s >= today;
  }, 'Tanggal acara tidak boleh di masa lalu'),
  location: req('Lokasi acara', 250),
  package_id: z.string().max(64).optional().default(''),
  message: opt('Pesan', 2000),
});

export const bookingStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(BOOKING_STATUSES),
  admin_note: z.string().trim().max(2000).optional(),
});

/* ---------------- Auth ---------------- */

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username wajib diisi').max(50),
  password: z.string().min(1, 'Password wajib diisi').max(200),
});

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, 'Password lama wajib diisi'),
    next: z.string().min(8, 'Password baru minimal 8 karakter').max(200),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: 'Konfirmasi password tidak sama', path: ['confirm'] });

/* ---------------- Upload ---------------- */

export const MAX_UPLOAD_BYTES = 1.5 * 1024 * 1024; // setelah kompres di client
export const uploadSchema = z.object({
  fileName: z.string().trim().max(120).default('gambar'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp'], { error: 'Format harus JPG, PNG, atau WEBP' }),
  base64: z
    .string()
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Data gambar rusak')
    .refine((b) => (b.length * 3) / 4 <= MAX_UPLOAD_BYTES, 'Ukuran gambar maksimal 1,5MB setelah kompres'),
});

/** Ubah ZodError → { field: pesan } untuk ditampilkan di form. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
