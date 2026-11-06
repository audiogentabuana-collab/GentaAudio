import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="bg-stage flex min-h-dvh flex-col items-center justify-center px-6 text-center text-ink-100">
      <SearchX className="h-14 w-14 text-brand-400" aria-hidden />
      <h1 className="mt-5 text-3xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="mt-2 max-w-md text-ink-400">Halaman yang Anda cari mungkin sudah dipindah atau tidak tersedia.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="inline-flex h-11 items-center rounded-lg bg-brand-400 px-5 font-semibold text-ink-950">
          Ke beranda
        </Link>
        <Link href="/pricelist" className="inline-flex h-11 items-center rounded-lg border border-ink-700 px-5 font-semibold">
          Lihat pricelist
        </Link>
      </div>
    </div>
  );
}
