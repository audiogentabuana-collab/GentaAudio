import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { createGasRuntime, type GasRuntime } from './harness';
import { hashPassword } from '../auth/password';

/**
 * Mode mock (GAS_MOCK=true): menjalankan kode Apps Script asli secara lokal
 * dengan Spreadsheet/Drive tiruan. State disimpan ke .mock-gas/state.json supaya
 * tetap ada setelah restart dan konsisten antar proses (build vs server).
 * Hapus folder .mock-gas untuk reset ke data contoh.
 */

const STATE_DIR = path.join(process.cwd(), '.mock-gas');
const STATE_FILE = path.join(STATE_DIR, 'state.json');
const READ_ONLY = /(\.list|\.get|\.snapshot|\.stats|\.ping)$/;

interface MockHolder {
  runtime: GasRuntime;
  loadedMtime: number;
}

const g = globalThis as unknown as { __gentaMock?: Promise<MockHolder> };

function mtime() {
  try {
    return fs.statSync(STATE_FILE).mtimeMs;
  } catch {
    return 0;
  }
}

function persist(holder: MockHolder) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const tmp = STATE_FILE + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(holder.runtime.exportState()));
  fs.renameSync(tmp, STATE_FILE);
  holder.loadedMtime = mtime();
}

async function init(): Promise<MockHolder> {
  if (process.env.VERCEL === '1') {
    throw new Error('GAS_MOCK tidak boleh aktif di Vercel. Set GAS_MOCK=false.');
  }
  const username = process.env.MOCK_ADMIN_USERNAME || 'admin';
  const password = process.env.MOCK_ADMIN_PASSWORD || 'admin12345';
  const runtime = createGasRuntime({
    quiet: true,
    properties: {
      API_KEY: 'mock-api-key-not-secret-0123456789abcdef',
      ADMIN_INITIAL_USERNAME: username,
      ADMIN_INITIAL_PASSWORD_HASH: await hashPassword(password),
    },
  });
  const holder: MockHolder = { runtime, loadedMtime: 0 };
  const existing = mtime();
  if (existing) {
    runtime.importState(JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')));
    holder.loadedMtime = existing;
  } else {
    runtime.run('setup');
    persist(holder);
    console.info(`[gas-mock] Data contoh dibuat. Login admin: ${username} / ${password}`);
  }
  return holder;
}

export async function mockCall(action: string, payload: unknown) {
  g.__gentaMock ??= init();
  const holder = await g.__gentaMock;
  const current = mtime();
  if (current && current !== holder.loadedMtime) {
    holder.runtime.importState(JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')));
    holder.loadedMtime = current;
  }
  const latency = Number(process.env.MOCK_LATENCY_MS ?? 0);
  if (latency > 0) await new Promise((r) => setTimeout(r, latency));
  const res = holder.runtime.call(action, payload, holder.runtime.apiKey);
  if (!READ_ONLY.test(action) && res.success) persist(holder);
  return res;
}

/** Untuk route /api/dev/mock-image: ambil byte gambar yang di-upload di mode mock. */
export async function mockGetFile(id: string) {
  g.__gentaMock ??= init();
  const holder = await g.__gentaMock;
  if (mtime() !== holder.loadedMtime && mtime()) {
    holder.runtime.importState(JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')));
    holder.loadedMtime = mtime();
  }
  const f = holder.runtime.files.get(id);
  return f && !f.trashed ? f : null;
}
