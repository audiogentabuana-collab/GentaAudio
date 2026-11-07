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
    <div className="min-h-dvh bg-paper px-5 py-10 text-stone-900">
      <div className="mx-auto w-full max-w-sm pt-[8vh]">
        <p className="flex items-baseline gap-2">
          <span className="h-2.5 w-2.5 self-center bg-brand-400" aria-hidden />
          <span className="font-semibold tracking-tight">Genta Buana</span>
          <span className="label-mono text-stone-500">CMS</span>
        </p>
        <h1 className="mt-8 border-b border-stone-300 pb-4 text-3xl font-semibold tracking-tight">Masuk</h1>
        <div className="mt-6">
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
