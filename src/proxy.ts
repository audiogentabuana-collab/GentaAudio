import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/server/auth/token';

/**
 * Lapis pertama proteksi /admin. Setiap halaman & server action admin
 * tetap memverifikasi sesi lagi (requireAdmin/assertAdmin).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/admin/login') return NextResponse.next();
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = pathname !== '/admin' ? `?next=${encodeURIComponent(pathname)}` : '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
