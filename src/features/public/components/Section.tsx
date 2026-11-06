import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/format';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  action?: ReactNode;
}) {
  return (
    <div className={cn('mb-8 flex flex-col gap-4 sm:mb-10', align === 'center' ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between')}>
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-400">{eyebrow}</p>}
        <h2 className="text-balance text-2xl font-semibold tracking-tight text-ink-100 sm:text-3xl">{title}</h2>
        {description && <p className="mt-3 text-pretty leading-relaxed text-ink-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHero({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <section className="bg-stage border-b border-ink-800">
      <div className="container-page py-12 sm:py-16">
        {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-400">{eyebrow}</p>}
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-ink-100 sm:text-4xl">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-pretty leading-relaxed text-ink-300">{description}</p>}
      </div>
    </section>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-ink-700 px-6 py-14 text-center">
      <div className="mb-4 text-ink-600">{icon}</div>
      <p className="font-semibold text-ink-100">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
