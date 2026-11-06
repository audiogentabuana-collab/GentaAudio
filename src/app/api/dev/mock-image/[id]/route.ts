import { isMockMode } from '@/server/gas/client';

/** Hanya untuk mode mock lokal: menyajikan gambar yang di-upload ke Drive tiruan. */
export async function GET(_req: Request, ctx: RouteContext<'/api/dev/mock-image/[id]'>) {
  if (!isMockMode()) return new Response('Not found', { status: 404 });
  const { id } = await ctx.params;
  const { mockGetFile } = await import('@/server/gas/mock');
  const file = await mockGetFile(id);
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: { 'Content-Type': file.mimeType, 'Cache-Control': 'public, max-age=3600' },
  });
}
