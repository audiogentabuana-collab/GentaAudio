import type { Metadata } from 'next';
import { getPublicSnapshot } from '@/server/data/public';
import { PageHero, SectionHeading } from '@/features/public/components/Section';
import { PricelistBrowser } from '@/features/public/components/PricelistBrowser';
import { CtaBand } from '@/features/public/components/CtaBand';
import { JsonLd } from '@/features/public/components/JsonLd';
import { breadcrumbJsonLd } from '@/features/public/seo';
import { formatRupiah, PRICE_UNIT_LABEL } from '@/shared/lib/format';
import { packageWaMessage, waLink } from '@/shared/lib/whatsapp';
import { siteUrl } from '@/shared/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Daftar Harga Sewa Sound System',
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
      <PageHero eyebrow="Daftar harga" title="Paket sewa sound system" description="Pilih sesuai jenis acara dan jumlah tamu. Tombol “Pesan” membuka WhatsApp dengan nama paket yang sudah terisi." />
      <section className="py-10 sm:py-14">
        <div className="container-page">
          <PricelistBrowser categories={snap.categories} packages={snap.packages} waLinks={waLinks} />
          {s.price_note && <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ink-400">* {s.price_note}</p>}
        </div>
      </section>

      {snap.equipment.length > 0 && (
        <section className="pb-16 sm:pb-24" id="sewa-satuan">
          <div className="container-page">
            <SectionHeading title="Sewa satuan" description="Alat yang bisa disewa terpisah atau ditambahkan ke paket." />
            <table className="w-full border-b border-ink-800 text-left">
              <thead className="sr-only">
                <tr>
                  <th>Alat</th>
                  <th>Harga</th>
                </tr>
              </thead>
              <tbody>
                {snap.equipment.map((e) => (
                  <tr key={e.id} className="border-t border-ink-800 align-baseline">
                    <td className="py-4 pr-4">
                      <span className="text-ink-100">{e.name}</span>
                      {e.description && <span className="mt-0.5 block text-sm text-ink-400">{e.description}</span>}
                    </td>
                    <td className="whitespace-nowrap py-4 text-right">
                      <span className="font-mono text-ink-100">{formatRupiah(e.price)}</span>
                      <span className="label-mono block text-ink-600">{e.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <CtaBand waHref={waLink(s.whatsapp, s.wa_default_message)} phone={s.whatsapp} />
    </>
  );
}
