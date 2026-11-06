import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Images, Inbox, MessageSquareQuote, Package, Plus, Settings } from 'lucide-react';
import { adminStats } from '@/server/data/admin';
import { getSession } from '@/server/auth/session';
import { Card, PageHeader } from '@/features/admin/components/ui';
import { RefreshCacheButton } from '@/features/admin/components/RefreshCacheButton';
import { STATUS_META } from '@/features/admin/booking-status';
import { formatDateId, formatDateTimeId, cn } from '@/shared/lib/format';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const [stats, session] = await Promise.all([adminStats(), getSession()]);
  const cards = [
    { label: 'Booking baru', value: stats.bookings.baru, sub: `${stats.bookings.total} total`, href: '/admin/booking?status=baru', icon: Inbox, highlight: stats.bookings.baru > 0 },
    { label: 'Paket aktif', value: stats.packages.active, sub: `${stats.packages.total} total`, href: '/admin/paket', icon: Package },
    { label: 'Album galeri', value: stats.gallery.active, sub: `${stats.gallery.total} total`, href: '/admin/galeri', icon: Images },
    { label: 'Testimoni', value: stats.testimonials.active, sub: `${stats.testimonials.total} total`, href: '/admin/testimoni', icon: MessageSquareQuote },
  ];
  return (
    <div>
      <PageHeader title={`Halo, ${session?.username ?? 'Admin'}`} description="Ringkasan website Anda hari ini." action={<RefreshCacheButton />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, sub, href, icon: Icon, highlight }) => (
          <Link key={label} href={href} className={cn('rounded-2xl border bg-white p-4 shadow-sm transition-colors hover:border-slate-300', highlight ? 'border-brand-400 ring-2 ring-brand-400/20' : 'border-slate-200')}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <Icon className={cn('h-5 w-5', highlight ? 'text-brand-500' : 'text-slate-400')} aria-hidden />
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{sub}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h2 className="font-bold text-slate-900">Booking terbaru</h2>
            <Link href="/admin/booking" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900">
              Semua <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {stats.latestBookings.length ? (
            <ul className="divide-y divide-slate-100">
              {stats.latestBookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{b.name}</p>
                    <p className="flex items-center gap-1.5 text-sm text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {formatDateId(b.event_date)} · {b.location}
                    </p>
                    <p className="text-xs text-slate-400">Masuk {formatDateTimeId(b.created_at)}</p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1', STATUS_META[b.status].cls)}>{STATUS_META[b.status].label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-sm text-slate-500">Belum ada booking masuk.</p>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-bold text-slate-900">Aksi cepat</h2>
          <ul className="space-y-2">
            {[
              { href: '/admin/paket/baru', label: 'Tambah paket', icon: Plus },
              { href: '/admin/galeri/baru', label: 'Upload foto acara', icon: Images },
              { href: '/admin/testimoni/baru', label: 'Tambah testimoni', icon: MessageSquareQuote },
              { href: '/admin/pengaturan', label: 'Ubah kontak & profil', icon: Settings },
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
