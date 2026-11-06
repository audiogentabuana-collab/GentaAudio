import { ButtonLink } from '@/shared/components/ui/Button';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { Equalizer } from './Section';

export function CtaBand({ waHref }: { waHref: string }) {
  return (
    <section className="pb-16 sm:pb-20">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl border border-brand-400/30 bg-gradient-to-br from-brand-500 to-brand-700 p-8 sm:p-12">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 opacity-25 md:block">
            <Equalizer bars={20} />
          </div>
          <div className="relative max-w-xl">
            <h2 className="text-balance text-2xl font-extrabold text-ink-950 sm:text-3xl">Tanggal acara sudah ditentukan?</h2>
            <p className="mt-3 text-ink-900">Amankan jadwal sekarang. Musim nikahan cepat penuh, jadi semakin cepat semakin baik.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={waHref} external size="lg" className="bg-ink-950 text-ink-100 hover:bg-ink-900">
                <WhatsAppIcon size={20} /> Chat WhatsApp
              </ButtonLink>
              <ButtonLink href="/kontak" size="lg" variant="outline" className="border-ink-950 text-ink-950 hover:bg-ink-950/10">
                Isi Form Booking
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
