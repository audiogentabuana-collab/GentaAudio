import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/server/auth/session';
import { LoginForm } from '@/features/admin/components/LoginForm';

export const metadata: Metadata = { title: 'Masuk Admin', robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: PageProps<'/admin/login'>) {
  if (await getSession()) redirect('/admin');
  const sp = await searchParams;
  const next = typeof sp.next === 'string' ? sp.next : undefined;
  return (
    <div className="min-h-dvh bg-stone-50 px-5 py-10 text-stone-900">
      <div className="mx-auto w-full max-w-sm pt-[8vh]">
        <p className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">G</span>
          <span className="font-semibold tracking-tight">Genta Buana</span>
        </p>
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
          <h1 className="text-xl font-semibold tracking-tight">Masuk ke panel admin</h1>
          <p className="mb-5 mt-1 text-sm text-stone-500">Kelola paket, galeri, dan kontak website.</p>
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
