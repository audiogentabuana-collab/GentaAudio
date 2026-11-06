/**
 * Token sesi (JWT HS256 via jose). Terpisah dari session.ts agar bisa dipakai
 * di proxy.ts dan unit test tanpa next/headers.
 */
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'gb_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

export interface SessionData {
  id: string;
  username: string;
  role: 'owner' | 'staff';
}

function secretKey() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET belum diisi atau kurang dari 32 karakter.');
  }
  return new TextEncoder().encode(s);
}

export async function signSession(data: SessionData) {
  return new SignJWT({ username: data.username, role: data.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(data.id)
    .setIssuedAt()
    .setIssuer('gentabuana')
    .setAudience('gentabuana-admin')
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined | null): Promise<SessionData | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ['HS256'],
      issuer: 'gentabuana',
      audience: 'gentabuana-admin',
    });
    if (!payload.sub || typeof payload.username !== 'string') return null;
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role === 'staff' ? 'staff' : 'owner',
    };
  } catch {
    return null;
  }
}
