import { after, NextResponse, userAgent, type NextRequest } from 'next/server';
import { z } from 'zod';
import { gas } from '@/server/gas/client';

/**
 * Pencatat analitik (dipanggil navigator.sendBeacon dari browser).
 * Tidak memakai cookie & tidak menyimpan IP. Bot diabaikan.
 * Penerusan ke Apps Script dilakukan setelah respons dikirim (after),
 * jadi pengunjung tidak menunggu.
 */
const eventSchema = z.object({
  type: z.enum(['view', 'wa_click']),
  path: z.string().max(200).startsWith('/'),
  ref: z.string().max(100).regex(/^[a-z0-9.-]*$/).optional(),
  device: z.enum(['mobile', 'desktop']).optional(),
  nv: z.boolean().optional(),
  pkg: z.string().max(140).regex(/^[a-z0-9-]*$/).optional(),
});

export async function POST(req: NextRequest) {
  if (userAgent(req).isBot) return new NextResponse(null, { status: 204 });
  if (Number(req.headers.get('content-length') ?? 0) > 2048) return new NextResponse(null, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  after(async () => {
    try {
      await gas('analytics.track', { events: [parsed.data] });
    } catch (err) {
      console.warn('[analytics] gagal mencatat:', (err as Error).message);
    }
  });
  return new NextResponse(null, { status: 204 });
}
