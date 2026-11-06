import type { Metadata } from 'next';
import { requireAdmin } from '@/server/auth/session';
import { AdminShell } from '@/features/admin/components/AdminShell';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin Genta Buana' },
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return <AdminShell username={session.username}>{children}</AdminShell>;
}
