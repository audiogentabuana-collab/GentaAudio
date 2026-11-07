import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { displayPhone } from '@/shared/lib/whatsapp';

/** Penutup halaman: nomor WhatsApp ditampilkan besar dan bisa langsung diklik. */
export function CtaBand({ waHref, phone }: { waHref: string; phone?: string }) {
  return (
    <section className="border-t border-ink-800">
      <div className="container-page grid gap-8 py-16 sm:py-24 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="label-mono mb-4 text-ink-400">Cek tanggal &amp; konsultasi gratis</p>
          <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight text-ink-100 sm:text-5xl">
            Tanggal acara sudah pasti? Tanyakan ketersediaannya sekarang.
          </h2>
        </div>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-3 self-start rounded-[3px] bg-brand-400 px-5 py-4 text-ink-950 hover:bg-brand-300 md:self-end"
        >
          <WhatsAppIcon size={22} />
          <span>
            <span className="block text-sm">Chat WhatsApp</span>
            {phone && <span className="block font-mono text-lg">{displayPhone(phone)}</span>}
          </span>
        </a>
      </div>
    </section>
  );
}
