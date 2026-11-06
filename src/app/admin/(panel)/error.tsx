'use client';

import { RefreshCw, TriangleAlert } from 'lucide-react';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
      <TriangleAlert className="mx-auto h-10 w-10 text-red-500" aria-hidden />
      <h1 className="mt-3 text-lg font-bold text-slate-900">Data gagal dimuat</h1>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        Server data (Google Apps Script) tidak merespon atau belum terkonfigurasi. Coba lagi beberapa saat.
        {error.digest && <span className="mt-2 block text-xs text-slate-400">Kode: {error.digest}</span>}
      </p>
      <button onClick={reset} className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">
        <RefreshCw className="h-4 w-4" aria-hidden /> Coba lagi
      </button>
    </div>
  );
}
