'use client';

import { RefreshCw, TriangleAlert } from 'lucide-react';

export default function PublicError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <TriangleAlert className="h-12 w-12 text-brand-400" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold text-ink-100">Halaman gagal dimuat</h1>
      <p className="mt-2 text-ink-400">Koneksi sedang bermasalah. Silakan coba lagi.</p>
      <button onClick={reset} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-400 px-5 font-semibold text-ink-950">
        <RefreshCw className="h-4 w-4" aria-hidden /> Coba lagi
      </button>
    </div>
  );
}
