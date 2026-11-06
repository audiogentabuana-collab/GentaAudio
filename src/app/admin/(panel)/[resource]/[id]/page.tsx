import { notFound } from 'next/navigation';
import { resourceBySlug } from '@/features/admin/resources';
import { ResourceForm } from '@/features/admin/components/ResourceForm';
import { adminGet, adminList } from '@/server/data/admin';
import { GasError } from '@/server/gas/client';

export default async function EditResourcePage({ params }: PageProps<'/admin/[resource]/[id]'>) {
  const { resource, id } = await params;
  const def = resourceBySlug(resource);
  if (!def) notFound();
  let record;
  try {
    record = await adminGet(def.name, id);
  } catch (err) {
    if (err instanceof GasError && err.code === 'NOT_FOUND') notFound();
    throw err;
  }
  const categories = def.name === 'packages' ? await adminList('categories') : [];
  return <ResourceForm resource={def.name} id={id} initial={record as unknown as Record<string, unknown>} categories={categories} />;
}
