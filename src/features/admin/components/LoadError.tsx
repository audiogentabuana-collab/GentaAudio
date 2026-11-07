import { TriangleAlert } from 'lucide-react';

/** Kotak error untuk halaman admin: menampilkan penyebab asli + langkah umum. */
export function LoadError({ message, title = 'Data gagal dimuat' }: { message: string; title?: string }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden />
        <div>
          <h2 className="font-semibold text-stone-900">{title}</h2>
          <p className="mt-1 break-words text-sm text-stone-700">{message}</p>
          <p className="mt-3 text-xs text-stone-500">
            Setelah memperbaiki, muat ulang halaman ini. Bila pesan menyebut Script Property, buka editor Apps Script → Setelan proyek → Properti skrip.
          </p>
        </div>
      </div>
    </div>
  );
}
