'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, Clock, Inbox, MapPin, Package as PackageIcon, Save } from 'lucide-react';
import { BOOKING_STATUSES, type Booking, type BookingStatus } from '@/features/content/types';
import { deleteBooking, updateBooking } from '../actions';
import { STATUS_META } from '../booking-status';
import { AdminButton, Card, ConfirmDelete } from './ui';
import { useToast } from './Toast';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { cn, formatDateId, formatDateTimeId } from '@/shared/lib/format';
import { displayPhone, waLink } from '@/shared/lib/whatsapp';


function BookingCard({ b, businessName, onDeleted }: { b: Booking; businessName: string; onDeleted: (id: string) => void }) {
  const [status, setStatus] = useState<BookingStatus>(b.status);
  const [note, setNote] = useState(b.admin_note);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function save(nextStatus: BookingStatus, nextNote: string) {
    setSaving(true);
    const res = await updateBooking({ id: b.id, status: nextStatus, admin_note: nextNote });
    setSaving(false);
    if (!res.ok) {
      toast('error', res.message ?? 'Gagal menyimpan.');
      setStatus(b.status);
      return;
    }
    toast('success', `Status: ${STATUS_META[nextStatus].label}`);
    router.refresh();
  }

  const waText = `Halo ${b.name}, kami dari ${businessName}. Terima kasih sudah booking untuk acara tanggal ${formatDateId(b.event_date)} di ${b.location}${b.package_name ? ` (${b.package_name})` : ''}. `;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-slate-900">{b.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" aria-hidden /> Masuk {formatDateTimeId(b.created_at)}
          </p>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold ring-1', STATUS_META[status].cls)}>{STATUS_META[status].label}</span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex gap-2"><dt className="sr-only">Tanggal acara</dt><CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden /><dd className="font-semibold text-slate-800">{formatDateId(b.event_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
        <div className="flex gap-2"><dt className="sr-only">Lokasi</dt><MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden /><dd className="text-slate-700">{b.location}</dd></div>
        <div className="flex gap-2"><dt className="sr-only">Paket</dt><PackageIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden /><dd className="text-slate-700">{b.package_name || 'Belum memilih paket'}</dd></div>
        <div className="flex gap-2"><dt className="sr-only">WhatsApp</dt><WhatsAppIcon size={16} className="shrink-0 text-slate-400" /><dd className="text-slate-700">{displayPhone(b.phone)}</dd></div>
      </dl>
      {b.message && <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">“{b.message}”</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a href={waLink(b.phone, waText)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#25D366] px-3 text-sm font-bold text-[#062e16]">
          <WhatsAppIcon size={16} /> Chat pelanggan
        </a>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Ubah status">
          {BOOKING_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={saving}
              aria-pressed={status === s}
              onClick={() => {
                if (s === status) return;
                setStatus(s);
                void save(s, note);
              }}
              className={cn('h-10 rounded-lg px-3 text-sm font-semibold ring-1', status === s ? STATUS_META[s].cls : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}
            >
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-600">Catatan internal {b.admin_note ? '(ada)' : ''}</summary>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={2} placeholder="Mis. DP sudah masuk, minta tambah 2 mic" className="flex-1 rounded-lg border border-slate-300 p-2.5 text-sm" aria-label="Catatan internal" />
          <div className="flex gap-2 sm:flex-col">
            <AdminButton type="button" variant="secondary" loading={saving} onClick={() => save(status, note)}>
              <Save className="h-4 w-4" aria-hidden /> Simpan
            </AdminButton>
            <ConfirmDelete
              onConfirm={async () => {
                const res = await deleteBooking(b.id);
                if (!res.ok) return toast('error', res.message ?? 'Gagal menghapus.');
                toast('success', 'Booking dihapus.');
                onDeleted(b.id);
              }}
            />
          </div>
        </div>
      </details>
    </Card>
  );
}

export function BookingInbox({ bookings, current, businessName, counts }: { bookings: Booking[]; current?: BookingStatus; businessName: string; counts: Record<string, number> }) {
  const [rows, setRows] = useState(bookings);
  const tabs: { key: string; label: string; href: string }[] = [
    { key: 'all', label: 'Semua', href: '/admin/booking' },
    ...BOOKING_STATUSES.map((s) => ({ key: s, label: STATUS_META[s].label, href: `/admin/booking?status=${s}` })),
  ];
  return (
    <div>
      <nav aria-label="Filter status" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {tabs.map((t) => {
          const isActive = (current ?? 'all') === t.key;
          return (
            <Link key={t.key} href={t.href} aria-current={isActive ? 'page' : undefined} className={cn('inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold', isActive ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200')}>
              {t.label}
              <span className={cn('rounded-full px-1.5 text-xs', isActive ? 'bg-white/20' : 'bg-slate-100')}>{counts[t.key] ?? 0}</span>
            </Link>
          );
        })}
      </nav>
      {rows.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <Inbox className="h-10 w-10 text-slate-300" aria-hidden />
          <p className="mt-3 font-semibold text-slate-800">Tidak ada booking{current ? ` dengan status "${STATUS_META[current].label}"` : ''}</p>
          <p className="mt-1 text-sm text-slate-500">Booking dari form di halaman Kontak akan muncul di sini.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <BookingCard key={b.id} b={b} businessName={businessName} onDeleted={(id) => setRows((r) => r.filter((x) => x.id !== id))} />
          ))}
        </div>
      )}
    </div>
  );
}
