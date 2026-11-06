import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CircleHelp, Images, MessageSquareQuote, Package, Plus, Settings, Tags } from 'lucide-react';
import { adminSettings, adminStats } from '@/server/data/admin';
import { getSession } from '@/server/auth/session';
import { Card, PageHeader } from '@/features/admin/components/ui';
import { RefreshCacheButton } from '@/features/admin/components/RefreshCacheButton';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { displayPhone } from '@/shared/lib/whatsapp';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const [stats, settings, session] = await Promise.all([adminStats(), adminSettings(), getSession()]);
  const cards = [
    { label: 'Paket aktif', value: stats.packages.active, sub: `${stats.packages.total} total`, href: '/admin/paket', icon: Package },
    { label: 'Kategori', value: stats.categories.active, sub: `${stats.categories.total} total`, href: '/admin/kategori', icon: Tags },
    { label: 'Album galeri', value: stats.gallery.active, sub: `${stats.gallery.total} total`, href: '/admin/galeri', icon: Images },
    { label: 'Testimoni', value: stats.testimonials.active, sub: `${stats.testimonials.total} total`, href: '/admin/testimoni', icon: MessageSquareQuote },
  ];
  return (
    <div>
      <PageHeader title={`Halo, ${session?.username ?? 'Admin'}`} description="Ringkasan isi website Anda." action={<RefreshCacheButton />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, sub, href, icon: Icon }) => (
          <Link key={label} href={href} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <Icon className="h-5 w-5 text-slate-400" aria-hidden />
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{sub}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <WhatsAppIcon size={20} className="text-[#25D366]" /> Pemesanan via WhatsApp
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Semua tombol pesan di website mengarah ke WhatsApp
            {settings.whatsapp ? (
              <>
                {' '}
                <strong className="text-slate-900">{displayPhone(settings.whatsapp)}</strong>
              </>
            ) : (
              ' (nomor belum diisi)'
            )}
            . Pesan otomatis berisi nama paket, tanggal, dan lokasi acara yang diisi pengunjung.
          </p>
          <Link href="/admin/pengaturan" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            <Settings className="h-4 w-4" aria-hidden /> Ganti nomor WhatsApp
          </Link>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-bold text-slate-900">Aksi cepat</h2>
          <ul className="space-y-2">
            {[
              { href: '/admin/paket/baru', label: 'Tambah paket', icon: Plus },
              { href: '/admin/galeri/baru', label: 'Upload foto acara', icon: Images },
              { href: '/admin/testimoni/baru', label: 'Tambah testimoni', icon: MessageSquareQuote },
              { href: '/admin/faq/baru', label: 'Tambah FAQ', icon: CircleHelp },
            ].map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  <Icon className="h-5 w-5 text-brand-500" aria-hidden /> {label}
                  <ArrowRight className="ml-auto h-4 w-4 text-slate-400" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Habis mengedit Google Sheet secara langsung? Klik <strong>Muat ulang data website</strong> supaya perubahan langsung tampil.
          </p>
        </Card>
      </div>
    </div>
  );
}
