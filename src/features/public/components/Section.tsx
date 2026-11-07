import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/format';

/** Judul bagian bergaya lembar spesifikasi: nomor mono + garis tipis di atas. */
export function SectionHeading({
  index,
  title,
  description,
  action,
  className,
}: {
  index?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-8 grid gap-4 border-t border-ink-700 pt-5 sm:mb-10 md:items-baseline',
        index ? 'md:grid-cols-[8rem_1fr_auto]' : 'md:grid-cols-[1fr_auto]',
        className,
      )}
    >
      {index && <span className="font-mono text-sm text-ink-600">{index}</span>}
      <div className="max-w-2xl">
        <h2 className="text-balance text-2xl font-semibold tracking-tight text-ink-100 sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 text-pretty leading-relaxed text-ink-400">{description}</p>}
      </div>
      {action && <div className="md:text-right">{action}</div>}
    </div>
  );
}

export function PageHero({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <section className="border-b border-ink-800">
      <div className="container-page pb-10 pt-12 sm:pb-14 sm:pt-16">
        {eyebrow && <p className="label-mono mb-5 text-ink-400">{eyebrow}</p>}
        <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-ink-100 sm:text-6xl">{title}</h1>
        {description && <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-ink-400">{description}</p>}
      </div>
    </section>
  );
}

export function EmptyState({ title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="border-y border-dashed border-ink-700 py-12">
      <p className="text-lg text-ink-100">{title}</p>
      {description && <p className="mt-1 max-w-md text-ink-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Tautan teks dengan panah — dipakai sebagai aksi sekunder. */
export function ArrowLink({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  const cls = 'inline-flex items-center gap-1.5 text-ink-100 underline decoration-ink-600 underline-offset-[6px] hover:decoration-brand-400';
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children} <span aria-hidden>↗</span>
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children} <span aria-hidden>→</span>
    </Link>
  );
}
