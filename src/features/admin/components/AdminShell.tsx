'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { AudioLines, ExternalLink, LayoutDashboard, LogOut, Menu, Settings, X, type LucideIcon } from 'lucide-react';
import { RESOURCES } from '../resources';
import { logout } from '../actions';
import { ToastProvider } from './Toast';
import { cn } from '@/shared/lib/format';

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  ...RESOURCES.map((r) => ({ href: `/admin/${r.slug}`, label: r.label, icon: r.icon })),
  { href: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
];

function active(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/');
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            onClick={onNavigate}
            aria-current={active(pathname, href) ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium',
              active(pathname, href) ? 'bg-brand-400 text-slate-950 font-semibold' : 'text-slate-300 hover:bg-white/10 hover:text-white',
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden /> {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SidebarFooter({ username }: { username: string }) {
  return (
    <div className="space-y-1 border-t border-white/10 pt-3">
      <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white">
        <ExternalLink className="h-5 w-5" aria-hidden /> Lihat website
      </a>
      <form action={logout}>
        <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white">
          <LogOut className="h-5 w-5" aria-hidden /> Keluar <span className="ml-auto truncate text-xs text-slate-500">{username}</span>
        </button>
      </form>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 px-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-400 text-slate-950">
        <AudioLines className="h-5 w-5" aria-hidden />
      </span>
      <span>
        <span className="block text-sm font-bold leading-tight text-white">Genta Buana</span>
        <span className="block text-xs text-slate-400">Panel Admin</span>
      </span>
    </Link>
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
      <div className="min-h-dvh bg-slate-100 text-slate-900">
        {/* Sidebar desktop */}
        <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 bg-slate-950 p-4 lg:flex">
          <Brand />
          <nav aria-label="Menu admin" className="flex-1 overflow-y-auto">
            <NavList pathname={pathname} />
          </nav>
          <SidebarFooter username={username} />
        </aside>

        {/* Top bar mobile */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-slate-950 px-3 lg:hidden">
          <Brand />
          <button type="button" onClick={() => setOpen(true)} aria-label="Buka menu" aria-expanded={open} className="flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/10">
            <Menu className="h-6 w-6" />
          </button>
        </header>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu admin">
            <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col gap-5 overflow-y-auto bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <Brand />
                <button type="button" onClick={() => setOpen(false)} aria-label="Tutup menu" className="flex h-10 w-10 items-center justify-center rounded-xl text-white hover:bg-white/10">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav aria-label="Menu admin" className="flex-1">
                <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
              </nav>
              <SidebarFooter username={username} />
            </div>
          </div>
        )}

        <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
