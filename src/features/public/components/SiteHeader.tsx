'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/shared/lib/format';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { Logo } from './Logo';
import { NAV } from './nav';

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function SiteHeader({ name, logoId, waHref }: { name: string; logoId?: string; waHref: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-colors',
        scrolled || open ? 'border-ink-800 bg-ink-950/90 backdrop-blur' : 'border-transparent bg-transparent',
      )}
    >
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" aria-label={`${name} — beranda`} onClick={() => setOpen(false)}>
          <Logo name={name} logoId={logoId} />
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(pathname, n.href) ? 'page' : undefined}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive(pathname, n.href) ? 'text-brand-400' : 'text-ink-300 hover:text-ink-100',
              )}
            >
              {n.label}
            </Link>
          ))}
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-400 px-4 text-sm font-semibold text-ink-950 hover:bg-brand-300"
          >
            <WhatsAppIcon size={16} /> Chat WhatsApp
          </a>
        </nav>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-100 hover:bg-ink-800 md:hidden"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Navigasi utama" className="h-[calc(100dvh-4rem)] border-t border-ink-800 bg-ink-950 md:hidden">
          <ul className="container-page flex flex-col gap-1 py-4">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, n.href) ? 'page' : undefined}
                  className={cn(
                    'block rounded-lg px-4 py-3.5 text-lg font-semibold',
                    isActive(pathname, n.href) ? 'bg-ink-850 text-brand-400' : 'text-ink-100 active:bg-ink-850',
                  )}
                >
                  {n.label}
                </Link>
              </li>
            ))}
            <li className="pt-3">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-13 items-center justify-center gap-2 rounded-lg bg-[#25D366] text-base font-bold text-[#062e16]"
              >
                <WhatsAppIcon size={20} /> Chat via WhatsApp
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
