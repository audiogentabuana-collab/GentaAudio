'use server';

import { redirect } from 'next/navigation';
import { updateTag } from 'next/cache';
import { z } from 'zod';
import {
  changePasswordSchema,
  extractEmbedSrc,
  fieldErrors,
  loginSchema,
  resourceSchemas,
  settingsSchema,
} from '@/features/content/schemas';
import type { AdminCredential, ResourceName } from '@/features/content/types';
import { gas, GasError, userMessage } from '@/server/gas/client';
import { assertAdmin, createSession, destroySession, UnauthorizedError } from '@/server/auth/session';
import { getDummyHash, hashPassword, verifyPassword } from '@/server/auth/password';
import { clientIp } from '@/server/http/ip';
import { PUBLIC_TAG } from '@/server/data/public';
import { RESOURCE_NAMES } from './resources';

export interface ActionResult<T = unknown> {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  data?: T;
}

function failure(err: unknown): ActionResult<never> {
  if (err instanceof UnauthorizedError) return { ok: false, message: err.message };
  if (err instanceof GasError) return { ok: false, message: userMessage(err), errors: err.fieldErrors };
  console.error('[admin action]', err);
  return { ok: false, message: 'Terjadi kesalahan. Silakan coba lagi.' };
}

/** Konten publik berubah → halaman publik ikut diperbarui (read-your-own-writes). */
function publicChanged() {
  updateTag(PUBLIC_TAG);
}

const resourceName = z.enum(RESOURCE_NAMES as [ResourceName, ...ResourceName[]]);
const idSchema = z.string().min(1).max(64);

/* ------------------------------ CRUD konten ------------------------------ */

export async function saveResource(resource: string, id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await assertAdmin();
    const name = resourceName.parse(resource);
    const parsed = resourceSchemas[name].safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: 'Periksa kembali isian yang ditandai.', errors: fieldErrors(parsed.error) };
    }
    const data = parsed.data as Record<string, unknown>;
    const rec = id
      ? await gas<{ id: string }>(`${name}.update`, { id: idSchema.parse(id), data })
      : await gas<{ id: string }>(`${name}.create`, { data });
    publicChanged();
    return { ok: true, message: 'Tersimpan.', data: { id: rec.id } };
  } catch (err) {
    return failure(err);
  }
}

export async function deleteResource(resource: string, id: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const name = resourceName.parse(resource);
    await gas(`${name}.delete`, { id: idSchema.parse(id) });
    publicChanged();
    return { ok: true, message: 'Data dihapus.' };
  } catch (err) {
    return failure(err);
  }
}

export async function toggleResource(resource: string, id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await assertAdmin();
    const name = resourceName.parse(resource);
    await gas(`${name}.toggle`, { id: idSchema.parse(id), is_active: z.boolean().parse(isActive) });
    publicChanged();
    return { ok: true, message: isActive ? 'Ditampilkan di website.' : 'Disembunyikan dari website.' };
  } catch (err) {
    return failure(err);
  }
}

export async function reorderResource(resource: string, ids: string[]): Promise<ActionResult> {
  try {
    await assertAdmin();
    const name = resourceName.parse(resource);
    await gas(`${name}.reorder`, { ids: z.array(idSchema).max(1000).parse(ids) });
    publicChanged();
    return { ok: true, message: 'Urutan disimpan.' };
  } catch (err) {
    return failure(err);
  }
}

/* -------------------------------- Settings -------------------------------- */

export async function saveSettings(input: Record<string, string>): Promise<ActionResult> {
  try {
    await assertAdmin();
    const prepared = { ...input, maps_embed_url: extractEmbedSrc(String(input.maps_embed_url ?? '')) };
    const parsed = settingsSchema.safeParse(prepared);
    if (!parsed.success) {
      return { ok: false, message: 'Periksa kembali isian yang ditandai.', errors: fieldErrors(parsed.error) };
    }
    await gas('settings.update', { values: parsed.data });
    publicChanged();
    return { ok: true, message: 'Pengaturan disimpan.' };
  } catch (err) {
    return failure(err);
  }
}

/* -------------------------------- Sistem -------------------------------- */

/** Untuk setelah mengedit Spreadsheet manual: bersihkan cache Apps Script + Next.js. */
export async function refreshSiteCache(): Promise<ActionResult> {
  try {
    await assertAdmin();
    await gas('system.clearCache');
    publicChanged();
    return { ok: true, message: 'Tampilan website diperbarui dengan data terbaru.' };
  } catch (err) {
    return failure(err);
  }
}

/* --------------------------------- Auth --------------------------------- */

export interface LoginState {
  message?: string;
  errors?: Record<string, string>;
  username?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ username: formData.get('username'), password: formData.get('password') });
  const username = String(formData.get('username') ?? '').slice(0, 50);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), username };

  const ip = await clientIp();
  let admin: AdminCredential | null;
  try {
    ({ admin } = await gas<{ admin: AdminCredential | null }>('auth.getCredential', { username: parsed.data.username, ip }));
  } catch (err) {
    return { message: userMessage(err), username };
  }

  // Selalu verifikasi (pakai hash dummy bila user tidak ada) agar waktu respon sama.
  const valid = await verifyPassword(parsed.data.password, admin?.password_hash ?? (await getDummyHash()));
  if (!admin || !valid) {
    let remaining: number | undefined;
    try {
      ({ remaining } = await gas<{ remaining: number }>('auth.loginFailed', { username: parsed.data.username, ip }));
    } catch {
      /* abaikan */
    }
    const hint = remaining !== undefined && remaining <= 2 ? ` Sisa ${remaining} percobaan sebelum dikunci 15 menit.` : '';
    return { message: 'Username atau password salah.' + hint, username };
  }

  try {
    await gas('auth.loginSucceeded', { id: admin.id, username: admin.username });
  } catch {
    /* tidak kritis */
  }
  await createSession({ id: admin.id, username: admin.username, role: admin.role });

  const next = String(formData.get('next') ?? '');
  redirect(next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin');
}

export async function logout() {
  await destroySession();
  redirect('/admin/login');
}

export async function changePassword(input: { current: string; next: string; confirm: string }): Promise<ActionResult> {
  try {
    const session = await assertAdmin();
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: 'Periksa kembali isian.', errors: fieldErrors(parsed.error) };
    const ip = await clientIp();
    const { admin } = await gas<{ admin: AdminCredential | null }>('auth.getCredential', { username: session.username, ip });
    if (!admin || !(await verifyPassword(parsed.data.current, admin.password_hash))) {
      await gas('auth.loginFailed', { username: session.username, ip }).catch(() => undefined);
      return { ok: false, message: 'Password lama salah.', errors: { current: 'Password lama salah' } };
    }
    await gas('admins.changePassword', { id: admin.id, password_hash: await hashPassword(parsed.data.next) });
    return { ok: true, message: 'Password berhasil diganti.' };
  } catch (err) {
    return failure(err);
  }
}
