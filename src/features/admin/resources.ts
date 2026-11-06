/**
 * Definisi resource admin (config-driven CRUD). Dipakai oleh server & client.
 * Untuk menambah field baru: tambahkan di apps-script/src/Config.js, schemas.ts, types.ts, lalu di sini.
 */
import {
  CircleHelp,
  Images,
  MessageSquareQuote,
  Package as PackageIcon,
  Tags,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { ResourceName } from '@/features/content/types';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'price'
  | 'select'
  | 'category'
  | 'switch'
  | 'date'
  | 'images'
  | 'image'
  | 'specs'
  | 'rating';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  maxLength?: number;
  maxImages?: number;
  /** lebar penuh di grid 2 kolom */
  full?: boolean;
  suffix?: string;
}

export interface ResourceDef {
  name: ResourceName;
  /** segmen URL di /admin/<slug> */
  slug: string;
  label: string;
  singular: string;
  description: string;
  icon: LucideIcon;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
  titleField: string;
  imageField?: string;
}

export const RESOURCES: ResourceDef[] = [
  {
    name: 'packages',
    slug: 'paket',
    label: 'Paket & Pricelist',
    singular: 'Paket',
    description: 'Paket sewa yang tampil di halaman Pricelist. Paket "Unggulan" tampil di beranda.',
    icon: PackageIcon,
    titleField: 'name',
    imageField: 'image_ids',
    defaults: { name: '', category_id: '', description: '', price: 0, price_unit: 'per_acara', specs: [], capacity: '', image_ids: [], is_featured: false, is_active: true },
    fields: [
      { name: 'name', label: 'Nama paket', type: 'text', required: true, maxLength: 120, placeholder: 'Contoh: Paket Hajatan Standar' },
      { name: 'category_id', label: 'Kategori', type: 'category', required: true },
      { name: 'price', label: 'Harga', type: 'price', required: true, help: 'Isi angka saja, contoh 1500000' },
      {
        name: 'price_unit',
        label: 'Satuan harga',
        type: 'select',
        options: [
          { value: 'per_acara', label: 'per acara' },
          { value: 'per_hari', label: 'per hari' },
        ],
      },
      { name: 'capacity', label: 'Kapasitas', type: 'text', maxLength: 160, placeholder: 'Contoh: 200 - 300 tamu · 3.000 W', full: true },
      { name: 'description', label: 'Deskripsi', type: 'textarea', maxLength: 5000, full: true, placeholder: 'Jelaskan paket ini cocok untuk acara apa' },
      { name: 'specs', label: 'Spesifikasi / isi paket', type: 'specs', full: true, help: 'Daftar alat dalam paket. Contoh: Speaker → 4x speaker 15 inch' },
      { name: 'image_ids', label: 'Foto paket', type: 'images', maxImages: 12, full: true, help: 'Foto pertama menjadi foto utama.' },
      { name: 'is_featured', label: 'Tampilkan di beranda (Unggulan)', type: 'switch' },
      { name: 'is_active', label: 'Aktif (tampil di website)', type: 'switch' },
    ],
  },
  {
    name: 'categories',
    slug: 'kategori',
    label: 'Kategori Paket',
    singular: 'Kategori',
    description: 'Kelompok paket untuk filter di halaman Pricelist.',
    icon: Tags,
    titleField: 'name',
    defaults: { name: '', description: '', is_active: true },
    fields: [
      { name: 'name', label: 'Nama kategori', type: 'text', required: true, maxLength: 80, placeholder: 'Contoh: Hajatan & Pernikahan', full: true },
      { name: 'description', label: 'Deskripsi', type: 'textarea', maxLength: 500, full: true },
      { name: 'is_active', label: 'Aktif (tampil di website)', type: 'switch' },
    ],
  },
  {
    name: 'equipment',
    slug: 'peralatan',
    label: 'Peralatan (sewa satuan)',
    singular: 'Peralatan',
    description: 'Alat yang bisa disewa satuan. Tampil di bawah Pricelist.',
    icon: Wrench,
    titleField: 'name',
    imageField: 'image_id',
    defaults: { name: '', description: '', price: 0, unit: 'per hari', image_id: '', is_active: true },
    fields: [
      { name: 'name', label: 'Nama alat', type: 'text', required: true, maxLength: 120, placeholder: 'Contoh: Mic wireless' },
      { name: 'price', label: 'Harga', type: 'price', required: true },
      { name: 'unit', label: 'Satuan', type: 'text', maxLength: 40, placeholder: 'per hari / per unit' },
      { name: 'description', label: 'Keterangan', type: 'textarea', maxLength: 2000, full: true },
      { name: 'image_id', label: 'Foto', type: 'image', full: true },
      { name: 'is_active', label: 'Aktif (tampil di website)', type: 'switch' },
    ],
  },
  {
    name: 'gallery',
    slug: 'galeri',
    label: 'Galeri / Portofolio',
    singular: 'Album galeri',
    description: 'Dokumentasi acara. Satu album bisa berisi beberapa foto.',
    icon: Images,
    titleField: 'title',
    imageField: 'image_ids',
    defaults: { title: '', event_type: '', event_date: '', location: '', description: '', image_ids: [], is_active: true },
    fields: [
      { name: 'title', label: 'Judul acara', type: 'text', required: true, maxLength: 140, placeholder: 'Contoh: Resepsi Pernikahan Andi & Sari', full: true },
      { name: 'event_type', label: 'Jenis acara', type: 'text', maxLength: 80, placeholder: 'Pernikahan / Hajatan / Sekolah' },
      { name: 'event_date', label: 'Tanggal acara', type: 'date' },
      { name: 'location', label: 'Lokasi', type: 'text', maxLength: 160, full: true },
      { name: 'description', label: 'Keterangan', type: 'textarea', maxLength: 2000, full: true },
      { name: 'image_ids', label: 'Foto', type: 'images', maxImages: 30, full: true, help: 'Foto pertama menjadi sampul album.' },
      { name: 'is_active', label: 'Aktif (tampil di website)', type: 'switch' },
    ],
  },
  {
    name: 'testimonials',
    slug: 'testimoni',
    label: 'Testimoni',
    singular: 'Testimoni',
    description: 'Ulasan pelanggan yang tampil di beranda dan halaman Tentang.',
    icon: MessageSquareQuote,
    titleField: 'name',
    defaults: { name: '', event: '', message: '', rating: 5, is_active: true },
    fields: [
      { name: 'name', label: 'Nama pelanggan', type: 'text', required: true, maxLength: 80 },
      { name: 'event', label: 'Acara', type: 'text', maxLength: 120, placeholder: 'Contoh: Pernikahan anak' },
      { name: 'message', label: 'Isi testimoni', type: 'textarea', required: true, maxLength: 1500, full: true },
      { name: 'rating', label: 'Rating', type: 'rating' },
      { name: 'is_active', label: 'Aktif (tampil di website)', type: 'switch' },
    ],
  },
  {
    name: 'faqs',
    slug: 'faq',
    label: 'FAQ',
    singular: 'FAQ',
    description: 'Pertanyaan yang sering diajukan.',
    icon: CircleHelp,
    titleField: 'question',
    defaults: { question: '', answer: '', is_active: true },
    fields: [
      { name: 'question', label: 'Pertanyaan', type: 'text', required: true, maxLength: 250, full: true },
      { name: 'answer', label: 'Jawaban', type: 'textarea', required: true, maxLength: 3000, full: true },
      { name: 'is_active', label: 'Aktif (tampil di website)', type: 'switch' },
    ],
  },
];

export const RESOURCE_NAMES = RESOURCES.map((r) => r.name);

export function resourceBySlug(slug: string) {
  return RESOURCES.find((r) => r.slug === slug) ?? null;
}

export function resourceByName(name: string) {
  return RESOURCES.find((r) => r.name === name) ?? null;
}
