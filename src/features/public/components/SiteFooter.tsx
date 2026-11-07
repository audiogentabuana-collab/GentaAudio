import Link from 'next/link';
import type { Settings } from '@/features/content/types';
import { displayPhone, waLink } from '@/shared/lib/whatsapp';
import { Logo } from './Logo';
import { NAV } from './nav';

export function SocialLinks({ s, className = '' }: { s: Settings; className?: string }) {
  const items = [
    { href: s.instagram, label: 'Instagram' },
    { href: s.facebook, label: 'Facebook' },
    { href: s.tiktok, label: 'TikTok' },
    { href: s.youtube, label: 'YouTube' },
  ].filter((i) => i.href);
  if (!items.length) return null;
  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-2 ${className}`}>
      {items.map(({ href, label }) => (
        <li key={label}>
          <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-ink-600 underline-offset-4 hover:text-ink-100 hover:decoration-brand-400">
            {label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function isPlaceholder(v: string) {
  return !v || v.startsWith('[ISI');
}

export function SiteFooter({ s }: { s: Settings }) {
  const year = new Date().getFullYear();
  const rows: [string, React.ReactNode][] = [];
  if (s.whatsapp)
    rows.push([
      'WhatsApp',
      <a key="wa" href={waLink(s.whatsapp, s.wa_default_message)} target="_blank" rel="noopener noreferrer" className="font-mono hover:text-brand-400">
        {displayPhone(s.whatsapp)}
      </a>,
    ]);
  if (s.phone && s.phone !== s.whatsapp)
    rows.push(['Telepon', <a key="tel" href={`tel:+${s.phone}`} className="font-mono hover:text-brand-400">{displayPhone(s.phone)}</a>]);
  if (s.email) rows.push(['Email', <a key="mail" href={`mailto:${s.email}`} className="break-all hover:text-brand-400">{s.email}</a>]);
  if (!isPlaceholder(s.address)) rows.push(['Alamat', s.address]);
  if (s.opening_hours) rows.push(['Jam buka', s.opening_hours]);

  return (
    <footer className="border-t border-ink-800 bg-ink-950 pb-24 pt-14 text-[15px] text-ink-400 md:pb-12">
      <div className="container-page grid gap-12 md:grid-cols-[1.2fr_1fr_1.4fr]">
        <div className="space-y-4">
          <Logo name={s.business_name} logoId={s.logo_id} />
          <p className="max-w-xs leading-relaxed">{s.tagline.replace(/\s*\|\s*/g, ' ')}</p>
          <SocialLinks s={s} />
        </div>
        <nav aria-label="Navigasi footer">
          <p className="label-mono mb-4 text-ink-600">Halaman</p>
          <ul className="space-y-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="hover:text-ink-100">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="label-mono mb-4 text-ink-600">Kontak</p>
          <dl className="divide-y divide-ink-800 border-y border-ink-800">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[6rem_1fr] gap-3 py-2.5">
                <dt className="label-mono pt-0.5 text-ink-600">{k}</dt>
                <dd className="text-ink-300">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="container-page mt-12 flex flex-wrap justify-between gap-2 font-mono text-xs text-ink-600">
        <span>© {year} {s.business_name}</span>
        <span>Sewa sound system &amp; perlengkapan acara</span>
      </div>
    </footer>
  );
}
