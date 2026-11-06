import type { Metadata } from 'next';
import { Info, Wrench } from 'lucide-react';
import { getPublicSnapshot } from '@/server/data/public';
import { PageHero, SectionHeading } from '@/features/public/components/Section';
import { PricelistBrowser } from '@/features/public/components/PricelistBrowser';
import { CtaBand } from '@/features/public/components/CtaBand';
import { JsonLd } from '@/features/public/components/JsonLd';
import { breadcrumbJsonLd } from '@/features/public/seo';
import { DriveImage } from '@/shared/components/DriveImage';
import { formatRupiah, PRICE_UNIT_LABEL } from '@/shared/lib/format';
import { packageWaMessage, waLink } from '@/shared/lib/whatsapp';
import { siteUrl } from '@/shared/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Pricelist Sewa Sound System',
  description: 'Daftar harga paket sewa sound system untuk hajatan, pernikahan, event panggung, sekolah, dan kantor. Harga jelas, pesan langsung via WhatsApp.',
  alternates: { canonical: '/pricelist' },
};

export default async function PricelistPage() {
  const snap = await getPublicSnapshot();
  const s = snap.settings;
  const waLinks = Object.fromEntries(
    snap.packages.map((p) => [
      p.id,
      waLink(
        s.whatsapp,
        packageWaMessage({
          businessName: s.business_name,
          packageName: p.name,
          price: `${formatRupiah(p.price)} ${PRICE_UNIT_LABEL[p.price_unit]}`,
          url: siteUrl(`/pricelist/${p.slug}`),
        }),
      ),
    ]),
  );

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Beranda', path: '/' }, { name: 'Pricelist', path: '/pricelist' }])} />
      <PageHero eyebrow="Pricelist" title="Paket sewa sound system" description="Pilih paket sesuai jenis acara dan jumlah tamu. Klik “Pesan” untuk langsung chat WhatsApp dengan pesan otomatis." />
      <section className="py-10 sm:py-14">
        <div className="container-page">
          <PricelistBrowser categories={snap.categories} packages={snap.packages} waLinks={waLinks} />
          {s.price_note && (
            <p className="mt-8 flex gap-2 rounded-lg border border-ink-800 bg-ink-900 p-4 text-sm text-ink-400">
              <Info className="h-5 w-5 shrink-0 text-brand-400" aria-hidden /> {s.price_note}
            </p>
          )}
        </div>
      </section>

      {snap.equipment.length > 0 && (
        <section className="border-t border-ink-800 py-12 sm:py-16" id="sewa-satuan">
          <div className="container-page">
            <SectionHeading eyebrow="Sewa satuan" title="Butuh tambahan alat?" description="Peralatan bisa disewa satuan atau ditambahkan ke paket." />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {snap.equipment.map((e) => (
                <li key={e.id} className="flex gap-4 rounded-xl border border-ink-800 bg-ink-900 p-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                    {e.image_id ? (
                      <DriveImage fileId={e.image_id} alt={e.name} sizes="64px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-ink-800 text-ink-400">
                        <Wrench className="h-6 w-6" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-100">{e.name}</p>
                    {e.description && <p className="line-clamp-2 text-sm text-ink-400">{e.description}</p>}
                    <p className="mt-1 font-bold text-brand-400">
                      {formatRupiah(e.price)} <span className="text-xs font-medium text-ink-400">{e.unit}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <CtaBand waHref={waLink(s.whatsapp, s.wa_default_message)} />
    </>
  );
}
