import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { gas } from '../gas/client';
import { SETTING_KEYS, type PublicSnapshot, type Settings } from '@/features/content/types';

/**
 * Data halaman publik.
 * - Satu panggilan `public.snapshot` → semua konten aktif.
 * - Dicache di Next.js (Data Cache) dengan tag PUBLIC_TAG. Admin memanggil
 *   updateTag/revalidateTag(PUBLIC_TAG) setelah menyimpan, jadi perubahan langsung tampil.
 * - Bila Apps Script error saat revalidasi di background, Next tetap menyajikan data lama.
 * - Bila belum ada cache sama sekali dan Apps Script gagal, tampilkan fallback (tidak dicache).
 */

export const PUBLIC_TAG = 'public-content';
const REVALIDATE = Number(process.env.REVALIDATE_SECONDS ?? 3600) || 3600;

export const DEFAULT_SETTINGS: Settings = {
  ...(Object.fromEntries(SETTING_KEYS.map((k) => [k, ''])) as Settings),
  business_name: 'Genta Buana',
  tagline: 'Sewa Sound System & Perlengkapan Acara',
};

const fetchSnapshot = unstable_cache(
  async () => gas<PublicSnapshot>('public.snapshot'),
  ['public-snapshot-v1'],
  { tags: [PUBLIC_TAG], revalidate: REVALIDATE },
);

function emptySnapshot(): PublicSnapshot {
  return {
    settings: DEFAULT_SETTINGS,
    categories: [],
    packages: [],
    equipment: [],
    gallery: [],
    testimonials: [],
    faqs: [],
    generated_at: '',
  };
}

/** react cache(): dedupe dalam satu render (layout + page + metadata = 1 panggilan). */
export const getPublicSnapshot = cache(async (): Promise<PublicSnapshot & { degraded?: boolean }> => {
  try {
    const snap = await fetchSnapshot();
    return { ...snap, settings: { ...DEFAULT_SETTINGS, ...snap.settings } };
  } catch (err) {
    console.error('[public] gagal memuat snapshot:', (err as Error).message);
    return { ...emptySnapshot(), degraded: true };
  }
});

export async function getSettingsPublic() {
  return (await getPublicSnapshot()).settings;
}

export async function getPackageBySlug(slug: string) {
  const snap = await getPublicSnapshot();
  const pkg = snap.packages.find((p) => p.slug === slug);
  if (!pkg) return null;
  return { pkg, category: snap.categories.find((c) => c.id === pkg.category_id) ?? null, snap };
}
