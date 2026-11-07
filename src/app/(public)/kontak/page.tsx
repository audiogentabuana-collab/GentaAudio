import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getPublicSnapshot } from '@/server/data/public';
import { PageHero } from '@/features/public/components/Section';
import { WhatsAppComposer } from '@/features/public/components/WhatsAppComposer';
import { SocialLinks } from '@/features/public/components/SiteFooter';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { displayPhone, waLink } from '@/shared/lib/whatsapp';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Kontak & Pemesanan',
  description: 'Hubungi kami via WhatsApp untuk mengecek ketersediaan tanggal sewa sound system. Pesan bisa disusun otomatis dari halaman ini.',
  alternates: { canonical: '/kontak' },
};

const isFilled = (v: string) => Boolean(v) && !v.startsWith('[ISI');

export default async function KontakPage() {
  const snap = await getPublicSnapshot();
  const s = snap.settings;
  const minDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const rows: [string, React.ReactNode][] = [];
  if (s.phone && s.phone !== s.whatsapp) rows.push(['Telepon', <a key="t" href={`tel:+${s.phone}`} className="font-mono hover:text-brand-400">{displayPhone(s.phone)}</a>]);
  if (s.email) rows.push(['Email', <a key="e" href={`mailto:${s.email}`} className="break-all hover:text-brand-400">{s.email}</a>]);
  if (isFilled(s.address)) rows.push(['Alamat', s.address]);
  if (isFilled(s.service_area)) rows.push(['Area', s.service_area]);
  if (s.opening_hours) rows.push(['Jam', s.opening_hours]);

  return (
    <>
      <PageHero eyebrow="Kontak" title="Cek ketersediaan tanggal" description="Semua pemesanan lewat WhatsApp. Isi detail acara di bawah agar pesannya tersusun otomatis, atau langsung chat." />
      <section className="py-10 sm:py-16">
        <div className="container-page grid gap-14 lg:grid-cols-[1.4fr_1fr] lg:gap-20">
          <div id="booking" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight text-ink-100">Susun pesan WhatsApp</h2>
            <Suspense fallback={<div className="mt-6 h-96 bg-ink-900" />}>
              <WhatsAppComposer packages={snap.packages} whatsapp={s.whatsapp} businessName={s.business_name} minDate={minDate} />
            </Suspense>
          </div>
          <aside className="space-y-8">
            <div>
              <p className="label-mono text-ink-600">WhatsApp</p>
              <a href={waLink(s.whatsapp, s.wa_default_message)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-3 text-ink-100 hover:text-brand-400">
                <WhatsAppIcon size={22} />
                <span className="font-mono text-2xl">{displayPhone(s.whatsapp) || 'Chat WhatsApp'}</span>
              </a>
            </div>
            {rows.length > 0 && (
              <dl className="border-b border-ink-800">
                {rows.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[6rem_1fr] gap-3 border-t border-ink-800 py-3">
                    <dt className="label-mono pt-0.5 text-ink-600">{k}</dt>
                    <dd className="text-ink-300">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <SocialLinks s={s} className="text-ink-400" />
            {(s.maps_embed_url || s.maps_url) && (
              <div>
                {s.maps_embed_url && (
                  <iframe
                    src={s.maps_embed_url}
                    title={`Lokasi ${s.business_name} di Google Maps`}
                    className="aspect-[4/3] w-full rounded-[3px] border-0 grayscale"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                )}
                {s.maps_url && (
                  <a href={s.maps_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-ink-100 underline decoration-ink-600 underline-offset-4 hover:decoration-brand-400">
                    Buka di Google Maps ↗
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
