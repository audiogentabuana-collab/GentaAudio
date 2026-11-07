'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/format';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { Logo } from './Logo';
import { NAV } from './nav';

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function SiteHeader({ name, logoId, waHref, phone }: { name: string; logoId?: string; waHref: string; phone: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/95 backdrop-blur-sm">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link href="/" aria-label={`${name} — beranda`} onClick={() => setOpen(false)}>
          <Logo name={name} logoId={logoId} />
        </Link>

        <nav aria-label="Navigasi utama" className="hidden h-full items-stretch gap-6 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(pathname, n.href) ? 'page' : undefined}
              className={cn(
                'flex items-center border-b-2 pt-0.5 text-[15px] transition-colors',
                isActive(pathname, n.href) ? 'border-brand-400 text-ink-100' : 'border-transparent text-ink-400 hover:text-ink-100',
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-2 rounded-[3px] bg-brand-400 px-3.5 py-2 text-sm font-medium text-ink-950 hover:bg-brand-300 lg:inline-flex"
        >
          <WhatsAppIcon size={16} /> <span className="font-mono">{phone || 'WhatsApp'}</span>
        </a>

        <button
          type="button"
          className="label-mono flex h-11 items-center px-1 text-ink-100 md:hidden"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Tutup' : 'Menu'}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Navigasi utama" className="h-[calc(100dvh-4rem)] overflow-y-auto border-t border-ink-800 bg-ink-950 md:hidden">
          <ol className="container-page">
            {NAV.map((n, i) => (
              <li key={n.href} className="border-b border-ink-800">
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, n.href) ? 'page' : undefined}
                  className="flex items-baseline gap-4 py-4"
                >
                  <span className="font-mono text-xs text-ink-600">{String(i + 1).padStart(2, '0')}</span>
                  <span className={cn('text-2xl font-medium', isActive(pathname, n.href) ? 'text-brand-400' : 'text-ink-100')}>{n.label}</span>
                </Link>
              </li>
            ))}
          </ol>
          <div className="container-page py-6">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-[3px] bg-brand-400 font-medium text-ink-950"
            >
              <WhatsAppIcon size={18} /> Chat WhatsApp {phone && <span className="font-mono">{phone}</span>}
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
