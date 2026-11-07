import Link from 'next/link';
import type { Category, Package } from '@/features/content/types';
import { DriveImage } from '@/shared/components/DriveImage';
import { formatRupiah, PRICE_UNIT_LABEL } from '@/shared/lib/format';

/**
 * Daftar harga bergaya price sheet: satu baris per paket, harga rata kanan (mono).
 */
export function PriceRow({
  pkg,
  index,
  category,
  waHref,
}: {
  pkg: Package;
  index: number;
  category?: Category | null;
  waHref: string;
}) {
  const specLine = pkg.specs.map((s) => s.value).join(' / ');
  const cover = pkg.image_ids[0];
  return (
    <li className="grid grid-cols-[2.5rem_1fr] gap-x-3 border-t border-ink-800 py-6 sm:grid-cols-[3rem_1fr_auto] sm:gap-x-6">
      <span className="pt-1 font-mono text-sm text-ink-600">{String(index + 1).padStart(2, '0')}</span>

      <div className="flex min-w-0 gap-4">
        {cover && (
          <Link href={`/pricelist/${pkg.slug}`} tabIndex={-1} aria-hidden className="relative hidden h-20 w-28 shrink-0 overflow-hidden rounded-[3px] bg-ink-850 sm:block">
            <DriveImage fileId={cover} alt="" sizes="112px" />
          </Link>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-xl font-medium text-ink-100">
              <Link href={`/pricelist/${pkg.slug}`} className="hover:text-brand-400">
                {pkg.name}
              </Link>
            </h3>
            {pkg.is_featured && <span className="label-mono text-brand-400">Terlaris</span>}
          </div>
          <p className="mt-1 text-ink-400">
            {[category?.name, pkg.capacity].filter(Boolean).join(' · ')}
          </p>
          {specLine && <p className="mt-2 line-clamp-2 font-mono text-[13px] leading-relaxed text-ink-600">{specLine}</p>}
        </div>
      </div>

      <div className="col-start-2 mt-4 flex items-end justify-between gap-4 sm:col-start-3 sm:mt-0 sm:flex-col sm:items-end sm:justify-start">
        <p className="text-left sm:text-right">
          <span className="block font-mono text-xl text-ink-100">{formatRupiah(pkg.price)}</span>
          <span className="label-mono text-ink-600">{PRICE_UNIT_LABEL[pkg.price_unit]}</span>
        </p>
        <div className="flex items-center gap-4 text-sm sm:mt-3">
          <Link href={`/pricelist/${pkg.slug}`} className="text-ink-400 hover:text-ink-100">
            Detail
          </Link>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Pesan ${pkg.name} via WhatsApp`}
            className="rounded-[3px] border border-ink-600 px-3 py-1.5 text-ink-100 hover:border-brand-400 hover:text-brand-400"
          >
            Pesan
          </a>
        </div>
      </div>
    </li>
  );
}

export function PriceList({
  packages,
  categories,
  waLinks,
}: {
  packages: Package[];
  categories: Category[];
  waLinks: Record<string, string>;
}) {
  const catById = new Map(categories.map((c) => [c.id, c]));
  return (
    <ol className="border-b border-ink-800">
      {packages.map((p, i) => (
        <PriceRow key={p.id} pkg={p} index={i} category={catById.get(p.category_id)} waHref={waLinks[p.id]} />
      ))}
    </ol>
  );
}
