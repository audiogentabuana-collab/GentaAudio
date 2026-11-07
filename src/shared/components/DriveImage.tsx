import Image from 'next/image';
import { driveImageUrl, isMockImage } from '@/shared/lib/drive-image';
import { cn } from '@/shared/lib/format';

/**
 * Gambar dari Google Drive (via next/image). Bila belum ada foto, tampilkan
 * bidang polos dengan keterangan jujur — bukan ilustrasi palsu.
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
      <div role="img" aria-label={alt} className={cn('flex items-end bg-ink-850 p-3', fill && 'absolute inset-0', className)}>
        <span className="label-mono text-ink-600">Foto belum tersedia</span>
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
