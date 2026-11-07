'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { RESOURCES } from '../resources';
import { logout } from '../actions';
import { ToastProvider } from './Toast';
import { cn } from '@/shared/lib/format';

const NAV: { href: string; label: string }[] = [
  { href: '/admin', label: 'Ringkasan' },
  ...RESOURCES.map((r) => ({ href: `/admin/${r.slug}`, label: r.label })),
  { href: '/admin/pengaturan', label: 'Pengaturan' },
];

function active(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/');
}

export function AdminShell({ username, children }: { username: string; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  const current = NAV.find((n) => active(pathname, n.href));

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-paper text-stone-900">
        <header className="sticky top-0 z-30 border-b border-stone-300 bg-paper/95 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-4 sm:px-8">
            <Link href="/admin" className="flex items-baseline gap-2">
              <span className="h-2.5 w-2.5 self-center bg-brand-400" aria-hidden />
              <span className="font-semibold tracking-tight">Genta Buana</span>
              <span className="label-mono text-stone-500">CMS</span>
            </Link>
            <div className="hidden items-center gap-5 text-sm lg:flex">
              <a href="/" target="_blank" rel="noopener noreferrer" className="text-stone-600 hover:text-stone-900">
                Lihat website ↗
              </a>
              <form action={logout}>
                <button type="submit" className="text-stone-600 hover:text-stone-900">
                  Keluar <span className="font-mono text-xs text-stone-500">({username})</span>
                </button>
              </form>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
              aria-expanded={open}
              className="flex h-10 items-center gap-2 text-sm lg:hidden"
            >
              <span className="text-stone-500">{current?.label}</span>
              <span className="label-mono rounded-[3px] border border-stone-300 px-2 py-1">Menu</span>
            </button>
          </div>
          {/* Navigasi desktop */}
          <nav aria-label="Menu admin" className="mx-auto hidden max-w-6xl gap-6 overflow-x-auto px-8 lg:flex">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(pathname, href) ? 'page' : undefined}
                className={cn(
                  '-mb-px shrink-0 border-b-2 pb-3 pt-1 text-sm',
                  active(pathname, href) ? 'border-brand-400 font-medium text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-900',
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </header>

        {open && (
          <div className="fixed inset-0 z-50 bg-paper lg:hidden" role="dialog" aria-modal="true" aria-label="Menu admin">
            <div className="flex h-14 items-center justify-between border-b border-stone-300 px-4">
              <span className="font-semibold">Menu</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Tutup menu" className="label-mono rounded-[3px] border border-stone-300 px-2 py-1">
                Tutup
              </button>
            </div>
            <nav aria-label="Menu admin" className="px-4">
              <ol>
                {NAV.map(({ href, label }, i) => (
                  <li key={href} className="border-b border-stone-200">
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={active(pathname, href) ? 'page' : undefined}
                      className="flex items-baseline gap-4 py-3.5"
                    >
                      <span className="font-mono text-xs text-stone-400">{String(i + 1).padStart(2, '0')}</span>
                      <span className={cn('text-lg', active(pathname, href) ? 'font-medium text-stone-900' : 'text-stone-700')}>{label}</span>
                    </Link>
                  </li>
                ))}
              </ol>
              <div className="flex items-center justify-between py-5 text-sm">
                <a href="/" target="_blank" rel="noopener noreferrer" className="text-stone-600">
                  Lihat website ↗
                </a>
                <form action={logout}>
                  <button type="submit" className="text-stone-600">
                    Keluar <span className="font-mono text-xs text-stone-500">({username})</span>
                  </button>
                </form>
              </div>
            </nav>
          </div>
        )}

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </ToastProvider>
  );
}
