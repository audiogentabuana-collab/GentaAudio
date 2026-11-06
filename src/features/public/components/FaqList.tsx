import { ChevronDown } from 'lucide-react';
import type { Faq } from '@/features/content/types';

export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-ink-800 overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
      {items.map((f, i) => (
        <details key={f.id} className="group" open={i === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-ink-100 hover:bg-ink-850 [&::-webkit-details-marker]:hidden">
            {f.question}
            <ChevronDown className="h-5 w-5 shrink-0 text-brand-400 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="whitespace-pre-line px-5 pb-5 leading-relaxed text-ink-300">{f.answer}</div>
        </details>
      ))}
    </div>
  );
}
