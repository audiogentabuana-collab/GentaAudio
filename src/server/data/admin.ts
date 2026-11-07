import 'server-only';
import { redirect, unstable_rethrow } from 'next/navigation';
import { adminMessage, gas, GasError } from '../gas/client';
import { assertAdmin, UnauthorizedError } from '../auth/session';
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

/**
 * Jalankan pemuatan data admin; bila gagal, kembalikan pesan penyebab asli
 * (ditampilkan oleh <LoadError/>) alih-alih menjatuhkan seluruh halaman.
 */
export async function tryLoad<T>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof UnauthorizedError) redirect('/admin/login');
    console.error('[admin] gagal memuat data:', err instanceof GasError ? `${err.code} ${err.message}` : err);
    return { ok: false, message: adminMessage(err) };
  }
}
