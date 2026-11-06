import type { Metadata } from 'next';
import { getPublicSnapshot } from '@/server/data/public';
import { PageHero } from '@/features/public/components/Section';
import { GalleryGrid } from '@/features/public/components/GalleryGrid';
import { CtaBand } from '@/features/public/components/CtaBand';
import { waLink } from '@/shared/lib/whatsapp';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Galeri & Portofolio Acara',
  description: 'Dokumentasi acara yang menggunakan sound system kami: pernikahan, hajatan, panggung hiburan, acara sekolah dan kantor.',
  alternates: { canonical: '/galeri' },
};

export default async function GaleriPage() {
  const snap = await getPublicSnapshot();
  return (
    <>
      <PageHero eyebrow="Portofolio" title="Galeri acara" description="Beberapa acara yang sudah kami tangani. Ketuk foto untuk melihat lebih besar." />
      <section className="py-10 sm:py-14">
        <div className="container-page">
          <GalleryGrid items={snap.gallery} />
        </div>
      </section>
      <CtaBand waHref={waLink(snap.settings.whatsapp, snap.settings.wa_default_message)} />
    </>
  );
}
