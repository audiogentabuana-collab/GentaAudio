'use client';

import { useState } from 'react';
import { Expand } from 'lucide-react';
import { DriveImage } from '@/shared/components/DriveImage';
import { cn } from '@/shared/lib/format';
import { Lightbox } from './Lightbox';

export function PackageGallery({ images, name }: { images: string[]; name: string }) {
  const [current, setCurrent] = useState(0);
  const [zoom, setZoom] = useState(false);
  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
        <DriveImage fileId={images[current]} alt={`${name} foto ${current + 1}`} sizes="(min-width: 1024px) 50vw, 100vw" priority />
        {images.length > 0 && (
          <button type="button" onClick={() => setZoom(true)} aria-label="Perbesar foto" className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
            <Expand className="h-5 w-5" />
          </button>
        )}
      </div>
      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2">
          {images.map((id, i) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Foto ${i + 1}`}
                aria-current={i === current}
                className={cn('relative block aspect-square w-full overflow-hidden rounded-lg border-2', i === current ? 'border-brand-400' : 'border-transparent opacity-70 hover:opacity-100')}
              >
                <DriveImage fileId={id} alt="" sizes="120px" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {zoom && <Lightbox images={images} index={current} title={name} onClose={() => setZoom(false)} onIndex={setCurrent} />}
    </div>
  );
}
