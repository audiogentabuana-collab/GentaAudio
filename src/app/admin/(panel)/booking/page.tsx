import type { Metadata } from 'next';
import { BOOKING_STATUSES, type BookingStatus } from '@/features/content/types';
import { BookingInbox } from '@/features/admin/components/BookingInbox';
import { PageHeader } from '@/features/admin/components/ui';
import { adminBookings, adminSettings } from '@/server/data/admin';

export const metadata: Metadata = { title: 'Inbox Booking' };

export default async function BookingPage({ searchParams }: PageProps<'/admin/booking'>) {
  const sp = await searchParams;
  const status = BOOKING_STATUSES.includes(sp.status as BookingStatus) ? (sp.status as BookingStatus) : undefined;
  const [all, settings] = await Promise.all([adminBookings(), adminSettings()]);
  const counts: Record<string, number> = { all: all.length };
  BOOKING_STATUSES.forEach((s) => (counts[s] = all.filter((b) => b.status === s).length));
  const rows = status ? all.filter((b) => b.status === status) : all;
  return (
    <div>
      <PageHeader title="Inbox Booking" description="Permintaan dari form booking di website. Hubungi pelanggan lalu ubah statusnya." />
      <BookingInbox key={`${status}-${rows.map((r) => r.id + r.updated_at).join()}`} bookings={rows} current={status} counts={counts} businessName={settings.business_name} />
    </div>
  );
}
