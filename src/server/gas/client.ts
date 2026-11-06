import 'server-only';
import { z } from 'zod';

/**
 * Klien server-to-server ke Apps Script Web App.
 * - Hanya berjalan di server (import 'server-only'): API key tidak pernah sampai ke browser.
 * - Format: POST { apiKey, action, payload } → { success, data, message, code? }
 * - Apps Script membalas 302 → script.googleusercontent.com; fetch mengikuti redirect.
 * - Timeout + retry 1x untuk action baca (bukan untuk tulis, agar tidak dobel).
 */

export class GasError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'GasError';
  }

  get fieldErrors(): Record<string, string> | undefined {
    const d = this.details as { fieldErrors?: Record<string, string> } | null | undefined;
    return d?.fieldErrors;
  }
}

const envelopeSchema = z.object({
  success: z.boolean(),
  data: z.unknown(),
  message: z.string().optional().default(''),
  code: z.string().optional(),
});

const READ_ACTION = /(\.list|\.get|\.snapshot|\.stats|\.ping|\.getCredential)$/;
const RETRYABLE = new Set(['NETWORK', 'TIMEOUT', 'BUSY', 'BAD_RESPONSE']);

export function isMockMode() {
  return process.env.GAS_MOCK === 'true';
}

function config() {
  const url = process.env.GAS_WEB_APP_URL;
  const apiKey = process.env.GAS_API_KEY;
  if (!url || !apiKey) {
    throw new GasError('CONFIG', 'GAS_WEB_APP_URL dan GAS_API_KEY belum diisi di environment.');
  }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) {
    throw new GasError('CONFIG', 'GAS_WEB_APP_URL harus berformat https://script.google.com/macros/s/<id>/exec');
  }
  return { url, apiKey, timeoutMs: Number(process.env.GAS_TIMEOUT_MS ?? 15000) };
}

async function callRemote(action: string, payload: unknown): Promise<unknown> {
  const { url, apiKey, timeoutMs } = config();
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      // text/plain menghindari preflight & cocok dengan e.postData.contents di Apps Script
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ apiKey, action, payload }),
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const name = (err as Error)?.name;
    if (name === 'TimeoutError' || name === 'AbortError') {
      throw new GasError('TIMEOUT', 'Server data tidak merespon. Silakan coba lagi.');
    }
    throw new GasError('NETWORK', 'Gagal terhubung ke server data.');
  }
  const text = await res.text();
  if (!res.ok) throw new GasError('BAD_RESPONSE', `Apps Script membalas HTTP ${res.status}.`);
  try {
    return JSON.parse(text);
  } catch {
    // Biasanya halaman login Google: deployment belum "Who has access: Anyone"
    throw new GasError(
      'BAD_RESPONSE',
      'Apps Script tidak mengembalikan JSON. Pastikan Web App di-deploy dengan "Execute as: Me" dan "Who has access: Anyone".',
    );
  }
}

async function callMock(action: string, payload: unknown): Promise<unknown> {
  const { mockCall } = await import('./mock');
  return mockCall(action, payload);
}

export async function gas<T = unknown>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const attempts = READ_ACTION.test(action) ? 2 : 1;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const started = Date.now();
    try {
      const raw = isMockMode() ? await callMock(action, payload) : await callRemote(action, payload);
      const env = envelopeSchema.safeParse(raw);
      if (!env.success) throw new GasError('BAD_RESPONSE', 'Format response Apps Script tidak dikenali.');
      if (!env.data.success) {
        throw new GasError(env.data.code ?? 'ERROR', env.data.message || 'Permintaan gagal.', env.data.data);
      }
      if (process.env.NODE_ENV !== 'production') {
        console.info(`[gas] ${action} ${Date.now() - started}ms`);
      }
      return env.data.data as T;
    } catch (err) {
      lastErr = err;
      const code = err instanceof GasError ? err.code : 'NETWORK';
      if (i + 1 < attempts && RETRYABLE.has(code)) {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      if (!(err instanceof GasError)) {
        console.error(`[gas] ${action} error`, err);
        throw new GasError('INTERNAL', 'Terjadi kesalahan saat memproses data.');
      }
      if (code === 'CONFIG' || code === 'UNAUTHORIZED' || code === 'BAD_RESPONSE' || code === 'INTERNAL') {
        console.error(`[gas] ${action} ${code}: ${err.message}`);
      }
      throw err;
    }
  }
  throw lastErr;
}

/** Pesan aman untuk ditampilkan ke pengguna dari error apa pun. */
export function userMessage(err: unknown): string {
  if (err instanceof GasError) {
    if (err.code === 'CONFIG' || err.code === 'UNAUTHORIZED' || err.code === 'BAD_RESPONSE') {
      return 'Server data belum terkonfigurasi dengan benar. Hubungi pengelola website.';
    }
    return err.message;
  }
  return 'Terjadi kesalahan. Silakan coba lagi.';
}
