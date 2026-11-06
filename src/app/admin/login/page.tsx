import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AudioLines } from 'lucide-react';
import { getSession } from '@/server/auth/session';
import { LoginForm } from '@/features/admin/components/LoginForm';

export const metadata: Metadata = { title: 'Masuk Admin', robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: PageProps<'/admin/login'>) {
  if (await getSession()) redirect('/admin');
  const sp = await searchParams;
  const next = typeof sp.next === 'string' ? sp.next : undefined;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-400 text-white">
            <AudioLines className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Panel Admin Genta Buana</h1>
          <p className="mt-1 text-sm text-slate-500">Masuk untuk mengelola isi website.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
