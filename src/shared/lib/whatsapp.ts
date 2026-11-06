/** Normalisasi nomor ke format internasional tanpa "+" (contoh: 6281234567890). */
export function normalizePhone(input: string): string {
  let d = String(input || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d;
}

export function waLink(phone: string, message?: string): string {
  const n = normalizePhone(phone);
  const base = `https://wa.me/${n}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Tampilkan 6281234567890 → 0812-3456-7890 */
export function displayPhone(phone: string): string {
  const n = normalizePhone(phone);
  if (!n) return '';
  const local = n.startsWith('62') ? '0' + n.slice(2) : n;
  return local.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
}

export function packageWaMessage(opts: { businessName: string; packageName: string; price: string; url?: string }) {
  return [
    `Halo ${opts.businessName}, saya tertarik dengan *${opts.packageName}* (${opts.price}).`,
    '',
    'Tanggal acara: ',
    'Lokasi acara: ',
    'Jenis acara: ',
    '',
    opts.url ? `Link paket: ${opts.url}` : '',
    'Apakah masih tersedia?',
  ]
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
    .join('\n')
    .trim();
}
