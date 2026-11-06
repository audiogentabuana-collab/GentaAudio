import { notFound } from 'next/navigation';
import { resourceBySlug } from '@/features/admin/resources';
import { ResourceList } from '@/features/admin/components/ResourceList';
import { adminList } from '@/server/data/admin';

export default async function ResourceListPage({ params }: PageProps<'/admin/[resource]'>) {
  const { resource } = await params;
  const def = resourceBySlug(resource);
  if (!def) notFound();
  const [rows, categories] = await Promise.all([
    adminList(def.name),
    def.name === 'packages' ? adminList('categories') : Promise.resolve([]),
  ]);
  return <ResourceList key={rows.map((r) => r.id + r.updated_at).join()} resource={def.name} rows={rows as never} categories={categories} />;
}
