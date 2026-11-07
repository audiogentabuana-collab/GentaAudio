import 'server-only';
import { gas } from '../gas/client';
import { assertAdmin } from '../auth/session';
import type {
  AnalyticsSummary,
  DashboardStats,
  ResourceName,
  ResourceRecordMap,
  Settings,
} from '@/features/content/types';

/**
 * Bacaan untuk halaman admin: TIDAK dicache (selalu data terbaru) dan selalu cek sesi.
 */

export async function adminList<R extends ResourceName>(resource: R): Promise<ResourceRecordMap[R][]> {
  await assertAdmin();
  return gas<ResourceRecordMap[R][]>(`${resource}.list`, { includeInactive: true });
}

export async function adminGet<R extends ResourceName>(resource: R, id: string): Promise<ResourceRecordMap[R]> {
  await assertAdmin();
  return gas<ResourceRecordMap[R]>(`${resource}.get`, { id });
}

export async function adminSettings(): Promise<Settings> {
  await assertAdmin();
  return gas<Settings>('settings.get');
}

export async function adminStats(): Promise<DashboardStats> {
  await assertAdmin();
  return gas<DashboardStats>('dashboard.stats');
}

export async function adminAnalytics(days: number): Promise<AnalyticsSummary> {
  await assertAdmin();
  return gas<AnalyticsSummary>('analytics.summary', { days });
}
