import type { Metadata } from 'next';
import { getPublicSnapshot } from '@/server/data/public';
import { PageHero, SectionHeading } from '@/features/public/components/Section';
import { TestimonialList } from '@/features/public/components/Testimonials';
import { CtaBand } from '@/features/public/components/CtaBand';
import { displayPhone, waLink } from '@/shared/lib/whatsapp';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { settings: s } = await getPublicSnapshot();
  return {
    title: 'Tentang Kami',
    description: `Mengenal ${s.business_name}: ${s.description}`.slice(0, 160),
    alternates: { canonical: '/tentang' },
  };
}

const isFilled = (v: string) => Boolean(v) && !v.startsWith('[ISI');

export default async function TentangPage() {
  const snap = await getPublicSnapshot();
  const s = snap.settings;
  const facts: [string, string][] = [];
  if (isFilled(s.service_area)) facts.push(['Area layanan', s.service_area]);
  if (s.opening_hours) facts.push(['Jam layanan', s.opening_hours]);
  if (isFilled(s.address)) facts.push(['Alamat', s.address]);
  if (s.whatsapp) facts.push(['WhatsApp', displayPhone(s.whatsapp)]);
  if (snap.packages.length) facts.push(['Paket tersedia', `${snap.packages.length} paket`]);

  return (
    <>
      <PageHero eyebrow="Tentang kami" title={s.business_name} description={s.tagline.replace(/\s*\|\s*/g, ' ')} />
      <section className="py-12 sm:py-20">
        <div className="container-page grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-20">
          <div className="max-w-2xl space-y-5 whitespace-pre-line text-xl leading-relaxed text-ink-300">{s.about || s.description}</div>
          {facts.length > 0 && (
            <dl className="self-start border-b border-ink-800">
              {facts.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 border-t border-ink-800 py-3.5">
                  <dt className="label-mono pt-1 text-ink-600">{k}</dt>
                  <dd className={k === 'WhatsApp' ? 'font-mono text-ink-100' : 'text-ink-100'}>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>
      {snap.testimonials.length > 0 && (
        <section className="pb-16 sm:pb-24">
          <div className="container-page">
            <SectionHeading title="Kata pelanggan" />
            <TestimonialList items={snap.testimonials} />
          </div>
        </section>
      )}
      <CtaBand waHref={waLink(s.whatsapp, s.wa_default_message)} phone={s.whatsapp} />
    </>
  );
}
