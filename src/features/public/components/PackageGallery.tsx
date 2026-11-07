'use client';

import { useState } from 'react';
import { DriveImage } from '@/shared/components/DriveImage';
import { cn } from '@/shared/lib/format';
import { Lightbox } from './Lightbox';

export function PackageGallery({ images, name }: { images: string[]; name: string }) {
  const [current, setCurrent] = useState(0);
  const [zoom, setZoom] = useState(false);
  if (!images.length) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setZoom(true)}
        aria-label="Perbesar foto"
        className="relative block aspect-[4/3] w-full overflow-hidden rounded-[3px] bg-ink-850"
      >
        <DriveImage fileId={images[current]} alt={`${name} foto ${current + 1}`} sizes="(min-width: 1024px) 50vw, 100vw" priority />
      </button>
      {images.length > 1 && (
        <ul className="mt-2 grid grid-cols-5 gap-2">
          {images.map((id, i) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Foto ${i + 1}`}
                aria-current={i === current}
                className={cn('relative block aspect-square w-full overflow-hidden rounded-[3px] border', i === current ? 'border-brand-400' : 'border-transparent opacity-60 hover:opacity-100')}
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
