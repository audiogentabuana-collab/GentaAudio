'use client';

import { useMemo, useState } from 'react';
import type { Category, Package } from '@/features/content/types';
import { cn } from '@/shared/lib/format';
import { PriceList } from './PriceList';
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

  const tab = (id: string, label: string, count: number) => (
    <button
      key={id}
      type="button"
      onClick={() => setActive(id)}
      aria-pressed={active === id}
      className={cn(
        'shrink-0 border-b-2 pb-2 text-[15px] transition-colors',
        active === id ? 'border-brand-400 text-ink-100' : 'border-transparent text-ink-400 hover:text-ink-100',
      )}
    >
      {label} <span className="font-mono text-xs text-ink-600">{count}</span>
    </button>
  );

  return (
    <div>
      <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="-mx-5 flex gap-6 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter kategori">
          {tab('all', 'Semua', packages.length)}
          {categories.filter((c) => counts.get(c.id)).map((c) => tab(c.id, c.name, counts.get(c.id) ?? 0))}
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-ink-400">
          <span className="label-mono">Urutkan</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-[3px] border border-ink-700 bg-ink-950 px-2 py-1.5 text-ink-100"
          >
            <option value="default">Rekomendasi</option>
            <option value="price-asc">Harga termurah</option>
            <option value="price-desc">Harga termahal</option>
          </select>
        </label>
      </div>

      {shown.length ? (
        <PriceList packages={shown} categories={categories} waLinks={waLinks} />
      ) : (
        <EmptyState title="Belum ada paket di kategori ini" description="Pilih kategori lain atau tanyakan paket khusus lewat WhatsApp." />
      )}
    </div>
  );
}
