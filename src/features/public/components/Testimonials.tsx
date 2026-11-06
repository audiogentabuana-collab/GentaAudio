import { Quote, Star } from 'lucide-react';
import type { Testimonial } from '@/features/content/types';

export function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`Rating ${rating} dari 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={i < rating ? 'h-4 w-4 text-brand-400' : 'h-4 w-4 text-ink-700'} fill="currentColor" aria-hidden />
      ))}
    </div>
  );
}

export function TestimonialList({ items }: { items: Testimonial[] }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
      {items.map((t) => (
        <li key={t.id} className="w-[85%] shrink-0 snap-start md:w-auto">
          <figure className="flex h-full flex-col rounded-xl border border-ink-800 bg-ink-900 p-6">
            <Quote className="h-8 w-8 text-brand-400/40" aria-hidden />
            <blockquote className="mt-3 flex-1 leading-relaxed text-ink-300">“{t.message}”</blockquote>
            <figcaption className="mt-5 flex items-end justify-between gap-3">
              <div>
                <p className="font-bold text-ink-100">{t.name}</p>
                {t.event && <p className="text-sm text-ink-400">{t.event}</p>}
              </div>
              <Stars rating={t.rating} />
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
