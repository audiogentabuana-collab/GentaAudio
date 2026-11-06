import { notFound } from 'next/navigation';
import { resourceBySlug } from '@/features/admin/resources';
import { ResourceForm } from '@/features/admin/components/ResourceForm';
import { adminList } from '@/server/data/admin';

export default async function NewResourcePage({ params }: PageProps<'/admin/[resource]/baru'>) {
  const { resource } = await params;
  const def = resourceBySlug(resource);
  if (!def) notFound();
  const categories = def.name === 'packages' ? await adminList('categories') : [];
  return <ResourceForm resource={def.name} categories={categories} />;
}
