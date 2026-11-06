import { test, expect, type Page } from '@playwright/test';
import zlib from 'node:zlib';

/** PNG valid 64x48 berwarna oranye (dibuat di memori). */
function makePng(w = 64, h = 48): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set([255, 127, 62], y * (w * 3 + 1) + 1 + x * 3);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function login(page: Page) {
  await page.goto('/admin/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password', { exact: true }).fill('admin12345');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

function futureDate(days = 10) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(Date.now() + days * 86400000));
}

test.describe('halaman publik', () => {
  test('semua halaman tampil tanpa error & tanpa scroll horizontal', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const path of ['/', '/pricelist', '/pricelist/paket-hajatan-standar', '/galeri', '/tentang', '/faq', '/kontak']) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator('h1').first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow, `overflow di ${path}`).toBe(false);
    }
    expect(errors).toEqual([]);
  });

  test('tombol WA melayang ada, link paket berisi nama paket', async ({ page }) => {
    await page.goto('/pricelist');
    await expect(page.getByRole('link', { name: 'Chat via WhatsApp' })).toBeVisible();
    const href = await page.getByRole('link', { name: 'Pesan Paket Hajatan Standar via WhatsApp' }).getAttribute('href');
    expect(decodeURIComponent(href!)).toContain('Paket Hajatan Standar');
    expect(href).toMatch(/^https:\/\/wa\.me\/62\d+\?text=/);
  });

  test('filter kategori pricelist', async ({ page }) => {
    await page.goto('/pricelist');
    await page.getByRole('button', { name: /Event & Panggung/ }).click();
    await expect(page.getByRole('heading', { name: 'Paket Panggung Hiburan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Paket Hajatan Standar' })).toHaveCount(0);
  });

  test('SEO: sitemap, robots, JSON-LD, metadata', async ({ page, request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('/pricelist/paket-hajatan-standar');
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toMatch(/Disallow: \/admin/);
    await page.goto('/');
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld!)['@type']).toBe('LocalBusiness');
    await expect(page).toHaveTitle(/Genta Buana/);
    expect(await page.locator('meta[property="og:title"]').getAttribute('content')).toBeTruthy();
    const ogUrl = await page.locator('meta[property="og:image"]').getAttribute('content');
    const og = await request.get(new URL(ogUrl!).pathname);
    expect(og.headers()['content-type']).toContain('image/png');
  });
});

test.describe('booking', () => {
  test('validasi form & kirim booking → masuk inbox admin → ubah status', async ({ page }) => {
    await page.goto('/kontak?paket=paket-pernikahan-premium', { waitUntil: 'networkidle' });
    await expect(page.getByLabel('Paket yang diminati')).toHaveValue(/.+/);
    await page.getByRole('button', { name: 'Kirim Booking' }).click();
    await expect(page.locator('#booking-message')).toBeVisible();
    await expect(page.getByText('Nama wajib diisi')).toBeVisible();

    await page.getByLabel('Nama lengkap').fill('Budi E2E');
    await page.getByLabel('Nomor WhatsApp').fill('0812 3333 4444');
    await page.getByLabel('Tanggal acara').fill(futureDate());
    await page.getByLabel('Lokasi acara').fill('Balai Desa Sukamaju');
    await page.getByLabel('Catatan').fill('Resepsi 300 tamu');
    await page.waitForTimeout(2600); // anti-spam: waktu isi minimum
    await page.getByRole('button', { name: 'Kirim Booking' }).click();
    await expect(page.getByText('Booking terkirim, terima kasih!')).toBeVisible();

    await login(page);
    await expect(page.getByText('Budi E2E')).toBeVisible();
    await page.goto('/admin/booking');
    const card = page.locator('div', { has: page.getByText('Budi E2E', { exact: true }) }).filter({ hasText: 'Chat pelanggan' }).last();
    await expect(card.getByText('Paket Pernikahan Premium')).toBeVisible();
    await card.getByRole('button', { name: 'Dihubungi' }).click();
    await expect(page.getByText('Status: Dihubungi')).toBeVisible();
    await page.goto('/admin/booking?status=dihubungi');
    await expect(page.getByText('Budi E2E')).toBeVisible();
  });
});

