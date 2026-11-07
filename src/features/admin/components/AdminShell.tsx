'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ExternalLink, LayoutDashboard, LogOut, Menu, Settings, X, type LucideIcon } from 'lucide-react';
import { RESOURCES } from '../resources';
import { logout } from '../actions';
import { ToastProvider } from './Toast';
import { cn } from '@/shared/lib/format';

type Item = { href: string; label: string; icon: LucideIcon };
const GROUPS: { title?: string; items: Item[] }[] = [
  { items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard }] },
  { title: 'Konten', items: RESOURCES.map((r) => ({ href: `/admin/${r.slug}`, label: r.label, icon: r.icon })) },
  { title: 'Sistem', items: [{ href: '/admin/pengaturan', label: 'Pengaturan', icon: Settings }] },
];

function active(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/');
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 px-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">G</span>
      <span className="leading-tight">
        <span className="block font-semibold tracking-tight text-stone-900">Genta Buana</span>
        <span className="block text-xs text-stone-500">Panel admin</span>
      </span>
    </Link>
  );
}

function Sidebar({ pathname, username, onNavigate }: { pathname: string; username: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 px-3 py-5">
      <Brand />
      <nav aria-label="Menu admin" className="flex-1 space-y-5 overflow-y-auto">
        {GROUPS.map((g, gi) => (
          <div key={gi}>
            {g.title && <p className="mb-1.5 px-3 text-xs font-medium text-stone-400">{g.title}</p>}
            <ul className="space-y-0.5">
              {g.items.map(({ href, label, icon: Icon }) => {
                const on = active(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={on ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] transition-colors',
                        on ? 'bg-brand-50 font-medium text-brand-700' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
                      )}
                    >
                      <Icon className={cn('h-[18px] w-[18px] shrink-0', on ? 'text-brand-500' : 'text-stone-400')} aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-stone-200 pt-4">
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900">
          <ExternalLink className="h-[18px] w-[18px] text-stone-400" aria-hidden /> Lihat website
        </a>
        <div className="flex items-center gap-3 px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-sm font-medium uppercase text-stone-700">{username.slice(0, 1)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-stone-900">{username}</span>
            <span className="block text-xs text-stone-500">Pemilik</span>
          </span>
          <form action={logout}>
            <button type="submit" aria-label="Keluar" title="Keluar" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ username, children }: { username: string; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-stone-50 text-stone-900">
        <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-stone-200 bg-white lg:block">
          <Sidebar pathname={pathname} username={username} />
        </aside>

        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4 lg:hidden">
          <Brand />
          <button type="button" onClick={() => setOpen(true)} aria-label="Buka menu" aria-expanded={open} className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-700 hover:bg-stone-100">
            <Menu className="h-5 w-5" />
          </button>
        </header>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu admin">
            <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-stone-900/30" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-[80%] max-w-xs bg-white shadow-xl">
              <button type="button" onClick={() => setOpen(false)} aria-label="Tutup menu" className="absolute right-3 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
              <Sidebar pathname={pathname} username={username} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        )}

        <main className="px-4 py-6 sm:px-6 lg:ml-60 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
