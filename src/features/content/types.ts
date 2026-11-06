/** Tipe data yang dikembalikan Apps Script (lihat apps-script/src/Config.js). */

export interface BaseRecord {
  id: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category extends BaseRecord {
  name: string;
  slug: string;
  description: string;
}

export interface Spec {
  label: string;
  value: string;
}

export type PriceUnit = 'per_acara' | 'per_hari';

export interface Package extends BaseRecord {
  category_id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  price_unit: PriceUnit;
  specs: Spec[];
  capacity: string;
  image_ids: string[];
  is_featured: boolean;
}

export interface Equipment extends BaseRecord {
  name: string;
  description: string;
  price: number;
  unit: string;
  image_id: string;
}

export interface GalleryItem extends BaseRecord {
  title: string;
  event_type: string;
  event_date: string;
  location: string;
  description: string;
  image_ids: string[];
}

export interface Testimonial extends BaseRecord {
  name: string;
  event: string;
  message: string;
  rating: number;
}

export interface Faq extends BaseRecord {
  question: string;
  answer: string;
}

export const BOOKING_STATUSES = ['baru', 'dihubungi', 'deal', 'batal'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface Booking extends BaseRecord {
  name: string;
  phone: string;
  event_date: string;
  location: string;
  package_id: string;
  package_name?: string;
  message: string;
  status: BookingStatus;
  admin_note: string;
}

export const SETTING_KEYS = [
  'business_name',
  'tagline',
  'description',
  'about',
  'address',
  'service_area',
  'whatsapp',
  'phone',
  'email',
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'maps_url',
  'maps_embed_url',
  'opening_hours',
  'logo_id',
  'hero_image_id',
  'wa_default_message',
  'price_note',
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];
export type Settings = Record<SettingKey, string>;

export interface PublicSnapshot {
  settings: Settings;
  categories: Category[];
  packages: Package[];
  equipment: Equipment[];
  gallery: GalleryItem[];
  testimonials: Testimonial[];
  faqs: Faq[];
  generated_at: string;
}

export interface DashboardStats {
  packages: { active: number; total: number };
  categories: { active: number; total: number };
  equipment: { active: number; total: number };
  gallery: { active: number; total: number };
  testimonials: { active: number; total: number };
  faqs: { active: number; total: number };
  bookings: { baru: number; dihubungi: number; deal: number; total: number };
  latestBookings: Booking[];
}

export interface AdminCredential {
  id: string;
  username: string;
  role: 'owner' | 'staff';
  password_hash: string;
}

/** Nama resource konten yang bisa di-CRUD lewat admin. */
export type ResourceName = 'categories' | 'packages' | 'equipment' | 'gallery' | 'testimonials' | 'faqs';

export interface ResourceRecordMap {
  categories: Category;
  packages: Package;
  equipment: Equipment;
  gallery: GalleryItem;
  testimonials: Testimonial;
  faqs: Faq;
}
