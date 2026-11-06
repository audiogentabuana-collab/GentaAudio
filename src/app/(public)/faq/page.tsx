import type { Metadata } from 'next';
import { CircleHelp } from 'lucide-react';
import { getPublicSnapshot } from '@/server/data/public';
import { EmptyState, PageHero } from '@/features/public/components/Section';
import { FaqList } from '@/features/public/components/FaqList';
import { JsonLd } from '@/features/public/components/JsonLd';
import { faqJsonLd } from '@/features/public/seo';
import { ButtonLink } from '@/shared/components/ui/Button';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
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
      <PageHero eyebrow="FAQ" title="Pertanyaan yang sering diajukan" description="Belum menemukan jawaban? Tanyakan langsung lewat WhatsApp." />
      <section className="py-10 sm:py-14">
        <div className="container-page max-w-3xl">
          {snap.faqs.length ? <FaqList items={snap.faqs} /> : <EmptyState icon={<CircleHelp className="h-10 w-10" />} title="Belum ada FAQ" />}
          <div className="mt-8 flex flex-col items-start gap-3 rounded-xl border border-ink-800 bg-ink-900 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-ink-100">Masih ada pertanyaan?</p>
            <ButtonLink href={waLink(s.whatsapp, s.wa_default_message)} external variant="whatsapp">
              <WhatsAppIcon size={18} /> Tanya via WhatsApp
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
