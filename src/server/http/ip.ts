import 'server-only';
import { headers } from 'next/headers';

/** IP klien (Vercel mengisi x-forwarded-for / x-real-ip). Dipakai untuk rate limit. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (fwd || h.get('x-real-ip') || 'unknown').slice(0, 64);
}
