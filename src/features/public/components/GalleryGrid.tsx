'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Images, MapPin } from 'lucide-react';
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
    return <EmptyState icon={<Images className="h-10 w-10" />} title="Galeri segera hadir" description="Dokumentasi acara terbaru kami akan ditampilkan di sini." />;
  }

  return (
    <div>
      {showFilter && types.length > 1 && (
        <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter jenis acara">
          {['all', ...types].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold',
                type === t ? 'border-brand-400 bg-brand-400 text-ink-950' : 'border-ink-700 text-ink-300 hover:text-ink-100',
              )}
            >
              {t === 'all' ? 'Semua' : t}
            </button>
          ))}
        </div>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {shown.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={!item.image_ids.length}
              onClick={() => setOpen({ item, index: 0 })}
              className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl border border-ink-800 bg-ink-900 text-left disabled:cursor-default sm:aspect-[4/3]"
              aria-label={item.image_ids.length ? `Lihat foto ${item.title}` : item.title}
            >
              <DriveImage fileId={item.image_ids[0]} alt={item.title} sizes="(min-width: 1024px) 33vw, 50vw" className="transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              {item.image_ids.length > 1 && (
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-semibold text-white">
                  <Images className="h-3.5 w-3.5" aria-hidden /> {item.image_ids.length}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                {item.event_type && <p className="text-[11px] font-bold uppercase tracking-wider text-brand-300">{item.event_type}</p>}
                <p className="line-clamp-2 text-sm font-bold text-white sm:text-base">{item.title}</p>
                <div className="mt-1 hidden flex-wrap gap-x-3 gap-y-1 text-xs text-ink-300 sm:flex">
                  {item.event_date && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {formatDateId(item.event_date, { month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {item.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" aria-hidden /> {item.location}
                    </span>
                  )}
                </div>
              </div>
            </button>
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
