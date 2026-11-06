import Link from 'next/link';
import {
  ArrowRight,
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
import { Equalizer, SectionHeading } from '@/features/public/components/Section';
import { CtaBand } from '@/features/public/components/CtaBand';
import { GalleryGrid } from '@/features/public/components/GalleryGrid';
import { TestimonialList } from '@/features/public/components/Testimonials';
import { ButtonLink } from '@/shared/components/ui/Button';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { DriveImage } from '@/shared/components/DriveImage';
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
  { Icon: MessageCircleMore, title: 'Chat / isi form', text: 'Kirim tanggal & lokasi lewat WhatsApp atau form booking. Kami cek ketersediaan.' },
  { Icon: BadgeCheck, title: 'Hari H beres', text: 'Setelah DP, tanggal terkunci. Tim kami datang, pasang, dan mengoperasikan sound.' },
];

export default async function HomePage() {
  const snap = await getPublicSnapshot();
  const s = snap.settings;
  const featured = snap.packages.filter((p) => p.is_featured);
  const showcase = (featured.length ? featured : snap.packages).slice(0, 3);
  const catById = new Map(snap.categories.map((c) => [c.id, c]));
  const waGeneral = waLink(s.whatsapp, s.wa_default_message || `Halo ${s.business_name}, saya ingin bertanya tentang sewa sound.`);
  const minPrice = snap.packages.length ? Math.min(...snap.packages.map((p) => p.price)) : 0;

  return (
    <>
      {/* HERO */}
      <section className="relative -mt-16 overflow-hidden pt-16">
        <div className="absolute inset-0 -z-10">
          {s.hero_image_id ? (
            <>
              <DriveImage fileId={s.hero_image_id} alt="" sizes="100vw" priority />
              <div className="absolute inset-0 bg-gradient-to-b from-ink-950/80 via-ink-950/70 to-ink-950" />
            </>
          ) : (
            <div className="bg-stage absolute inset-0">
              <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
            </div>
          )}
        </div>
        <div className="container-page relative grid items-center gap-12 pb-16 pt-14 sm:pb-24 sm:pt-24 lg:grid-cols-[1.25fr_1fr]">
          <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-400/10 px-3 py-1 text-xs font-semibold text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" aria-hidden /> {s.business_name}
            {s.service_area && !s.service_area.startsWith('[ISI') ? ` · ${s.service_area}` : ''}
          </p>
          <h1 className="mt-5 max-w-3xl text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-100 sm:text-6xl">
            {s.tagline || 'Sewa Sound System & Perlengkapan Acara'}
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-ink-300">{s.description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/pricelist" size="lg">
              Lihat Pricelist <ArrowRight className="h-5 w-5" aria-hidden />
            </ButtonLink>
            <ButtonLink href={waGeneral} external variant="whatsapp" size="lg">
              <WhatsAppIcon size={20} /> Konsultasi Gratis
            </ButtonLink>
          </div>
          {minPrice > 0 && (
            <p className="mt-5 text-sm text-ink-400">
              Paket mulai dari <span className="font-bold text-brand-400">{formatRupiah(minPrice)}</span>
            </p>
          )}
          </div>
          {showcase.length > 0 && (
            <aside className="hidden rounded-3xl border border-ink-700/70 bg-ink-900/70 p-6 shadow-glow backdrop-blur lg:block" aria-label="Paket populer">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-400">
                <Volume2 className="h-4 w-4" aria-hidden /> Paket populer
              </p>
              <ul className="mt-4 divide-y divide-ink-800">
                {showcase.map((p) => (
                  <li key={p.id}>
                    <Link href={`/pricelist/${p.slug}`} className="group flex items-center justify-between gap-4 py-4">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink-100 group-hover:text-brand-400">{p.name}</span>
                        {p.capacity && <span className="block truncate text-sm text-ink-400">{p.capacity}</span>}
                      </span>
                      <span className="shrink-0 text-right font-extrabold text-brand-400">
                        {formatRupiah(p.price)}
                        <span className="block text-xs font-medium text-ink-400">{PRICE_UNIT_LABEL[p.price_unit]}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/pricelist" className="mt-2 flex h-11 items-center justify-center gap-1 rounded-xl border border-ink-700 text-sm font-semibold text-ink-100 hover:border-ink-400">
                Bandingkan semua paket <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </aside>
          )}
        </div>
        <div className="container-page h-16 opacity-60 sm:h-24">
          <Equalizer bars={48} />
        </div>
      </section>

      {/* KEUNGGULAN */}
      <section className="border-t border-ink-800 bg-ink-900/40 py-16 sm:py-20" aria-labelledby="keunggulan">
        <div className="container-page">
          <SectionHeading eyebrow="Kenapa kami" title="Acara lancar, suara memuaskan" description="Kami menangani urusan sound dari awal sampai akhir, supaya Anda dan tamu bisa menikmati acara." />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" id="keunggulan">
            {FEATURES.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-4 rounded-2xl border border-ink-800 bg-ink-900 p-4 sm:block sm:p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-400/10 text-brand-400">
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
              <li key={title} className="relative rounded-2xl border border-ink-800 bg-ink-900 p-6">
                <span className="absolute right-5 top-4 text-5xl font-black text-ink-800" aria-hidden>
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
