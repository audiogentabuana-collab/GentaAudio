import type { Metadata } from 'next';
import { Clock, MapPin, Sparkles } from 'lucide-react';
import { getPublicSnapshot } from '@/server/data/public';
import { PageHero, SectionHeading } from '@/features/public/components/Section';
import { TestimonialList } from '@/features/public/components/Testimonials';
import { CtaBand } from '@/features/public/components/CtaBand';
import { waLink } from '@/shared/lib/whatsapp';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { settings: s } = await getPublicSnapshot();
  return {
    title: 'Tentang Kami',
    description: `Mengenal ${s.business_name}: ${s.description}`.slice(0, 160),
    alternates: { canonical: '/tentang' },
  };
}

export default async function TentangPage() {
  const snap = await getPublicSnapshot();
  const s = snap.settings;
  const stats = [
    { value: `${snap.packages.length}+`, label: 'Pilihan paket' },
    { value: `${snap.gallery.length}+`, label: 'Acara terdokumentasi' },
    { value: `${snap.equipment.length}+`, label: 'Jenis peralatan' },
  ];
  return (
    <>
      <PageHero eyebrow="Tentang kami" title={`Mengenal ${s.business_name}`} description={s.tagline} />
      <section className="py-12 sm:py-16">
        <div className="container-page grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4 whitespace-pre-line text-lg leading-relaxed text-ink-300">{s.about || s.description}</div>
          <aside className="space-y-4">
            <ul className="grid grid-cols-3 gap-3">
              {stats.map((st) => (
                <li key={st.label} className="rounded-xl border border-ink-800 bg-ink-900 p-4 text-center">
                  <p className="text-2xl font-semibold text-brand-400">{st.value}</p>
                  <p className="mt-1 text-xs text-ink-400">{st.label}</p>
                </li>
              ))}
            </ul>
            <div className="space-y-4 rounded-xl border border-ink-800 bg-ink-900 p-5 text-sm">
              {s.service_area && (
                <p className="flex gap-3 text-ink-300">
                  <MapPin className="h-5 w-5 shrink-0 text-brand-400" aria-hidden />
                  <span>
                    <span className="block font-semibold text-ink-100">Area layanan</span>
                    {s.service_area}
                  </span>
                </p>
              )}
              {s.opening_hours && (
                <p className="flex gap-3 text-ink-300">
                  <Clock className="h-5 w-5 shrink-0 text-brand-400" aria-hidden />
                  <span>
                    <span className="block font-semibold text-ink-100">Jam operasional</span>
                    {s.opening_hours}
                  </span>
                </p>
              )}
              <p className="flex gap-3 text-ink-300">
                <Sparkles className="h-5 w-5 shrink-0 text-brand-400" aria-hidden />
                <span>
                  <span className="block font-semibold text-ink-100">Komitmen kami</span>
                  Peralatan terawat, operator berpengalaman, dan harga yang jelas sejak awal.
                </span>
              </p>
            </div>
          </aside>
        </div>
      </section>
      {snap.testimonials.length > 0 && (
        <section className="border-t border-ink-800 py-12 sm:py-16">
          <div className="container-page">
            <SectionHeading eyebrow="Testimoni" title="Dipercaya pelanggan" />
            <TestimonialList items={snap.testimonials} />
          </div>
        </section>
      )}
      <CtaBand waHref={waLink(s.whatsapp, s.wa_default_message)} />
    </>
  );
}
