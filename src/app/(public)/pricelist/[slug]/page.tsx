import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarCheck, ChevronLeft, CircleCheck, Users } from 'lucide-react';
import { getPackageBySlug, getPublicSnapshot } from '@/server/data/public';
import { PackageGallery } from '@/features/public/components/PackageGallery';
import { PackageCard } from '@/features/public/components/PackageCard';
import { SectionHeading } from '@/features/public/components/Section';
import { JsonLd } from '@/features/public/components/JsonLd';
import { breadcrumbJsonLd, packageJsonLd } from '@/features/public/seo';
import { ButtonLink } from '@/shared/components/ui/Button';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { driveImageUrl } from '@/shared/lib/drive-image';
import { formatRupiah, PRICE_UNIT_LABEL } from '@/shared/lib/format';
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
  const catById = new Map(snap.categories.map((c) => [c.id, c]));

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
      <div className="container-page py-6 sm:py-10">
        <Link href="/pricelist" className="inline-flex items-center gap-1 text-sm font-medium text-ink-400 hover:text-ink-100">
          <ChevronLeft className="h-4 w-4" aria-hidden /> Kembali ke pricelist
        </Link>
        <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <PackageGallery images={pkg.image_ids} name={pkg.name} />
          <div>
            {category && <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-400">{category.name}</p>}
            <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-ink-100 sm:text-4xl">{pkg.name}</h1>
            <p className="mt-4 text-3xl font-semibold text-brand-400">
              {formatRupiah(pkg.price)}
              <span className="ml-2 text-base font-medium text-ink-400">/ {PRICE_UNIT_LABEL[pkg.price_unit]}</span>
            </p>
            {pkg.capacity && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-ink-700 px-3 py-1.5 text-sm text-ink-300">
                <Users className="h-4 w-4 text-brand-400" aria-hidden /> {pkg.capacity}
              </p>
            )}
            {pkg.description && <p className="mt-5 whitespace-pre-line leading-relaxed text-ink-300">{pkg.description}</p>}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={wa} external variant="whatsapp" size="lg">
                <WhatsAppIcon size={20} /> Pesan via WhatsApp
              </ButtonLink>
              <ButtonLink href={`/kontak?paket=${encodeURIComponent(pkg.slug)}#booking`} variant="secondary" size="lg">
                <CalendarCheck className="h-5 w-5" aria-hidden /> Isi Form Booking
              </ButtonLink>
            </div>

            {pkg.specs.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-bold text-ink-100">Spesifikasi lengkap</h2>
                <dl className="mt-3 divide-y divide-ink-800 overflow-hidden rounded-xl border border-ink-800 bg-ink-900">
                  {pkg.specs.map((sp, i) => (
                    <div key={i} className="grid grid-cols-[minmax(6rem,35%)_1fr] gap-3 px-4 py-3 text-sm">
                      <dt className="flex items-start gap-2 font-semibold text-ink-300">
                        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" aria-hidden /> {sp.label}
                      </dt>
                      <dd className="text-ink-100">{sp.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {s.price_note && <p className="mt-4 text-xs text-ink-400">{s.price_note}</p>}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="border-t border-ink-800 py-12 sm:py-16">
          <div className="container-page">
            <SectionHeading title="Paket lain di kategori ini" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PackageCard
                  key={p.id}
                  pkg={p}
                  category={catById.get(p.category_id)}
                  waHref={waLink(s.whatsapp, packageWaMessage({ businessName: s.business_name, packageName: p.name, price: `${formatRupiah(p.price)} ${PRICE_UNIT_LABEL[p.price_unit]}`, url: siteUrl(`/pricelist/${p.slug}`) }))}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA lengket di bawah layar HP */}
      <div data-sticky-cta className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-950/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-ink-400">{pkg.name}</p>
            <p className="font-semibold text-brand-400">{formatRupiah(pkg.price)}</p>
          </div>
          <ButtonLink href={wa} external variant="whatsapp" className="shrink-0">
            <WhatsAppIcon size={18} /> Pesan
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
