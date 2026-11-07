import type { Metadata } from 'next';
import { SettingsForm } from '@/features/admin/components/SettingsForm';
import { ChangePasswordForm } from '@/features/admin/components/ChangePasswordForm';
import { PageHeader } from '@/features/admin/components/ui';
import { adminSettings, tryLoad } from '@/server/data/admin';
import { LoadError } from '@/features/admin/components/LoadError';

export const metadata: Metadata = { title: 'Pengaturan' };

export default async function SettingsPage() {
  const res = await tryLoad(() => adminSettings());
  if (!res.ok) return <LoadError message={res.message} title="Pengaturan gagal dimuat" />;
  const settings = res.data;
  return (
    <div className="space-y-4">
      <PageHeader title="Pengaturan" description="Profil usaha, kontak, lokasi, dan tampilan website." />
      <ChangePasswordForm />
      <SettingsForm initial={settings} />
    </div>
  );
}
