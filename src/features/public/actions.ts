'use server';

import { bookingSchema, fieldErrors } from '@/features/content/schemas';
import { gas, GasError, userMessage } from '@/server/gas/client';
import { clientIp } from '@/server/http/ip';

export interface BookingState {
  status: 'idle' | 'success' | 'error';
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
  summary?: { name: string; event_date: string; location: string };
}

const FIELDS = ['name', 'phone', 'event_date', 'location', 'package_id', 'message'] as const;
const MIN_FILL_MS = 2500;

export async function submitBooking(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const values = Object.fromEntries(FIELDS.map((k) => [k, String(formData.get(k) ?? '').slice(0, 3000)])) as Record<
    (typeof FIELDS)[number],
    string
  >;

  // Anti-spam: honeypot (field tersembunyi yang hanya diisi bot) + waktu pengisian minimum.
  if (String(formData.get('website') ?? '')) {
    return { status: 'success', summary: { name: values.name, event_date: values.event_date, location: values.location } };
  }
  const startedAt = Number(formData.get('started_at'));
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FILL_MS) {
    return { status: 'error', message: 'Form terkirim terlalu cepat. Mohon periksa isian lalu kirim ulang.', values };
  }

  const parsed = bookingSchema.safeParse(values);
  if (!parsed.success) {
    return { status: 'error', message: 'Periksa kembali isian yang ditandai.', errors: fieldErrors(parsed.error), values };
  }

  try {
    await gas('bookings.create', { ...parsed.data, ip: await clientIp() });
  } catch (err) {
    const errors = err instanceof GasError ? err.fieldErrors : undefined;
    return { status: 'error', message: userMessage(err), errors, values };
  }

  return {
    status: 'success',
    summary: { name: parsed.data.name, event_date: parsed.data.event_date, location: parsed.data.location },
  };
}
