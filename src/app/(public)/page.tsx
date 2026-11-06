import Link from 'next/link';
import {
  ArrowRight,
  Check,
  BadgeCheck,
  Clock,
  Headphones,
  ListChecks,
  MessageCircleMore,
  ReceiptText,
  ShieldCheck,
  Truck,
  Volume2,
} from 'lucide-react';
import { getPublicSnapshot } from '@/server/data/public';
import { PackageCard } from '@/features/public/components/PackageCard';
import { SectionHeading } from '@/features/public/components/Section';
import { HeroVisual, splitTagline } from '@/features/public/components/HeroVisual';
import { CtaBand } from '@/features/public/components/CtaBand';
import { GalleryGrid } from '@/features/public/components/GalleryGrid';
import { TestimonialList } from '@/features/public/components/Testimonials';
import { ButtonLink } from '@/shared/components/ui/Button';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { packageWaMessage, waLink } from '@/shared/lib/whatsapp';
import { formatRupiah, PRICE_UNIT_LABEL } from '@/shared/lib/format';
import { siteUrl } from '@/shared/lib/site';

export const revalidate = 3600;

const FEATURES = [
  { Icon: Volume2, title: 'Suara jernih & bertenaga', text: 'Speaker, subwoofer, dan mixer yang disesuaikan dengan luas lokasi dan jumlah tamu.' },
  { Icon: Headphones, title: 'Operator berpengalaman', text: 'Sound diatur langsung oleh operator kami selama acara berlangsung.' },
  { Icon: Truck, title: 'Antar, pasang, bongkar', text: 'Anda cukup fokus pada acara. Pemasangan dan pembongkaran kami yang urus.' },
  { Icon: ShieldCheck, title: 'Peralatan terawat', text: 'Unit dicek sebelum berangkat dan selalu dibawa cadangan mic & kabel.' },
  { Icon: Clock, title: 'Tepat waktu', text: 'Datang lebih awal untuk tes suara, sehingga acara dimulai tanpa kendala.' },
  { Icon: ReceiptText, title: 'Harga transparan', text: 'Harga paket jelas sejak awal. Tidak ada biaya tambahan mendadak.' },
];

const STEPS = [
  { Icon: ListChecks, title: 'Pilih paket', text: 'Bandingkan paket di halaman pricelist sesuai jenis acara dan jumlah tamu.' },
  { Icon: MessageCircleMore, title: 'Chat WhatsApp', text: 'Kirim tanggal & lokasi acara lewat WhatsApp. Kami cek ketersediaan dan beri penawaran.' },
  { Icon: BadgeCheck, title: 'Hari H beres', text: 'Setelah DP, tanggal terkunci. Tim kami datang, pasang, dan mengoperasikan sound.' },
];

export default async function HomePage() {
  const snap = await getPublicSnapshot();
  const s = snap.settings;
  const featured = snap.packages.filter((p) => p.is_featured);
  const showcase = (featured.length ? featured : snap.packages).slice(0, 3);
  const catById = new Map(snap.categories.map((c) => [c.id, c]));
  const waGeneral = waLink(s.whatsapp, s.wa_default_message || `Halo ${s.business_name}, saya ingin bertanya tentang sewa sound.`);
  const [headA, headB] = splitTagline(s.tagline || 'Sewa Sound System | & Perlengkapan Acara');
  const minPrice = snap.packages.length ? Math.min(...snap.packages.map((p) => p.price)) : 0;

  return (
    <>
      {/* HERO */}
      <section className="relative -mt-16 overflow-hidden pt-16">
        <div className="bg-grid absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]" aria-hidden />
        <div className="container-page grid items-center gap-10 pb-16 pt-10 sm:pb-24 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-6">
          <div>
            <h1 className="text-balance text-[2.6rem] font-semibold leading-[1.08] tracking-tight sm:text-6xl">
              <span className="text-brand-400">{headA}</span> {headB && <span className="text-ink-300">{headB}</span>}
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-ink-400 sm:text-lg">{s.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/pricelist" size="lg">
                Lihat Pricelist
              </ButtonLink>
              <ButtonLink href={waGeneral} external variant="outline" size="lg">
                <WhatsAppIcon size={18} /> Konsultasi Gratis
              </ButtonLink>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-400 sm:text-base">
              {['Operator berpengalaman', 'Antar-pasang-bongkar', 'Harga transparan'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-400" strokeWidth={3} aria-hidden /> {t}
                </li>
              ))}
            </ul>
            {minPrice > 0 && (
              <p className="mt-6 text-sm text-ink-400">
                Paket mulai dari <span className="font-semibold text-ink-100">{formatRupiah(minPrice)}</span>
              </p>
            )}
          </div>
          <HeroVisual imageId={s.hero_image_id} alt={`Dokumentasi acara ${s.business_name}`} />
        </div>
      </section>

      {/* KEUNGGULAN */}
      <section className="border-t border-ink-800 bg-ink-900/40 py-16 sm:py-20" aria-labelledby="keunggulan">
        <div className="container-page">
          <SectionHeading eyebrow="Kenapa kami" title="Acara lancar, suara memuaskan" description="Kami menangani urusan sound dari awal sampai akhir, supaya Anda dan tamu bisa menikmati acara." />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" id="keunggulan">
            {FEATURES.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-4 rounded-xl border border-ink-800 bg-ink-900 p-4 sm:block sm:p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-brand-400">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h3 className="font-bold text-ink-100 sm:mt-4">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-400 sm:mt-1.5">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PAKET UNGGULAN */}
      {showcase.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="Paket unggulan"
              title="Paket favorit pelanggan"
              action={
                <Link href="/pricelist" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300">
                  Semua paket <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              }
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {showcase.map((p) => (
                <PackageCard
                  key={p.id}
                  pkg={p}
                  category={catById.get(p.category_id)}
                  waHref={waLink(
                    s.whatsapp,
                    packageWaMessage({
                      businessName: s.business_name,
                      packageName: p.name,
                      price: `${formatRupiah(p.price)} ${PRICE_UNIT_LABEL[p.price_unit]}`,
                      url: siteUrl(`/pricelist/${p.slug}`),
                    }),
                  )}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CARA PESAN */}
      <section className="border-y border-ink-800 bg-ink-900/40 py-16 sm:py-20">
        <div className="container-page">
          <SectionHeading eyebrow="Cara pesan" title="3 langkah mudah" align="center" />
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map(({ Icon, title, text }, i) => (
              <li key={title} className="relative rounded-xl border border-ink-800 bg-ink-900 p-6">
                <span className="absolute right-5 top-4 text-5xl font-bold text-ink-800" aria-hidden>
                  {i + 1}
                </span>
                <Icon className="h-8 w-8 text-brand-400" aria-hidden />
                <h3 className="mt-4 text-lg font-bold text-ink-100">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* GALERI */}
      {snap.gallery.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="Portofolio"
              title="Acara yang sudah kami tangani"
              action={
                <Link href="/galeri" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300">
                  Lihat galeri <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              }
            />
            <GalleryGrid items={snap.gallery} showFilter={false} limit={6} />
          </div>
        </section>
      )}

      {/* TESTIMONI */}
      {snap.testimonials.length > 0 && (
        <section className="border-t border-ink-800 py-16 sm:py-20">
          <div className="container-page">
            <SectionHeading eyebrow="Testimoni" title="Kata mereka tentang kami" />
            <TestimonialList items={snap.testimonials.slice(0, 6)} />
          </div>
        </section>
      )}

      <CtaBand waHref={waGeneral} />
    </>
  );
}
