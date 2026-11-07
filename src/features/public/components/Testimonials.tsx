import type { Testimonial } from '@/features/content/types';

/** Kutipan pelanggan: satu kutipan besar, sisanya daftar bergaris. */
export function TestimonialList({ items }: { items: Testimonial[] }) {
  if (!items.length) return null;
  const [first, ...rest] = items;
  return (
    <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
      <figure>
        <blockquote className="text-balance text-2xl leading-snug text-ink-100 sm:text-3xl">“{first.message}”</blockquote>
        <figcaption className="mt-6 font-mono text-sm text-ink-400">
          {first.name}
          {first.event && <span className="text-ink-600"> — {first.event}</span>}
          <span className="ml-3 text-brand-400">{first.rating}/5</span>
        </figcaption>
      </figure>
      {rest.length > 0 && (
        <ul className="divide-y divide-ink-800 border-y border-ink-800">
          {rest.map((t) => (
            <li key={t.id} className="py-5">
              <p className="leading-relaxed text-ink-300">“{t.message}”</p>
              <p className="mt-2 font-mono text-xs text-ink-600">
                {t.name}
                {t.event && ` — ${t.event}`} · <span className="text-ink-400">{t.rating}/5</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
