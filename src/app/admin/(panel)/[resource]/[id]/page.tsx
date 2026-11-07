import { notFound } from 'next/navigation';
import { resourceBySlug } from '@/features/admin/resources';
import { ResourceForm } from '@/features/admin/components/ResourceForm';
import { LoadError } from '@/features/admin/components/LoadError';
import { adminGet, adminList, tryLoad } from '@/server/data/admin';
import { GasError } from '@/server/gas/client';

export default async function EditResourcePage({ params }: PageProps<'/admin/[resource]/[id]'>) {
  const { resource, id } = await params;
  const def = resourceBySlug(resource);
  if (!def) notFound();
  const res = await tryLoad(async () => {
    try {
      return await Promise.all([adminGet(def.name, id), def.name === 'packages' ? adminList('categories') : Promise.resolve([])]);
    } catch (err) {
      if (err instanceof GasError && err.code === 'NOT_FOUND' && !err.message.startsWith('Action tidak dikenal')) notFound();
      throw err;
    }
  });
  if (!res.ok) return <LoadError message={res.message} title={`${def.singular} gagal dibuka`} />;
  const [record, categories] = res.data;
  return <ResourceForm resource={def.name} id={id} initial={record as unknown as Record<string, unknown>} categories={categories} />;
}
