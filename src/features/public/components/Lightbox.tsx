'use client';

import { useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DriveImage } from '@/shared/components/DriveImage';

export function Lightbox({
  images,
  index,
  title,
  onClose,
  onIndex,
}: {
  images: string[];
  index: number;
  title: string;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const prev = useCallback(() => onIndex((index - 1 + images.length) % images.length), [index, images.length, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % images.length), [index, images.length, onIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, prev, next]);

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[60] flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-3 text-ink-100">
        <p className="truncate px-2 text-sm font-medium">
          {title} <span className="text-ink-400">· {index + 1}/{images.length}</span>
        </p>
        <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10" aria-label="Tutup">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="relative flex-1">
        <DriveImage fileId={images[index]} alt={`${title} foto ${index + 1}`} sizes="100vw" className="!object-contain" />
        {images.length > 1 && (
          <>
            <button type="button" onClick={prev} aria-label="Foto sebelumnya" className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">
              <ChevronLeft className="h-7 w-7" />
            </button>
            <button type="button" onClick={next} aria-label="Foto berikutnya" className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">
              <ChevronRight className="h-7 w-7" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
