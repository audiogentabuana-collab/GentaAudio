export default function Loading() {
  return (
    <div aria-busy="true" className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="mt-6 h-64 animate-pulse rounded-2xl bg-white" />
      <span className="sr-only">Memuat data...</span>
    </div>
  );
}
