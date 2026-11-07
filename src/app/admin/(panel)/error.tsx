'use client';

import { RefreshCw, TriangleAlert } from 'lucide-react';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-white p-6 sm:p-8">
      <TriangleAlert className="h-8 w-8 text-red-500" aria-hidden />
      <h1 className="mt-3 text-lg font-semibold text-stone-900">Data gagal dimuat</h1>
      <p className="mt-1 max-w-xl text-sm text-stone-600">Panel admin tidak bisa mengambil data dari Google Apps Script. Penyebab yang paling sering:</p>
      <ol className="mt-3 max-w-xl list-decimal space-y-1.5 pl-5 text-sm text-stone-600">
        <li>
          Kode Apps Script sudah diperbarui tetapi <strong>deployment belum dibuat versi baru</strong> (Terapkan → Kelola deployment → ikon pensil → Versi baru → Terapkan).
        </li>
        <li>
          Fungsi <strong>setup</strong> belum dijalankan lagi setelah pembaruan.
        </li>
        <li>
          Di Vercel, <strong>GAS_WEB_APP_URL</strong> atau <strong>GAS_API_KEY</strong> salah/berbeda dengan Script Property <strong>API_KEY</strong> (setelah mengubahnya, lakukan Redeploy).
        </li>
      </ol>
      {error.digest && (
        <p className="mt-4 text-xs text-stone-400">
          Kode: <span className="font-mono">{error.digest}</span> — cari kode ini di Vercel → Logs untuk melihat pesan lengkapnya.
        </p>
      )}
      <button onClick={reset} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-700">
        <RefreshCw className="h-4 w-4" aria-hidden /> Coba lagi
      </button>
    </div>
  );
}
