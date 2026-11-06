import type { Faq, Package, Settings } from '@/features/content/types';
import { driveImageUrl } from '@/shared/lib/drive-image';
import { siteUrl } from '@/shared/lib/site';

export function localBusinessJsonLd(s: Settings) {
  const sameAs = [s.instagram, s.facebook, s.tiktok, s.youtube].filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': siteUrl('/#business'),
    name: s.business_name,
    description: s.description || s.tagline,
    url: siteUrl('/'),
    ...(s.whatsapp ? { telephone: '+' + s.whatsapp } : {}),
    ...(s.email ? { email: s.email } : {}),
    ...(s.logo_id ? { logo: driveImageUrl(s.logo_id, 512), image: driveImageUrl(s.hero_image_id || s.logo_id) } : {}),
    ...(s.address && !s.address.startsWith('[ISI') ? { address: { '@type': 'PostalAddress', streetAddress: s.address, addressCountry: 'ID' } } : {}),
    ...(s.service_area && !s.service_area.startsWith('[ISI') ? { areaServed: s.service_area } : {}),
    ...(s.maps_url ? { hasMap: s.maps_url } : {}),
    ...(s.opening_hours ? { openingHours: s.opening_hours } : {}),
    priceRange: 'Rp',
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function packageJsonLd(p: Package, s: Settings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: p.name,
    serviceType: 'Sewa sound system',
    description: p.description,
    url: siteUrl(`/pricelist/${p.slug}`),
    ...(p.image_ids[0] ? { image: driveImageUrl(p.image_ids[0]) } : {}),
    provider: { '@id': siteUrl('/#business'), '@type': 'LocalBusiness', name: s.business_name },
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'IDR',
      availability: 'https://schema.org/InStock',
      url: siteUrl(`/pricelist/${p.slug}`),
    },
  };
}

export function faqJsonLd(faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: siteUrl(it.path) })),
  };
}
