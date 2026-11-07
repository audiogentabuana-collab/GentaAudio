import { notFound } from 'next/navigation';
import { resourceBySlug } from '@/features/admin/resources';
import { ResourceForm } from '@/features/admin/components/ResourceForm';
import { LoadError } from '@/features/admin/components/LoadError';
import { adminList, tryLoad } from '@/server/data/admin';

export default async function NewResourcePage({ params }: PageProps<'/admin/[resource]/baru'>) {
  const { resource } = await params;
  const def = resourceBySlug(resource);
  if (!def) notFound();
  const res = await tryLoad(() => (def.name === 'packages' ? adminList('categories') : Promise.resolve([])));
  if (!res.ok) return <LoadError message={res.message} />;
  return <ResourceForm resource={def.name} categories={res.data} />;
}
