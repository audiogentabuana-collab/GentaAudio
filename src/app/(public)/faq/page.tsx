import type { Metadata } from 'next';
import { getPublicSnapshot } from '@/server/data/public';
import { EmptyState, PageHero } from '@/features/public/components/Section';
import { FaqList } from '@/features/public/components/FaqList';
import { JsonLd } from '@/features/public/components/JsonLd';
import { CtaBand } from '@/features/public/components/CtaBand';
import { faqJsonLd } from '@/features/public/seo';
import { waLink } from '@/shared/lib/whatsapp';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'FAQ — Pertanyaan Umum',
  description: 'Jawaban atas pertanyaan yang sering diajukan seputar sewa sound system: cara pesan, DP, operator, area layanan, dan lainnya.',
  alternates: { canonical: '/faq' },
};

export default async function FaqPage() {
  const snap = await getPublicSnapshot();
  const s = snap.settings;
  return (
    <>
      {snap.faqs.length > 0 && <JsonLd data={faqJsonLd(snap.faqs)} />}
      <PageHero eyebrow="FAQ" title="Pertanyaan yang sering diajukan" />
      <section className="py-10 sm:py-14">
        <div className="container-page max-w-4xl">{snap.faqs.length ? <FaqList items={snap.faqs} /> : <EmptyState title="Belum ada FAQ" />}</div>
      </section>
      <CtaBand waHref={waLink(s.whatsapp, s.wa_default_message)} phone={s.whatsapp} />
    </>
  );
}
