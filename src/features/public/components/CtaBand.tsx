import { ButtonLink } from '@/shared/components/ui/Button';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';

export function CtaBand({ waHref }: { waHref: string }) {
  return (
    <section className="pb-16 sm:pb-20">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-xl bg-brand-400 p-8 sm:p-12">
          <div className="relative max-w-xl">
            <h2 className="text-balance text-2xl font-semibold text-ink-950 sm:text-3xl">Tanggal acara sudah ditentukan?</h2>
            <p className="mt-3 text-ink-950/80">Amankan jadwal sekarang. Musim nikahan cepat penuh, jadi semakin cepat semakin baik.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={waHref} external size="lg" className="bg-ink-950 text-ink-100 hover:bg-ink-900">
                <WhatsAppIcon size={20} /> Chat WhatsApp
              </ButtonLink>
              <ButtonLink href="/kontak" size="lg" variant="outline" className="border-ink-950 text-ink-950 hover:bg-ink-950/10">
                Isi Detail Acara
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
