import { DriveImage } from '@/shared/components/DriveImage';

export function Logo({ name, logoId }: { name: string; logoId?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      {logoId ? (
        <span className="relative h-8 w-8 overflow-hidden rounded-[3px] bg-ink-850">
          <DriveImage fileId={logoId} alt={`Logo ${name}`} sizes="32px" className="object-contain" />
        </span>
      ) : (
        <span className="h-3 w-3 bg-brand-400" aria-hidden />
      )}
      <span className="text-lg font-semibold tracking-tight text-ink-100">{name}</span>
    </span>
  );
}
