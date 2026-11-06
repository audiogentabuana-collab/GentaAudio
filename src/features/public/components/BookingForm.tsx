'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarCheck, CircleAlert, CircleCheck, LoaderCircle, Send } from 'lucide-react';
import type { Package } from '@/features/content/types';
import { submitBooking, type BookingState } from '@/features/public/actions';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { cn, formatDateId, formatRupiah } from '@/shared/lib/format';
import { waLink } from '@/shared/lib/whatsapp';

const initial: BookingState = { status: 'idle' };

const inputCls =
  'block w-full rounded-lg border bg-ink-950 px-4 py-3 text-base text-ink-100 placeholder:text-ink-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30';

function Field({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-100">
        {label} {required && <span className="text-brand-400">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-sm text-red-400">
          <CircleAlert className="h-4 w-4 shrink-0" aria-hidden /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function BookingForm({
  packages,
  whatsapp,
  businessName,
  minDate,
}: {
  packages: Package[];
  whatsapp: string;
  businessName: string;
  minDate: string;
}) {
  const [state, dispatch, pending] = useActionState(submitBooking, initial);
  const mountedAt = useRef(0);
  const params = useSearchParams();
  const preselectSlug = params.get('paket');
  const preselectId = packages.find((p) => p.slug === preselectSlug)?.id ?? '';

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const action = (fd: FormData) => {
    fd.set('started_at', String(mountedAt.current || Date.now()));
    dispatch(fd);
  };

  if (state.status === 'success') {
    const s = state.summary;
    const text = s
      ? `Halo ${businessName}, saya ${s.name} baru saja mengirim form booking untuk acara tanggal ${formatDateId(s.event_date)} di ${s.location}. Mohon konfirmasinya.`
      : `Halo ${businessName}, saya baru saja mengirim form booking.`;
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center sm:p-8" role="status">
        <CircleCheck className="mx-auto h-12 w-12 text-emerald-400" aria-hidden />
        <h3 className="mt-4 text-xl font-bold text-ink-100">Booking terkirim, terima kasih!</h3>
        <p className="mx-auto mt-2 max-w-md text-ink-300">
          Tim kami akan segera menghubungi Anda. Agar lebih cepat, Anda juga bisa langsung konfirmasi lewat WhatsApp.
        </p>
        <a
          href={waLink(whatsapp, text)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-lg bg-[#25D366] px-6 font-bold text-[#062e16]"
        >
          <WhatsAppIcon size={20} /> Konfirmasi via WhatsApp
        </a>
      </div>
    );
  }

  const v = state.values ?? {};
  const e = state.errors ?? {};
  const err = (k: string) => (e[k] ? { 'aria-invalid': true as const, 'aria-describedby': `${k}-error` } : {});
  const border = (k: string) => (e[k] ? 'border-red-500/70' : 'border-ink-700');

  return (
    <form action={action} noValidate className="space-y-5" aria-describedby={state.message ? 'booking-message' : undefined}>
      {state.status === 'error' && state.message && (
        <div id="booking-message" role="alert" className="flex gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          <CircleAlert className="h-5 w-5 shrink-0" aria-hidden /> {state.message}
        </div>
      )}

      {/* Honeypot: disembunyikan dari manusia, sering diisi bot */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Nama lengkap" error={e.name} required>
          <input id="name" name="name" autoComplete="name" defaultValue={v.name} maxLength={100} required className={cn(inputCls, border('name'))} placeholder="Nama Anda" {...err('name')} />
        </Field>
        <Field id="phone" label="Nomor WhatsApp" error={e.phone} hint="Kami akan menghubungi lewat nomor ini" required>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={v.phone} maxLength={20} required className={cn(inputCls, border('phone'))} placeholder="0812xxxxxxx" {...err('phone')} />
        </Field>
        <Field id="event_date" label="Tanggal acara" error={e.event_date} required>
          <input id="event_date" name="event_date" type="date" min={minDate} defaultValue={v.event_date} required className={cn(inputCls, border('event_date'), '[color-scheme:dark]')} {...err('event_date')} />
        </Field>
        <Field id="package_id" label="Paket yang diminati" error={e.package_id}>
          <select id="package_id" name="package_id" defaultValue={v.package_id ?? preselectId} key={preselectId} className={cn(inputCls, border('package_id'))}>
            <option value="">Belum tahu / minta rekomendasi</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatRupiah(p.price)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field id="location" label="Lokasi acara" error={e.location} hint="Desa/kelurahan, kecamatan, kota" required>
        <input id="location" name="location" autoComplete="street-address" defaultValue={v.location} maxLength={250} required className={cn(inputCls, border('location'))} placeholder="Contoh: Gedung Serbaguna Desa Sukamaju" {...err('location')} />
      </Field>
      <Field id="message" label="Catatan" error={e.message} hint="Jenis acara, perkiraan jumlah tamu, kebutuhan khusus">
        <textarea id="message" name="message" rows={4} defaultValue={v.message} maxLength={2000} className={cn(inputCls, border('message'))} placeholder="Contoh: Resepsi nikah ±300 tamu, butuh 4 mic wireless" {...err('message')} />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-brand-400 px-6 text-base font-bold text-ink-950 hover:bg-brand-300 disabled:opacity-70 sm:w-auto"
      >
        {pending ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-5 w-5" aria-hidden />}
        {pending ? 'Mengirim...' : 'Kirim Booking'}
      </button>
      <p className="flex items-center gap-2 text-xs text-ink-400">
        <CalendarCheck className="h-4 w-4" aria-hidden /> Booking belum mengikat sampai dikonfirmasi oleh tim kami.
      </p>
    </form>
  );
}
