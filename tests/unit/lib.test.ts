import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { signSession, verifySession } from '@/server/auth/token';
import { gas, GasError, userMessage } from '@/server/gas/client';
import { waLink, normalizePhone, displayPhone, packageWaMessage } from '@/shared/lib/whatsapp';
import { formatRupiah } from '@/shared/lib/format';
import { buildBookingMessage } from '@/features/public/components/WhatsAppComposer';
import { driveImageUrl } from '@/shared/lib/drive-image';
import { packageSchema, settingsSchema, extractEmbedSrc, uploadSchema } from '@/features/content/schemas';

describe('password (scrypt)', () => {
  it('hash & verify', async () => {
    const h = await hashPassword('rahasia123');
    expect(h).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(await verifyPassword('rahasia123', h)).toBe(true);
    expect(await verifyPassword('salah', h)).toBe(false);
    expect(await verifyPassword('rahasia123', 'bukan-hash')).toBe(false);
  });

  it('kompatibel dengan scripts/hash-password.mjs', async () => {
    const out = execFileSync('node', ['scripts/hash-password.mjs', 'kata-sandi-panjang'], { encoding: 'utf8' });
    const hash = out.split('\n').find((l) => l.startsWith('scrypt$'))!;
    expect(await verifyPassword('kata-sandi-panjang', hash)).toBe(true);
  });

  it('menolak parameter scrypt yang berlebihan (cegah DoS)', async () => {
    expect(await verifyPassword('x', 'scrypt$99999999$8$1$AAAA$AAAA')).toBe(false);
  });
});

describe('session token', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'x'.repeat(40);
  });

  it('sign & verify', async () => {
    const t = await signSession({ id: 'u1', username: 'owner', role: 'owner' });
    expect(await verifySession(t)).toEqual({ id: 'u1', username: 'owner', role: 'owner' });
  });

  it('token dengan secret lain / rusak ditolak', async () => {
    const t = await signSession({ id: 'u1', username: 'owner', role: 'owner' });
    process.env.SESSION_SECRET = 'y'.repeat(40);
    expect(await verifySession(t)).toBeNull();
    expect(await verifySession('abc.def.ghi')).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
  });

  it('wajib SESSION_SECRET >= 32 karakter', async () => {
    process.env.SESSION_SECRET = 'pendek';
    await expect(signSession({ id: 'u', username: 'a', role: 'owner' })).rejects.toThrow(/SESSION_SECRET/);
  });
});

describe('gas client', () => {
  const URL = 'https://script.google.com/macros/s/ABC123/exec';
  beforeEach(() => {
    process.env.GAS_MOCK = 'false';
    process.env.GAS_WEB_APP_URL = URL;
    process.env.GAS_API_KEY = 'k'.repeat(40);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('mengirim { apiKey, action, payload } dan mengembalikan data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { a: 1 }, message: 'OK' })));
    vi.stubGlobal('fetch', fetchMock);
    const data = await gas('packages.list', { includeInactive: true });
    expect(data).toEqual({ a: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(URL);
    expect(init.method).toBe('POST');
    expect(init.redirect).toBe('follow');
    expect(JSON.parse(init.body)).toEqual({ apiKey: 'k'.repeat(40), action: 'packages.list', payload: { includeInactive: true } });
  });

  it('meneruskan error Apps Script sebagai GasError (dengan fieldErrors)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: false, code: 'VALIDATION', message: 'Periksa', data: { fieldErrors: { name: 'wajib' } } })),
      ),
    );
    const err = (await gas('faqs.create', {}).catch((e) => e)) as GasError;
    expect(err).toBeInstanceOf(GasError);
    expect(err.code).toBe('VALIDATION');
    expect(err.fieldErrors).toEqual({ name: 'wajib' });
  });

  it('response HTML (belum di-share Anyone) → BAD_RESPONSE dengan pesan jelas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Sign in</html>')));
    const err = (await gas('faqs.create', {}).catch((e) => e)) as GasError;
    expect(err.code).toBe('BAD_RESPONSE');
    expect(err.message).toMatch(/Who has access: Anyone/);
    expect(userMessage(err)).not.toMatch(/Anyone/); // pesan publik tidak membocorkan detail
  });

  it('retry 1x untuk action baca, tidak untuk tulis', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', f);
    await expect(gas('public.snapshot')).rejects.toMatchObject({ code: 'NETWORK' });
    expect(f).toHaveBeenCalledTimes(2);
    f.mockClear();
    await expect(gas('bookings.create', {})).rejects.toMatchObject({ code: 'NETWORK' });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('konfigurasi URL salah ditolak', async () => {
    process.env.GAS_WEB_APP_URL = 'https://evil.example/exec';
    await expect(gas('system.ping')).rejects.toMatchObject({ code: 'CONFIG' });
  });

  it('mode mock memakai kode Apps Script asli', async () => {
    process.env.GAS_MOCK = 'true';
    const data = await gas<{ version: string }>('system.ping');
    expect(data.version).toBe('1.0.0');
  });
});

