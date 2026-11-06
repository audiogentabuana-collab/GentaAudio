/**
 * Hash password dengan scrypt (Node crypto, tanpa dependency native).
 * Format: scrypt$N$r$p$<salt base64url>$<hash base64url>
 * Harus sama dengan scripts/hash-password.mjs.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize('NFKC'), salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return ['scrypt', N, R, P, salt.toString('base64url'), hash.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64url');
  const nn = Number(n);
  const rr = Number(r);
  const pp = Number(p);
  // Batasi parameter agar hash rusak/jahat tidak membuat server kehabisan memori.
  if (!expected.length || nn > 2 ** 17 || rr > 16 || pp > 4) return false;
  try {
    const actual = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64url'), expected.length, {
      N: nn,
      r: rr,
      p: pp,
      maxmem: 256 * 1024 * 1024,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Hash dummy agar waktu respon login sama walau username tidak ada (cegah user enumeration). */
let dummyHash: Promise<string> | null = null;
export function getDummyHash() {
  dummyHash ??= hashPassword(randomBytes(12).toString('hex'));
  return dummyHash;
}
