import type { Metadata } from 'next';
import { SettingsForm } from '@/features/admin/components/SettingsForm';
import { ChangePasswordForm } from '@/features/admin/components/ChangePasswordForm';
import { PageHeader } from '@/features/admin/components/ui';
import { adminSettings } from '@/server/data/admin';

export const metadata: Metadata = { title: 'Pengaturan' };

export default async function SettingsPage() {
  const settings = await adminSettings();
  return (
    <div className="space-y-4">
      <PageHeader title="Pengaturan" description="Profil usaha, kontak, lokasi, dan tampilan website." />
      <ChangePasswordForm />
      <SettingsForm initial={settings} />
    </div>
  );
}
