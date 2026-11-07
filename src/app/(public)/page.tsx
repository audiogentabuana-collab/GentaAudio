import { getPublicSnapshot } from '@/server/data/public';
import { PriceList } from '@/features/public/components/PriceList';
import { ArrowLink, SectionHeading } from '@/features/public/components/Section';
import { GalleryGrid } from '@/features/public/components/GalleryGrid';
import { TestimonialList } from '@/features/public/components/Testimonials';
import { CtaBand } from '@/features/public/components/CtaBand';
import { ButtonLink } from '@/shared/components/ui/Button';
import { WhatsAppIcon } from '@/shared/components/BrandIcons';
import { DriveImage } from '@/shared/components/DriveImage';
import { packageWaMessage, waLink } from '@/shared/lib/whatsapp';
import { formatRupiah, PRICE_UNIT_LABEL } from '@/shared/lib/format';
import { siteUrl } from '@/shared/lib/site';

export const revalidate = 3600;

/** Bagi tagline: bagian sebelum "|" (atau separuh awal) diberi warna terang, sisanya abu-abu. */
function splitTagline(tagline: string): [string, string] {
  const t = tagline.trim();
  if (t.includes('|')) {
    const [a, ...rest] = t.split('|');
    return [a.trim(), rest.join(' ').trim()];
  }
  const words = t.split(/\s+/);
  const n = Math.ceil(words.length / 2);
  return [words.slice(0, n).join(' '), words.slice(n).join(' ')];
}

const isFilled = (v: string) => Boolean(v) && !v.startsWith('[ISI');

const STEPS = [
  { title: 'Pilih paket', text: 'Bandingkan isi dan harga paket di daftar harga, sesuaikan dengan jumlah tamu dan luas lokasi.' },
  { title: 'Kirim tanggal & lokasi', text: 'Chat WhatsApp. Kami cek jadwal, beri saran paket, dan kirim total biaya.' },
  { title: 'Hari H', text: 'Setelah jadwal disepakati, tim kami datang memasang dan menyiapkan sound sebelum acara dimulai.' },
];

export default async function HomePage() {
  const snap = await getPublicSnapshot();
  const s = snap.settings;
  const featured = snap.packages.filter((p) => p.is_featured);
  const showcase = (featured.length ? featured : snap.packages).slice(0, 4);
  const waGeneral = waLink(s.whatsapp, s.wa_default_message || `Halo ${s.business_name}, saya ingin bertanya tentang sewa sound.`);
  const minPrice = snap.packages.length ? Math.min(...snap.packages.map((p) => p.price)) : 0;
  const [headA, headB] = splitTagline(s.tagline || 'Sewa Sound System | & Perlengkapan Acara');
  const galleryWithPhotos = snap.gallery.filter((g) => g.image_ids.length > 0);
  const waLinks = Object.fromEntries(
    showcase.map((p) => [
      p.id,
      waLink(
        s.whatsapp,
        packageWaMessage({
          businessName: s.business_name,
          packageName: p.name,
          price: `${formatRupiah(p.price)} ${PRICE_UNIT_LABEL[p.price_unit]}`,
          url: siteUrl(`/pricelist/${p.slug}`),
        }),
      ),
    ]),
  );

  const facts: [string, string][] = [];
  if (minPrice > 0) facts.push(['Harga mulai', formatRupiah(minPrice)]);
  if (snap.packages.length) facts.push(['Pilihan paket', `${snap.packages.length} paket`]);
  if (isFilled(s.service_area)) facts.push(['Area layanan', s.service_area]);
  if (s.opening_hours) facts.push(['Jam layanan', s.opening_hours]);

  return (
    <>
      {/* HERO */}
      <section className="border-b border-ink-800">
        <div className="container-page pb-12 pt-12 sm:pb-16 sm:pt-20">
          <p className="label-mono text-ink-400">Sewa sound system &amp; perlengkapan acara</p>
          <h1 className="mt-6 max-w-5xl text-balance text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.02em] sm:text-7xl lg:text-[5.5rem]">
            <span className="text-ink-100">{headA}</span>
            {headB && <span className="text-ink-600"> {headB}</span>}
          </h1>
          <div className="mt-10 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <p className="max-w-xl text-pretty text-lg leading-relaxed text-ink-400">{s.description}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/pricelist" size="lg">
                Lihat daftar harga
              </ButtonLink>
              <ButtonLink href={waGeneral} external variant="outline" size="lg">
                <WhatsAppIcon size={18} /> Tanya via WhatsApp
              </ButtonLink>
            </div>
          </div>
        </div>

        {s.hero_image_id ? (
          <figure className="container-page pb-12">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[3px] bg-ink-850 sm:aspect-[21/9]">
              <DriveImage fileId={s.hero_image_id} alt={`Dokumentasi acara ${s.business_name}`} sizes="100vw" priority />
            </div>
          </figure>
        ) : null}

        {facts.length > 0 && (
          <dl className="container-page grid grid-cols-2 gap-x-6 md:grid-cols-4">
            {facts.map(([k, v]) => (
              <div key={k} className="border-t border-ink-800 py-5">
                <dt className="label-mono text-ink-600">{k}</dt>
                <dd className="mt-1.5 text-ink-100">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* DAFTAR HARGA */}
      {showcase.length > 0 && (
        <section className="py-16 sm:py-24">
          <div className="container-page">
            <SectionHeading
              title="Paket yang paling sering dipesan"
              description="Harga per acara atau per hari. Isi lengkap tiap paket ada di halaman detailnya."
              action={<ArrowLink href="/pricelist">Semua paket &amp; sewa satuan</ArrowLink>}
            />
            <PriceList packages={showcase} categories={snap.categories} waLinks={waLinks} />
          </div>
        </section>
      )}

      {/* CARA PESAN */}
      <section className="pb-16 sm:pb-24">
        <div className="container-page">
          <SectionHeading title="Cara memesan" />
          <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, i) => (
              <li key={step.title} className="md:border-l md:border-ink-800 md:pl-6 md:first:border-l-0 md:first:pl-0">
                <p className="font-mono text-sm text-brand-400">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-3 text-xl font-medium text-ink-100">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-400">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* DOKUMENTASI — hanya tampil bila sudah ada foto */}
      {galleryWithPhotos.length > 0 && (
        <section className="pb-16 sm:pb-24">
          <div className="container-page">
            <SectionHeading title="Dokumentasi acara" action={<ArrowLink href="/galeri">Lihat galeri</ArrowLink>} />
            <GalleryGrid items={galleryWithPhotos} showFilter={false} limit={6} />
          </div>
        </section>
      )}

      {/* TESTIMONI */}
      {snap.testimonials.length > 0 && (
        <section className="pb-16 sm:pb-24">
          <div className="container-page">
            <SectionHeading title="Kata pelanggan" />
            <TestimonialList items={snap.testimonials.slice(0, 4)} />
          </div>
        </section>
      )}

      <CtaBand waHref={waGeneral} phone={s.whatsapp} />
    </>
  );
}
