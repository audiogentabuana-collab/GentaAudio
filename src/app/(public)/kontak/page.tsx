import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Clock, Mail, MapPin, Navigation, Phone } from 'lucide-react';
import { getPublicSnapshot } from '@/server/data/public';
import { PageHero } from '@/features/public/components/Section';
import { BookingForm } from '@/features/public/components/BookingForm';
import { SocialLinks } from '@/features/public/components/SiteFooter';
import { ButtonLink } from '@/shared/components/ui/Button';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { displayPhone, waLink } from '@/shared/lib/whatsapp';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Kontak & Booking',
  description: 'Hubungi kami via WhatsApp atau isi form booking untuk mengecek ketersediaan tanggal sewa sound system.',
  alternates: { canonical: '/kontak' },
};

export default async function KontakPage() {
  const snap = await getPublicSnapshot();
  const s = snap.settings;
  const minDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  return (
    <>
      <PageHero eyebrow="Kontak & booking" title="Cek ketersediaan tanggal" description="Isi form di bawah atau chat kami langsung. Kami biasanya membalas dalam hitungan menit pada jam operasional." />
      <section className="py-10 sm:py-14">
        <div className="container-page grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div id="booking" className="scroll-mt-20 rounded-xl border border-ink-800 bg-ink-900 p-5 sm:p-8">
            <h2 className="mb-6 text-xl font-bold text-ink-100">Form booking</h2>
            <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-ink-850" />}>
              <BookingForm packages={snap.packages} whatsapp={s.whatsapp} businessName={s.business_name} minDate={minDate} />
            </Suspense>
          </div>
          <aside className="space-y-5">
            <div className="rounded-xl border border-ink-800 bg-ink-900 p-5">
              <h2 className="text-lg font-bold text-ink-100">Lebih cepat via WhatsApp</h2>
              <p className="mt-1 text-sm text-ink-400">Kirim tanggal, lokasi, dan jenis acara Anda.</p>
              <ButtonLink href={waLink(s.whatsapp, s.wa_default_message)} external variant="whatsapp" size="lg" className="mt-4 w-full">
                <WhatsAppIcon size={20} /> {displayPhone(s.whatsapp) || 'Chat WhatsApp'}
              </ButtonLink>
              <ul className="mt-5 space-y-3 text-sm text-ink-300">
                {s.phone && (
                  <li className="flex gap-3">
                    <Phone className="h-5 w-5 shrink-0 text-brand-400" aria-hidden />
                    <a href={`tel:+${s.phone}`} className="hover:text-brand-400">{displayPhone(s.phone)}</a>
                  </li>
                )}
                {s.email && (
                  <li className="flex gap-3">
                    <Mail className="h-5 w-5 shrink-0 text-brand-400" aria-hidden />
                    <a href={`mailto:${s.email}`} className="break-all hover:text-brand-400">{s.email}</a>
                  </li>
                )}
                {s.address && (
                  <li className="flex gap-3">
                    <MapPin className="h-5 w-5 shrink-0 text-brand-400" aria-hidden /> {s.address}
                  </li>
                )}
                {s.opening_hours && (
                  <li className="flex gap-3">
                    <Clock className="h-5 w-5 shrink-0 text-brand-400" aria-hidden /> {s.opening_hours}
                  </li>
                )}
              </ul>
              <SocialLinks s={s} className="mt-5" />
            </div>
            {(s.maps_embed_url || s.maps_url) && (
              <div className="overflow-hidden rounded-xl border border-ink-800 bg-ink-900">
                {s.maps_embed_url && (
                  <iframe
                    src={s.maps_embed_url}
                    title={`Lokasi ${s.business_name} di Google Maps`}
                    className="aspect-[4/3] w-full border-0 grayscale-[30%]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                )}
                {s.maps_url && (
                  <a href={s.maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 p-4 text-sm font-semibold text-brand-400 hover:text-brand-300">
                    <Navigation className="h-4 w-4" aria-hidden /> Buka di Google Maps
                  </a>
                )}
              </div>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
