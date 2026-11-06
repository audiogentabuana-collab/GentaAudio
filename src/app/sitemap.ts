import type { MetadataRoute } from 'next';
import { getPublicSnapshot } from '@/server/data/public';
import { siteUrl } from '@/shared/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const snap = await getPublicSnapshot();
  const now = snap.generated_at ? new Date(snap.generated_at) : new Date();
  const statics: MetadataRoute.Sitemap = [
    { url: siteUrl('/'), changeFrequency: 'weekly', priority: 1, lastModified: now },
    { url: siteUrl('/pricelist'), changeFrequency: 'weekly', priority: 0.9, lastModified: now },
    { url: siteUrl('/galeri'), changeFrequency: 'weekly', priority: 0.7, lastModified: now },
    { url: siteUrl('/kontak'), changeFrequency: 'monthly', priority: 0.8, lastModified: now },
    { url: siteUrl('/tentang'), changeFrequency: 'monthly', priority: 0.5, lastModified: now },
    { url: siteUrl('/faq'), changeFrequency: 'monthly', priority: 0.5, lastModified: now },
  ];
  const packages = snap.packages.map((p) => ({
    url: siteUrl(`/pricelist/${p.slug}`),
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));
  return [...statics, ...packages];
}
