import { AudioLines } from 'lucide-react';
import { DriveImage } from '@/shared/components/DriveImage';

export function Logo({ name, logoId }: { name: string; logoId?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      {logoId ? (
        <span className="relative h-9 w-9 overflow-hidden rounded-lg bg-ink-800">
          <DriveImage fileId={logoId} alt={`Logo ${name}`} sizes="36px" className="object-contain" />
        </span>
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-400 text-ink-950">
          <AudioLines className="h-5 w-5" aria-hidden />
        </span>
      )}
      <span className="text-lg font-extrabold tracking-tight text-ink-100">{name}</span>
    </span>
  );
}
