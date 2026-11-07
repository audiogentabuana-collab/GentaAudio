import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPackageBySlug, getPublicSnapshot } from '@/server/data/public';
import { PackageGallery } from '@/features/public/components/PackageGallery';
import { PriceList } from '@/features/public/components/PriceList';
import { SectionHeading } from '@/features/public/components/Section';
import { JsonLd } from '@/features/public/components/JsonLd';
import { breadcrumbJsonLd, packageJsonLd } from '@/features/public/seo';
import { ButtonLink } from '@/shared/components/ui/Button';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { driveImageUrl } from '@/shared/lib/drive-image';
import { cn, formatRupiah, PRICE_UNIT_LABEL } from '@/shared/lib/format';
import { packageWaMessage, waLink } from '@/shared/lib/whatsapp';
import { siteUrl } from '@/shared/lib/site';

export const revalidate = 3600;

export async function generateStaticParams() {
  const snap = await getPublicSnapshot();
  return snap.packages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<'/pricelist/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const found = await getPackageBySlug(slug);
  if (!found) return { title: 'Paket tidak ditemukan', robots: { index: false } };
  const { pkg } = found;
  const description = `${pkg.name} — ${formatRupiah(pkg.price)} ${PRICE_UNIT_LABEL[pkg.price_unit]}. ${pkg.capacity ? pkg.capacity + '. ' : ''}${pkg.description}`.slice(0, 160);
  return {
    title: `${pkg.name} — ${formatRupiah(pkg.price)}`,
    description,
    alternates: { canonical: `/pricelist/${pkg.slug}` },
    openGraph: {
      title: pkg.name,
      description,
      url: `/pricelist/${pkg.slug}`,
      ...(pkg.image_ids[0] ? { images: [{ url: driveImageUrl(pkg.image_ids[0], 1200), width: 1200, alt: pkg.name }] } : {}),
    },
  };
}

export default async function PackageDetailPage({ params }: PageProps<'/pricelist/[slug]'>) {
  const { slug } = await params;
  const found = await getPackageBySlug(slug);
  if (!found) notFound();
  const { pkg, category, snap } = found;
  const s = snap.settings;
  const priceLabel = `${formatRupiah(pkg.price)} ${PRICE_UNIT_LABEL[pkg.price_unit]}`;
  const wa = waLink(s.whatsapp, packageWaMessage({ businessName: s.business_name, packageName: pkg.name, price: priceLabel, url: siteUrl(`/pricelist/${pkg.slug}`) }));
  const related = snap.packages.filter((p) => p.id !== pkg.id && p.category_id === pkg.category_id).slice(0, 3);
  const relatedLinks = Object.fromEntries(
    related.map((p) => [
      p.id,
      waLink(s.whatsapp, packageWaMessage({ businessName: s.business_name, packageName: p.name, price: `${formatRupiah(p.price)} ${PRICE_UNIT_LABEL[p.price_unit]}`, url: siteUrl(`/pricelist/${p.slug}`) })),
    ]),
  );
  const hasPhotos = pkg.image_ids.length > 0;

  return (
    <>
      <JsonLd data={packageJsonLd(pkg, s)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Beranda', path: '/' },
          { name: 'Pricelist', path: '/pricelist' },
          { name: pkg.name, path: `/pricelist/${pkg.slug}` },
        ])}
      />
      <div className="container-page pb-16 pt-8 sm:pb-24 sm:pt-12">
        <nav aria-label="Breadcrumb" className="label-mono text-ink-600">
          <Link href="/pricelist" className="hover:text-ink-100">
            Daftar harga
          </Link>
          {category && <span> / {category.name}</span>}
        </nav>

        <div className={cn('mt-8 grid gap-10', hasPhotos && 'lg:grid-cols-2 lg:gap-14')}>
          {hasPhotos && <PackageGallery images={pkg.image_ids} name={pkg.name} />}
          <div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-ink-100 sm:text-5xl">{pkg.name}</h1>
            <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-y border-ink-800 py-4">
              <span className="font-mono text-3xl text-brand-400">{formatRupiah(pkg.price)}</span>
              <span className="label-mono text-ink-400">{PRICE_UNIT_LABEL[pkg.price_unit]}</span>
              {pkg.capacity && <span className="w-full text-ink-300 sm:ml-auto sm:w-auto">{pkg.capacity}</span>}
            </div>
            {pkg.description && <p className="mt-6 max-w-2xl whitespace-pre-line text-lg leading-relaxed text-ink-300">{pkg.description}</p>}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={wa} external size="lg" data-track-pkg={pkg.slug}>
                <WhatsAppIcon size={18} /> Pesan via WhatsApp
              </ButtonLink>
              <ButtonLink href={`/kontak?paket=${encodeURIComponent(pkg.slug)}#booking`} variant="outline" size="lg">
                Isi Detail Acara
              </ButtonLink>
            </div>

            {pkg.specs.length > 0 && (
              <div className="mt-12">
                <p className="label-mono mb-3 text-ink-400">Isi paket</p>
                <dl className="border-b border-ink-800">
                  {pkg.specs.map((sp, i) => (
                    <div key={i} className="grid grid-cols-[2.5rem_8rem_1fr] gap-3 border-t border-ink-800 py-3 sm:grid-cols-[2.5rem_11rem_1fr]">
                      <span className="font-mono text-sm text-ink-600">{String(i + 1).padStart(2, '0')}</span>
                      <dt className="text-ink-400">{sp.label}</dt>
                      <dd className="text-ink-100">{sp.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {s.price_note && <p className="mt-6 text-sm text-ink-600">* {s.price_note}</p>}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="pb-16 sm:pb-24">
          <div className="container-page">
            <SectionHeading title={category ? `Paket ${category.name} lainnya` : 'Paket lainnya'} />
            <PriceList packages={related} categories={snap.categories} waLinks={relatedLinks} />
          </div>
        </section>
      )}

      {/* CTA lengket di bawah layar HP */}
      <div data-sticky-cta className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-950/95 px-5 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-ink-400">{pkg.name}</p>
            <p className="font-mono text-ink-100">{formatRupiah(pkg.price)}</p>
          </div>
          <ButtonLink href={wa} external className="shrink-0" data-track-pkg={pkg.slug}>
            <WhatsAppIcon size={16} /> Pesan
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
