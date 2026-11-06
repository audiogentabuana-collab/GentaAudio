export default function Loading() {
  return (
    <div className="container-page py-16" aria-busy="true" aria-live="polite">
      <div className="h-10 w-2/3 animate-pulse rounded-xl bg-ink-850" />
      <div className="mt-4 h-5 w-1/2 animate-pulse rounded-lg bg-ink-850" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-ink-900" />
        ))}
      </div>
      <span className="sr-only">Memuat...</span>
    </div>
  );
}
