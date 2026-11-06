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
        <AudioLines className="h-8 w-8 text-brand-400" strokeWidth={2.5} aria-hidden />
      )}
      <span className="text-xl font-medium tracking-tight text-ink-100">{name}</span>
    </span>
  );
}