test.describe('admin', () => {
  test('tanpa login diarahkan ke halaman login; upload API menolak', async ({ page, request }) => {
    await page.goto('/admin/paket');
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fpaket/);
    const res = await request.post('/api/admin/upload', { data: {}, headers: { origin: 'http://localhost:3100' } });
    expect(res.status()).toBe(401);
  });

  test('password salah ditolak', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password', { exact: true }).fill('salah-sekali');
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page.getByText(/Username atau password salah/)).toBeVisible();
  });

  test('CRUD paket + upload foto → tampil di publik → sembunyikan → hapus', async ({ page }) => {
    await login(page);
    await page.goto('/admin/paket/baru');
    await page.getByLabel('Nama paket').fill('Paket Uji E2E');
    await page.getByLabel('Kategori').selectOption({ label: 'Hajatan & Pernikahan' });
    await page.getByRole('textbox', { name: /^Harga/ }).fill('1750000');
    await page.getByLabel('Kapasitas').fill('150 tamu');
    await page.getByRole('button', { name: '+ Speaker' }).click();
    await page.getByLabel('Keterangan item 1').fill('2x 15 inch');
    await page.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: makePng() });
    await expect(page.getByText('Utama')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect(page).toHaveURL(/\/admin\/paket$/);
    await expect(page.getByRole('link', { name: 'Paket Uji E2E' })).toBeVisible();

    // Cache publik langsung diperbarui (updateTag)
    await page.goto('/pricelist');
    await expect(page.getByRole('heading', { name: 'Paket Uji E2E' })).toBeVisible();
    await page.goto('/pricelist/paket-uji-e2e');
    await expect(page.getByText('Rp 1.750.000').first()).toBeVisible();
    const img = page.locator('img[alt="Paket Uji E2E foto 1"]');
    await expect(img).toBeVisible();
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);

    // Sembunyikan
    await page.goto('/admin/paket');
    await page.getByRole('switch', { name: 'Tampilkan Paket Uji E2E di website' }).click();
    await expect(page.getByText('Disembunyikan dari website.')).toBeVisible();
    await page.goto('/pricelist');
    await expect(page.getByRole('heading', { name: 'Paket Uji E2E' })).toHaveCount(0);

    // Hapus
    await page.goto('/admin/paket');
    const row = page.locator('li', { has: page.getByRole('link', { name: 'Paket Uji E2E' }) });
    await row.getByRole('button', { name: 'Hapus' }).click();
    await row.getByRole('button', { name: 'Ya' }).click();
    await expect(page.getByText('Paket dihapus.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Paket Uji E2E' })).toHaveCount(0);
  });

  test('validasi form admin menampilkan pesan', async ({ page }) => {
    await login(page);
    await page.goto('/admin/faq/baru');
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect(page.getByText('Pertanyaan wajib diisi')).toBeVisible();
  });

  test('urutan FAQ bisa diubah', async ({ page }) => {
    await login(page);
    await page.goto('/admin/faq');
    const titles = page.locator('main ul li a.font-semibold');
    const first = await titles.nth(0).textContent();
    await page.getByRole('button', { name: 'Turunkan urutan' }).first().click();
    await expect(page.getByText('Gagal menyimpan urutan')).toHaveCount(0);
    await page.reload();
    await expect(titles.nth(1)).toHaveText(first!);
  });

  test('pengaturan: ubah tagline & WA → beranda ikut berubah', async ({ page }) => {
    await login(page);
    await page.goto('/admin/pengaturan');
    await page.getByLabel('Tagline / judul utama').fill('Sound Jernih | untuk Setiap Acara');
    await page.getByLabel('Nomor WhatsApp').fill('0857-1111-2222');
    await page.getByRole('button', { name: 'Simpan pengaturan' }).click();
    await expect(page.getByText('Pengaturan disimpan')).toBeVisible();
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Sound Jernih untuk Setiap Acara');
    expect(await page.getByRole('link', { name: 'Chat via WhatsApp' }).getAttribute('href')).toContain('wa.me/6285711112222');
  });

  test('logout menghapus sesi', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Buka menu' }).click();
    await page.getByRole('button', { name: /Keluar/ }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
