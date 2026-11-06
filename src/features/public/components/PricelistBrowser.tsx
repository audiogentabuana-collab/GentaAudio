'use client';

import { useMemo, useState } from 'react';
import { PackageSearch } from 'lucide-react';
import type { Category, Package } from '@/features/content/types';
import { cn } from '@/shared/lib/format';
import { PackageCard } from './PackageCard';
import { EmptyState } from './Section';

type Sort = 'default' | 'price-asc' | 'price-desc';

/**
 * Filter kategori & urutan harga di client, sehingga halaman tetap statis (cepat)
 * dan bisa dicache penuh oleh Next.js.
 */
export function PricelistBrowser({
  categories,
  packages,
  waLinks,
}: {
  categories: Category[];
  packages: Package[];
  waLinks: Record<string, string>;
}) {
  const [active, setActive] = useState<string>('all');
  const [sort, setSort] = useState<Sort>('default');

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    packages.forEach((p) => m.set(p.category_id, (m.get(p.category_id) ?? 0) + 1));
    return m;
  }, [packages]);

  const shown = useMemo(() => {
    const list = active === 'all' ? packages : packages.filter((p) => p.category_id === active);
    if (sort === 'price-asc') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [packages, active, sort]);

  const chip = (id: string, label: string, count: number) => (
    <button
      key={id}
      type="button"
      onClick={() => setActive(id)}
      aria-pressed={active === id}
      className={cn(
        'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
        active === id ? 'border-brand-400 bg-brand-400 text-ink-950' : 'border-ink-700 text-ink-300 hover:border-ink-400 hover:text-ink-100',
      )}
    >
      {label} <span className={cn('ml-1 text-xs', active === id ? 'text-ink-900' : 'text-ink-400')}>{count}</span>
    </button>
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter kategori">
          {chip('all', 'Semua', packages.length)}
          {categories.filter((c) => counts.get(c.id)).map((c) => chip(c.id, c.name, counts.get(c.id) ?? 0))}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-400">
          Urutkan
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-10 rounded-lg border border-ink-700 bg-ink-900 px-3 text-ink-100"
          >
            <option value="default">Rekomendasi</option>
            <option value="price-asc">Harga termurah</option>
            <option value="price-desc">Harga termahal</option>
          </select>
        </label>
      </div>

      {shown.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p, i) => (
            <PackageCard key={p.id} pkg={p} category={catById.get(p.category_id)} waHref={waLinks[p.id]} priority={i < 3} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<PackageSearch className="h-10 w-10" />} title="Belum ada paket di kategori ini" description="Silakan pilih kategori lain atau hubungi kami untuk paket custom." />
      )}
    </div>
  );
}
