import type { Metadata } from 'next';
import { getPublicSnapshot } from '@/server/data/public';
import { SiteHeader } from '@/features/public/components/SiteHeader';
import { SiteFooter } from '@/features/public/components/SiteFooter';
import { FloatingWhatsApp } from '@/features/public/components/FloatingWhatsApp';
import { JsonLd } from '@/features/public/components/JsonLd';
import { displayPhone, waLink } from '@/shared/lib/whatsapp';
import { localBusinessJsonLd } from '@/features/public/seo';
import { driveImageUrl } from '@/shared/lib/drive-image';
import { Tracker } from '@/features/analytics/Tracker';

export async function generateMetadata(): Promise<Metadata> {
  const { settings: s } = await getPublicSnapshot();
  const title = `${s.business_name} — ${(s.tagline || 'Sewa Sound System').replace(/\s*\|\s*/g, ' ')}`;
  const description =
    s.description || `${s.business_name}: sewa sound system untuk hajatan, pernikahan, acara kampung, sekolah & kantor.`;
  return {
    title: { default: title, template: `%s | ${s.business_name}` },
    description,
    keywords: ['sewa sound system', 'rental sound', 'sound hajatan', 'sound nikahan', 'sewa sound acara', s.business_name],
    openGraph: {
      type: 'website',
      locale: 'id_ID',
      siteName: s.business_name,
      title,
      description,
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: '/' },
    icons: s.logo_id ? { icon: driveImageUrl(s.logo_id, 128) } : undefined,
  };
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { settings: s } = await getPublicSnapshot();
  const wa = waLink(s.whatsapp, s.wa_default_message || `Halo ${s.business_name}, saya ingin bertanya.`);
  return (
    <div className="flex min-h-dvh flex-col bg-ink-950 text-ink-100">
      <a href="#konten" className="sr-only z-[70] bg-brand-400 px-4 py-2 font-semibold text-ink-950 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Lewati ke konten
      </a>
      <JsonLd data={localBusinessJsonLd(s)} />
      <SiteHeader name={s.business_name} logoId={s.logo_id} waHref={wa} phone={displayPhone(s.whatsapp)} />
      <main id="konten" className="flex-1">
        {children}
      </main>
      <SiteFooter s={s} />
      {s.whatsapp && <FloatingWhatsApp href={wa} />}
      <Tracker />
    </div>
  );
}
