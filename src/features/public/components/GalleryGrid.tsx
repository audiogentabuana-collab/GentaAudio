'use client';

import { useMemo, useState } from 'react';
import type { GalleryItem } from '@/features/content/types';
import { DriveImage } from '@/shared/components/DriveImage';
import { cn, formatDateId } from '@/shared/lib/format';
import { Lightbox } from './Lightbox';
import { EmptyState } from './Section';

export function GalleryGrid({ items, showFilter = true, limit }: { items: GalleryItem[]; showFilter?: boolean; limit?: number }) {
  const [type, setType] = useState('all');
  const [open, setOpen] = useState<{ item: GalleryItem; index: number } | null>(null);
  const types = useMemo(() => [...new Set(items.map((i) => i.event_type).filter(Boolean))], [items]);
  const shown = (type === 'all' ? items : items.filter((i) => i.event_type === type)).slice(0, limit);

  if (!items.length) {
    return <EmptyState title="Dokumentasi segera ditambahkan" description="Foto acara terbaru kami akan tampil di sini." />;
  }

  return (
    <div>
      {showFilter && types.length > 1 && (
        <div className="-mx-5 mb-8 flex gap-6 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter jenis acara">
          {['all', ...types].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={cn('shrink-0 border-b-2 pb-2 text-[15px]', type === t ? 'border-brand-400 text-ink-100' : 'border-transparent text-ink-400 hover:text-ink-100')}
            >
              {t === 'all' ? 'Semua' : t}
            </button>
          ))}
        </div>
      )}
      <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((item) => (
          <li key={item.id}>
            <figure>
              <button
                type="button"
                disabled={!item.image_ids.length}
                onClick={() => setOpen({ item, index: 0 })}
                className="relative block aspect-[4/3] w-full overflow-hidden rounded-[3px] bg-ink-850 disabled:cursor-default"
                aria-label={item.image_ids.length ? `Lihat ${item.image_ids.length} foto ${item.title}` : item.title}
              >
                <DriveImage fileId={item.image_ids[0]} alt={item.title} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
              </button>
              <figcaption className="mt-3">
                <p className="font-medium text-ink-100">{item.title}</p>
                <p className="mt-1 font-mono text-xs text-ink-600">
                  {[item.event_type, item.event_date && formatDateId(item.event_date, { month: 'short', year: 'numeric' }), item.location && !item.location.startsWith('[ISI') ? item.location : '', item.image_ids.length > 1 ? `${item.image_ids.length} foto` : '']
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      {open && (
        <Lightbox
          images={open.item.image_ids}
          index={open.index}
          title={open.item.title}
          onClose={() => setOpen(null)}
          onIndex={(i) => setOpen({ item: open.item, index: i })}
        />
      )}
    </div>
  );
}
