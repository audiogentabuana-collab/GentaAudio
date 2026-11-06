import Image from 'next/image';
import { Speaker } from 'lucide-react';
import { driveImageUrl, isMockImage } from '@/shared/lib/drive-image';
import { cn } from '@/shared/lib/format';

/**
 * Gambar dari Google Drive (via next/image). Bila belum ada foto, tampilkan
 * placeholder bertema panggung agar layout tetap rapi.
 */
export function DriveImage({
  fileId,
  alt,
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  className,
  priority,
  fill = true,
  width,
  height,
}: {
  fileId?: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
}) {
  if (!fileId) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-ink-800 via-ink-850 to-ink-900 text-ink-600',
          fill && 'absolute inset-0',
          className,
        )}
      >
        <Speaker className="h-1/3 max-h-16 w-1/3 max-w-16" strokeWidth={1.25} aria-hidden />
      </div>
    );
  }
  return (
    <Image
      src={driveImageUrl(fileId)}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      quality={70}
      priority={priority}
      unoptimized={isMockImage(fileId)}
      className={cn('object-cover', className)}
    />
  );
}
