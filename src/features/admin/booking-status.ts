import type { BookingStatus } from '@/features/content/types';

export const STATUS_META: Record<BookingStatus, { label: string; cls: string }> = {
  baru: { label: 'Baru', cls: 'bg-sky-100 text-sky-800 ring-sky-200' },
  dihubungi: { label: 'Dihubungi', cls: 'bg-amber-100 text-amber-800 ring-amber-200' },
  deal: { label: 'Deal', cls: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  batal: { label: 'Batal', cls: 'bg-slate-200 text-slate-700 ring-slate-300' },
};
