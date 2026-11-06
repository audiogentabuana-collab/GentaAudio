import Link from 'next/link';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import type { Settings } from '@/features/content/types';
import { displayPhone, waLink } from '@/shared/lib/whatsapp';
import { FacebookIcon, InstagramIcon, TikTokIcon, WhatsAppIcon, YoutubeIcon } from '@/shared/components/BrandIcons';
import { Logo } from './Logo';
import { NAV } from './nav';

export function SocialLinks({ s, className = '' }: { s: Settings; className?: string }) {
  const items = [
    { href: s.instagram, label: 'Instagram', Icon: InstagramIcon },
    { href: s.facebook, label: 'Facebook', Icon: FacebookIcon },
    { href: s.tiktok, label: 'TikTok', Icon: TikTokIcon },
    { href: s.youtube, label: 'YouTube', Icon: YoutubeIcon },
  ].filter((i) => i.href);
  if (!items.length) return null;
  return (
    <ul className={`flex gap-2 ${className}`}>
      {items.map(({ href, label, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-700 text-ink-300 hover:border-brand-400 hover:text-brand-400"
          >
            <Icon size={18} />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter({ s }: { s: Settings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-ink-800 bg-ink-950 pb-24 pt-12 text-sm text-ink-400 md:pb-10">
      <div className="container-page grid gap-10 md:grid-cols-[1.4fr_1fr_1.2fr]">
        <div className="space-y-4">
          <Logo name={s.business_name} logoId={s.logo_id} />
          <p className="max-w-sm leading-relaxed">{s.description || s.tagline}</p>
          <SocialLinks s={s} />
        </div>
        <nav aria-label="Navigasi footer">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-300">Menu</h2>
          <ul className="grid grid-cols-2 gap-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="hover:text-brand-400">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-300">Kontak</h2>
          <ul className="space-y-3">
            {s.whatsapp && (
              <li>
                <a href={waLink(s.whatsapp, s.wa_default_message)} target="_blank" rel="noopener noreferrer" className="flex gap-3 hover:text-brand-400">
                  <WhatsAppIcon size={18} className="mt-0.5 shrink-0" /> {displayPhone(s.whatsapp)}
                </a>
              </li>
            )}
            {s.phone && s.phone !== s.whatsapp && (
              <li>
                <a href={`tel:+${s.phone}`} className="flex gap-3 hover:text-brand-400">
                  <Phone className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden /> {displayPhone(s.phone)}
                </a>
              </li>
            )}
            {s.email && (
              <li>
                <a href={`mailto:${s.email}`} className="flex gap-3 break-all hover:text-brand-400">
                  <Mail className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden /> {s.email}
                </a>
              </li>
            )}
            {s.address && (
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden /> <span>{s.address}</span>
              </li>
            )}
            {s.opening_hours && (
              <li className="flex gap-3">
                <Clock className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden /> <span>{s.opening_hours}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="container-page mt-10 border-t border-ink-800 pt-6 text-xs">
        © {year} {s.business_name}. Semua hak dilindungi.
      </div>
    </footer>
  );
}
