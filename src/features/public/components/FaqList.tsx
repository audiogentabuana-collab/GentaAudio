import type { Faq } from '@/features/content/types';

export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="border-b border-ink-800">
      {items.map((f, i) => (
        <details key={f.id} className="group border-t border-ink-800" open={i === 0}>
          <summary className="grid cursor-pointer list-none grid-cols-[2.5rem_1fr_1.5rem] items-baseline gap-3 py-5 text-left [&::-webkit-details-marker]:hidden">
            <span className="font-mono text-sm text-ink-600">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-lg text-ink-100 group-hover:text-brand-400">{f.question}</span>
            <span className="font-mono text-lg text-ink-400 group-open:hidden" aria-hidden>+</span>
            <span className="hidden font-mono text-lg text-ink-400 group-open:inline" aria-hidden>−</span>
          </summary>
          <div className="whitespace-pre-line pb-6 pl-[3.25rem] pr-8 leading-relaxed text-ink-400">{f.answer}</div>
        </details>
      ))}
    </div>
  );
}
