#!/usr/bin/env node
/**
 * Buat hash password admin untuk Script Property ADMIN_INITIAL_PASSWORD_HASH.
 *   npm run hash-password
 * atau non-interaktif:
 *   npm run hash-password -- "password-anda"
 * Format sama dengan src/server/auth/password.ts.
 */
import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline';

function hash(password) {
  const salt = randomBytes(16);
  const key = scryptSync(password.normalize('NFKC'), salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return ['scrypt', 16384, 8, 1, salt.toString('base64url'), key.toString('base64url')].join('$');
}

function done(password) {
  if (!password || password.length < 8) {
    console.error('Password minimal 8 karakter.');
    process.exit(1);
  }
  console.log('\nHash password (salin SELURUH baris berikut ke Script Property ADMIN_INITIAL_PASSWORD_HASH):\n');
  console.log(hash(password));
  console.log('');
}

const arg = process.argv[2];
if (arg) {
  done(arg);
} else {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Masukkan password admin (min 8 karakter): ', (pw) => {
    rl.close();
    done(pw.trim());
  });
}
