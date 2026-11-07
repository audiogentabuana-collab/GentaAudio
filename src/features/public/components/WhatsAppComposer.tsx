'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Package } from '@/features/content/types';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { formatDateId, formatRupiah, PRICE_UNIT_LABEL } from '@/shared/lib/format';
import { waLink } from '@/shared/lib/whatsapp';

const inputCls =
  'block w-full rounded-[3px] border border-ink-700 bg-ink-900 px-3.5 py-3 text-base text-ink-100 placeholder:text-ink-600 focus:border-brand-400 focus:outline-none';

interface Draft {
  name: string;
  event_date: string;
  location: string;
  event_type: string;
  package_id: string;
  note: string;
}

/** Susun pesan WhatsApp dari isian. Isian kosong dilewati. */
export function buildBookingMessage(businessName: string, d: Draft, pkg?: Package): string {
  const details = [
    d.name && `Nama: ${d.name}`,
    d.event_date && `Tanggal acara: ${formatDateId(d.event_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
    d.location && `Lokasi: ${d.location}`,
    d.event_type && `Jenis acara: ${d.event_type}`,
    pkg && `Paket: ${pkg.name} (${formatRupiah(pkg.price)} ${PRICE_UNIT_LABEL[pkg.price_unit]})`,
    d.note && `Catatan: ${d.note}`,
  ].filter((l): l is string => typeof l === 'string' && l.length > 0);
  return [
    `Halo ${businessName}, saya ingin menanyakan ketersediaan sewa sound system.`,
    ...(details.length ? ['', ...details] : []),
    '',
    'Apakah tanggal tersebut masih tersedia? Terima kasih.',
  ].join('\n');
}

/**
 * Form "Pesan via WhatsApp": TIDAK menyimpan data ke mana pun.
 * Isian hanya dipakai untuk menyusun pesan, lalu pengunjung dibawa ke WhatsApp.
 */
export function WhatsAppComposer({
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
  const params = useSearchParams();
  const preselect = packages.find((p) => p.slug === params.get('paket'))?.id ?? '';
  const [draft, setDraft] = useState<Draft>({ name: '', event_date: '', location: '', event_type: '', package_id: preselect, note: '' });
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  const pkg = packages.find((p) => p.id === draft.package_id);
  const message = buildBookingMessage(businessName, draft, pkg);
  const href = waLink(whatsapp, message);

  return (
    <div className="space-y-6">
      <p className="mt-2 text-ink-400">Semua isian opsional. Tidak ada data yang disimpan di website.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="label-mono mb-2 block text-ink-400">Nama</span>
          <input value={draft.name} onChange={set('name')} autoComplete="name" maxLength={100} placeholder="Nama Anda" className={inputCls} />
        </label>
        <label className="block">
          <span className="label-mono mb-2 block text-ink-400">Tanggal acara</span>
          <input type="date" min={minDate} value={draft.event_date} onChange={set('event_date')} className={`${inputCls} [color-scheme:dark]`} />
        </label>
        <label className="block">
          <span className="label-mono mb-2 block text-ink-400">Lokasi acara</span>
          <input value={draft.location} onChange={set('location')} maxLength={200} placeholder="Desa / kecamatan / kota" className={inputCls} />
        </label>
        <label className="block">
          <span className="label-mono mb-2 block text-ink-400">Jenis acara</span>
          <input value={draft.event_type} onChange={set('event_type')} maxLength={100} placeholder="Nikahan, hajatan, 17-an, sekolah..." className={inputCls} />
        </label>
        <label className="block sm:col-span-2">
          <span className="label-mono mb-2 block text-ink-400">Paket yang diminati</span>
          <select value={draft.package_id} onChange={set('package_id')} className={inputCls}>
            <option value="">Belum tahu / minta rekomendasi</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatRupiah(p.price)}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="label-mono mb-2 block text-ink-400">Catatan</span>
          <textarea value={draft.note} onChange={set('note')} rows={3} maxLength={1000} placeholder="Perkiraan jumlah tamu, kebutuhan khusus, dll." className={inputCls} />
        </label>
      </div>

      <div className="border-l-2 border-brand-400 bg-ink-900 px-4 py-3">
        <p className="label-mono mb-2 text-ink-600">Pratinjau pesan</p>
        <p className="whitespace-pre-line font-mono text-[13px] leading-relaxed text-ink-300" data-testid="wa-preview">
          {message}
        </p>
      </div>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[3px] bg-brand-400 px-5 text-base font-medium text-ink-950 hover:bg-brand-300 sm:w-auto"
      >
        <WhatsAppIcon size={18} /> Kirim via WhatsApp
      </a>
    </div>
  );
}
