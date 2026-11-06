import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type SessionData } from './token';

export type { SessionData };

export async function createSession(data: SessionData) {
  const token = await signSession(data);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionData | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/** Untuk halaman admin: redirect ke login bila belum masuk. */
export async function requireAdmin(): Promise<SessionData> {
  const s = await getSession();
  if (!s) redirect('/admin/login');
  return s;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Sesi berakhir. Silakan login kembali.');
  }
}

/** Untuk server action / route handler: lempar error bila belum masuk. */
export async function assertAdmin(): Promise<SessionData> {
  const s = await getSession();
  if (!s) throw new UnauthorizedError();
  return s;
}