describe('util', () => {
  it('nomor WA & link', () => {
    expect(normalizePhone('0812-3456-7890')).toBe('6281234567890');
    expect(normalizePhone('+62 812 3456 7890')).toBe('6281234567890');
    expect(displayPhone('6281234567890')).toBe('0812-3456-7890');
    expect(waLink('08123', 'Halo & salam')).toBe('https://wa.me/628123?text=Halo%20%26%20salam');
    expect(packageWaMessage({ businessName: 'Genta Buana', packageName: 'Paket A', price: 'Rp 1' })).toContain('*Paket A*');
  });

  it('format rupiah', () => {
    expect(formatRupiah(1500000)).toBe('Rp 1.500.000');
  });

  it('URL gambar Drive', () => {
    expect(driveImageUrl('abcDEF123456')).toBe('https://drive.google.com/thumbnail?id=abcDEF123456&sz=w1600');
    expect(driveImageUrl('mockabc')).toBe('/api/dev/mock-image/mockabc');
  });
});

describe('schemas', () => {
  it('paket: harga dari string angka dikonversi', () => {
    const r = packageSchema.parse({ category_id: 'c', name: 'P', price: '1500000', price_unit: 'per_acara' });
    expect(r.price).toBe(1500000);
    expect(r.specs).toEqual([]);
  });

  it('settings: tolak key asing & embed maps domain lain', () => {
    const base = { business_name: 'G', whatsapp: '08123456789' };
    expect(settingsSchema.safeParse({ ...base, hacker: 1 }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, maps_embed_url: 'https://evil.example' }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, maps_embed_url: 'https://www.google.com/maps/embed?pb=1' }).success).toBe(true);
  });

  it('extractEmbedSrc mengambil src dari kode iframe', () => {
    expect(extractEmbedSrc('<iframe src="https://www.google.com/maps/embed?pb=x" width="600"></iframe>')).toBe(
      'https://www.google.com/maps/embed?pb=x',
    );
  });

  it('upload: tolak tipe non-gambar & ukuran besar', () => {
    expect(uploadSchema.safeParse({ mimeType: 'application/pdf', base64: 'AAAA' }).success).toBe(false);
    expect(uploadSchema.safeParse({ mimeType: 'image/png', base64: 'A'.repeat(3_000_000) }).success).toBe(false);
    expect(uploadSchema.safeParse({ mimeType: 'image/png', base64: 'AAAA' }).success).toBe(true);
  });
});

describe('pesan WhatsApp dari halaman kontak', () => {
  const pkg = { id: 'p1', name: 'Paket Hajatan Standar', price: 1500000, price_unit: 'per_acara' } as never;

  it('memuat semua isian yang diisi', () => {
    const msg = buildBookingMessage(
      'Genta Buana',
      { name: 'Budi', event_date: '2026-12-20', location: 'Desa Sukamaju', event_type: 'Nikahan', package_id: 'p1', note: '300 tamu' },
      pkg,
    );
    expect(msg).toContain('Halo Genta Buana');
    expect(msg).toContain('Nama: Budi');
    expect(msg).toContain('Tanggal acara: Minggu, 20 Desember 2026');
    expect(msg).toContain('Lokasi: Desa Sukamaju');
    expect(msg).toContain('Jenis acara: Nikahan');
    expect(msg).toContain('Paket: Paket Hajatan Standar (Rp 1.500.000 per acara)');
    expect(msg).toContain('Catatan: 300 tamu');
  });

  it('isian kosong dilewati tanpa baris kosong berlebih', () => {
    const msg = buildBookingMessage('Genta Buana', { name: '', event_date: '', location: '', event_type: '', package_id: '', note: '' });
    expect(msg).not.toMatch(/Nama:|Paket:/);
    expect(msg).not.toMatch(/\n{3,}/);
    expect(msg.endsWith('Terima kasih.')).toBe(true);
  });
});
