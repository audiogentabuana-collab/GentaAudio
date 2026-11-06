import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { uploadSchema } from '@/features/content/schemas';
import { getSession } from '@/server/auth/session';
import { gas, GasError, userMessage } from '@/server/gas/client';

/**
 * Upload gambar (1 gambar per request) → Apps Script → Google Drive.
 * Route Handler dipakai (bukan Server Action) karena body base64 bisa >1MB.
 * Batas body Vercel Functions ±4,5MB; client mengompres ke ≤1MB sebelum kirim.
 */
export const maxDuration = 60;

function sameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get('host');
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, message: 'Origin tidak diizinkan.' }, { status: 403 });
  if (!(await getSession())) return NextResponse.json({ ok: false, message: 'Sesi berakhir. Silakan login kembali.' }, { status: 401 });

  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > 3 * 1024 * 1024) {
    return NextResponse.json({ ok: false, message: 'Ukuran gambar terlalu besar.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Data tidak valid.' }, { status: 400 });
  }
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }

  try {
    const data = await gas<{ fileId: string }>('upload.image', parsed.data);
    return NextResponse.json({ ok: true, fileId: data.fileId });
  } catch (err) {
    const status = err instanceof GasError && err.code === 'VALIDATION' ? 400 : 502;
    return NextResponse.json({ ok: false, message: userMessage(err) }, { status });
  }
}

/** Hapus gambar yang baru di-upload tapi batal dipakai (belum tersimpan di data). */
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  if (!(await getSession())) return NextResponse.json({ ok: false }, { status: 401 });
  const fileId = z.string().regex(/^[A-Za-z0-9_-]{10,128}$/).safeParse(req.nextUrl.searchParams.get('fileId'));
  if (!fileId.success) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    await gas('upload.delete', { fileId: fileId.data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, message: userMessage(err) }, { status: 502 });
  }
}
