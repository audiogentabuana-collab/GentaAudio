import type { Metadata } from 'next';
import Link from 'next/link';
import { adminList, adminSettings, adminStats } from '@/server/data/admin';
import { PageHeader } from '@/features/admin/components/ui';
import { RefreshCacheButton } from '@/features/admin/components/RefreshCacheButton';
import { displayPhone } from '@/shared/lib/whatsapp';
import { cn } from '@/shared/lib/format';

export const metadata: Metadata = { title: 'Ringkasan' };

const SEED_WA = '6281234567890';
const filled = (v: string) => Boolean(v) && !v.startsWith('[ISI');

export default async function DashboardPage() {
  const [stats, s, packages, gallery] = await Promise.all([adminStats(), adminSettings(), adminList('packages'), adminList('gallery')]);

  const pkgNoPhoto = packages.filter((p) => p.image_ids.length === 0).length;
  const galNoPhoto = gallery.filter((g) => g.image_ids.length === 0).length;

  const checklist: { done: boolean; label: string; note?: string; href: string }[] = [
    {
      done: Boolean(s.whatsapp) && s.whatsapp !== SEED_WA,
      label: 'Nomor WhatsApp asli',
      note: s.whatsapp === SEED_WA ? 'Masih nomor contoh' : displayPhone(s.whatsapp),
      href: '/admin/pengaturan',
    },
    { done: filled(s.address), label: 'Alamat usaha', href: '/admin/pengaturan' },
    { done: filled(s.service_area), label: 'Area layanan', href: '/admin/pengaturan' },
    { done: Boolean(s.maps_url || s.maps_embed_url), label: 'Lokasi Google Maps', href: '/admin/pengaturan' },
    { done: Boolean(s.email) && !s.email.endsWith('.example'), label: 'Email usaha', note: s.email.endsWith('.example') ? 'Masih email contoh' : undefined, href: '/admin/pengaturan' },
    { done: Boolean(s.logo_id), label: 'Logo', href: '/admin/pengaturan' },
    { done: Boolean(s.hero_image_id), label: 'Foto utama beranda', href: '/admin/pengaturan' },
    {
      done: packages.length > 0 && pkgNoPhoto === 0,
      label: 'Foto untuk setiap paket',
      note: pkgNoPhoto ? `${pkgNoPhoto} dari ${packages.length} paket belum ada foto` : undefined,
      href: '/admin/paket',
    },
    {
      done: gallery.length > 0 && galNoPhoto === 0,
      label: 'Foto di galeri',
      note: galNoPhoto ? `${galNoPhoto} dari ${gallery.length} album belum ada foto` : undefined,
      href: '/admin/galeri',
    },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  const contents: [string, string, string][] = [
    ['Paket', `${stats.packages.active} tampil / ${stats.packages.total}`, '/admin/paket'],
    ['Kategori', `${stats.categories.active} / ${stats.categories.total}`, '/admin/kategori'],
    ['Peralatan', `${stats.equipment.active} / ${stats.equipment.total}`, '/admin/peralatan'],
    ['Galeri', `${stats.gallery.active} / ${stats.gallery.total}`, '/admin/galeri'],
    ['Testimoni', `${stats.testimonials.active} / ${stats.testimonials.total}`, '/admin/testimoni'],
    ['FAQ', `${stats.faqs.active} / ${stats.faqs.total}`, '/admin/faq'],
  ];

  return (
    <div>
      <PageHeader title="Ringkasan" description="Kondisi isi website saat ini dan hal yang masih perlu dilengkapi." action={<RefreshCacheButton />} />

      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="checklist">
          <div className="flex items-baseline justify-between border-b border-stone-300 pb-2">
            <h2 id="checklist" className="text-lg font-semibold">
              Perlu dilengkapi
            </h2>
            <span className="font-mono text-sm text-stone-500">
              {doneCount}/{checklist.length} lengkap
            </span>
          </div>
          <ul>
            {checklist.map((c) => (
              <li key={c.label} className="border-b border-stone-200">
                <Link href={c.href} className="group grid grid-cols-[1.5rem_1fr_auto] items-baseline gap-3 py-3">
                  <span className={cn('font-mono text-sm', c.done ? 'text-emerald-700' : 'text-brand-600')} aria-hidden>
                    {c.done ? '✓' : '○'}
                  </span>
                  <span>
                    <span className={cn(c.done ? 'text-stone-500' : 'text-stone-900')}>{c.label}</span>
                    <span className="sr-only">{c.done ? ' (sudah)' : ' (belum)'}</span>
                    {c.note && <span className="block text-sm text-stone-500">{c.note}</span>}
                  </span>
                  {!c.done && <span className="text-sm text-stone-900 underline-offset-4 group-hover:underline">Lengkapi →</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-10">
          <section aria-labelledby="wa">
            <h2 id="wa" className="border-b border-stone-300 pb-2 text-lg font-semibold">
              Pemesanan via WhatsApp
            </h2>
            <p className="mt-3 font-mono text-2xl">{s.whatsapp ? displayPhone(s.whatsapp) : '—'}</p>
            <p className="mt-1 text-sm text-stone-600">Semua tombol pesan di website mengarah ke nomor ini.</p>
            <Link href="/admin/pengaturan" className="mt-3 inline-block text-sm underline underline-offset-4">
              Ganti nomor
            </Link>
          </section>

          <section aria-labelledby="isi">
            <h2 id="isi" className="border-b border-stone-300 pb-2 text-lg font-semibold">
              Isi website
            </h2>
            <dl>
              {contents.map(([k, v, href]) => (
                <div key={k} className="border-b border-stone-200">
                  <Link href={href} className="flex items-baseline justify-between py-2.5 hover:underline">
                    <dt>{k}</dt>
                    <dd className="font-mono text-sm text-stone-600">{v}</dd>
                  </Link>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[13px] leading-relaxed text-stone-500">
              Habis mengedit Google Sheet secara langsung? Klik <strong className="font-medium text-stone-700">Muat ulang data website</strong> agar perubahan langsung tampil.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
