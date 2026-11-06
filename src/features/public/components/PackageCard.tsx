import Link from 'next/link';
import { ArrowRight, Users, Star } from 'lucide-react';
import type { Category, Package } from '@/features/content/types';
import { DriveImage } from '@/shared/components/DriveImage';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { formatRupiah, PRICE_UNIT_LABEL } from '@/shared/lib/format';

export function PackageCard({
  pkg,
  category,
  waHref,
  priority,
}: {
  pkg: Package;
  category?: Category | null;
  waHref: string;
  priority?: boolean;
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-ink-800 bg-ink-900 transition-colors hover:border-ink-600">
      <Link href={`/pricelist/${pkg.slug}`} className="relative block aspect-[4/3] overflow-hidden" tabIndex={-1} aria-hidden>
        <DriveImage
          fileId={pkg.image_ids[0]}
          alt={pkg.name}
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        {pkg.is_featured && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-lime-accent px-2.5 py-1 text-xs font-semibold text-ink-950">
            <Star className="h-3.5 w-3.5" fill="currentColor" aria-hidden /> Terlaris
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        {category && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-400">{category.name}</p>}
        <h3 className="text-lg font-bold text-ink-100">
          <Link href={`/pricelist/${pkg.slug}`} className="hover:text-brand-400">
            {pkg.name}
          </Link>
        </h3>
        {pkg.capacity && (
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-300">
            <Users className="h-4 w-4 text-brand-400" aria-hidden /> {pkg.capacity}
          </p>
        )}
        {pkg.specs.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-ink-400">
            {pkg.specs.slice(0, 3).map((s, i) => (
              <li key={i} className="line-clamp-1">
                <span className="text-ink-300">{s.label}:</span> {s.value}
              </li>
            ))}
            {pkg.specs.length > 3 && <li className="text-xs text-ink-400">+{pkg.specs.length - 3} item lainnya</li>}
          </ul>
        )}
        <div className="mt-auto pt-5">
          <p className="text-2xl font-semibold text-brand-400">
            {formatRupiah(pkg.price)}
            <span className="ml-1 text-sm font-medium text-ink-400">/ {PRICE_UNIT_LABEL[pkg.price_unit]}</span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href={`/pricelist/${pkg.slug}`}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-ink-700 text-sm font-semibold text-ink-100 hover:border-ink-400"
            >
              Detail <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] text-sm font-bold text-[#062e16] hover:bg-[#3ee07a]"
              aria-label={`Pesan ${pkg.name} via WhatsApp`}
            >
              <WhatsAppIcon size={16} /> Pesan
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
