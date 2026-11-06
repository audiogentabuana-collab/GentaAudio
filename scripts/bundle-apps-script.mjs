#!/usr/bin/env node
/**
 * Gabungkan semua file apps-script/src/**.js menjadi SATU file
 * apps-script/dist/Code.gs untuk di-copy-paste ke editor Apps Script
 * (alternatif tanpa clasp/terminal).
 *   npm run gas:bundle
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'apps-script', 'src');
const outFile = path.join(root, 'apps-script', 'dist', 'Code.gs');

export function buildBundle() {
  const parts = [];
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js')) {
        const rel = path.relative(srcDir, p).split(path.sep).join('/');
        parts.push(`// ===================== ${rel} =====================\n` + fs.readFileSync(p, 'utf8').trimEnd() + '\n');
      }
    }
  };
  walk(srcDir);
  const header = [
    '/**',
    ' * GENTA BUANA — Apps Script (FILE GABUNGAN, dibuat otomatis).',
    ' * JANGAN edit file ini langsung: edit apps-script/src/*.js lalu jalankan `npm run gas:bundle`.',
    ' * Cara pakai: salin SELURUH isi file ini ke file Code.gs di editor Apps Script.',
    ' */',
    '',
  ].join('\n');
  return header + parts.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, buildBundle());
  console.log('Ditulis:', path.relative(root, outFile));
}
