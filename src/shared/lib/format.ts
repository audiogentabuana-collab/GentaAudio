import type { PriceUnit } from '@/features/content/types';

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

export function formatRupiah(n: number) {
  return rupiah.format(Number.isFinite(n) ? n : 0).replace(/ /g, ' ');
}

export const PRICE_UNIT_LABEL: Record<PriceUnit, string> = {
  per_acara: 'per acara',
  per_hari: 'per hari',
};

export function formatDateId(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00+07:00' : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', ...opts }).format(d);
}

export function formatDateTimeId(iso: string) {
  return formatDateId(iso, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function omit<T extends Record<string, unknown>>(obj: T, key: string): T {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}
