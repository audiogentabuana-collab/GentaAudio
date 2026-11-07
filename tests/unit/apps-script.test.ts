import { describe, it, expect, beforeEach } from 'vitest';
import { createGasRuntime, type GasRuntime } from '@/server/gas/harness';
import { hashPassword } from '@/server/auth/password';

let gas: GasRuntime;
let adminHash: string;

beforeEach(async () => {
  adminHash ??= await hashPassword('rahasia123');
  gas = createGasRuntime({
    quiet: true,
    properties: { ADMIN_INITIAL_USERNAME: 'Owner', ADMIN_INITIAL_PASSWORD_HASH: adminHash, NOTIFY_EMAIL: 'owner@example.com' },
  });
  gas.run('setup');
});

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

describe('setup()', () => {
  it('membuat semua sheet dengan header standar', () => {
    const names = gas.spreadsheet.getSheets().map((s) => s.getName());
    expect(names).toEqual(
      expect.arrayContaining(['settings', 'categories', 'packages', 'equipment', 'gallery', 'testimonials', 'faqs', 'bookings', 'admins']),
    );
    const header = gas.spreadsheet.getSheetByName('packages')!.data[0];
    expect(header.slice(0, 1)).toEqual(['id']);
    expect(header.slice(-4)).toEqual(['sort_order', 'is_active', 'created_at', 'updated_at']);
  });

  it('menghapus sheet bawaan kosong ("Sheet1") tanpa error', () => {
    expect(gas.spreadsheet.getSheetByName('Sheet1')).toBeNull();
  });

  it('idempoten: dijalankan dua kali tidak menggandakan seed', () => {
    const before = gas.call('packages.list', { includeInactive: true }).data as unknown[];
    gas.run('setup');
    const after = gas.call('packages.list', { includeInactive: true }).data as unknown[];
    expect(after.length).toBe(before.length);
    expect(before.length).toBeGreaterThan(0);
  });

  it('membuat admin awal dari Script Properties (username huruf kecil)', () => {
    const res = gas.call('auth.getCredential', { username: 'OWNER', ip: '1.1.1.1' });
    expect(res.success).toBe(true);
    expect((res.data as { admin: { username: string } }).admin.username).toBe('owner');
  });

  it('menambah kolom yang hilang tanpa menghapus data', () => {
    const sheet = gas.spreadsheet.getSheetByName('faqs')!;
    const idx = sheet.data[0].indexOf('answer');
    sheet.data.forEach((row) => row.splice(idx, 1)); // hapus kolom answer
    gas.run('setup');
    expect(sheet.data[0]).toContain('answer');
    expect(sheet.data.length).toBeGreaterThan(1);
  });
});

describe('router & keamanan', () => {
  it('menolak API key yang salah', () => {
    const res = gas.call('system.ping', {}, 'kunci-salah');
    expect(res).toMatchObject({ success: false, code: 'UNAUTHORIZED' });
  });

  it('menolak body bukan JSON & action tidak dikenal', () => {
    expect(gas.handleRaw('bukan json')).toMatchObject({ success: false, code: 'BAD_REQUEST' });
    expect(gas.call('setup')).toMatchObject({ success: false, code: 'NOT_FOUND' });
  });

  it('ping berhasil dengan format { success, data, message }', () => {
    const res = gas.call('system.ping');
    expect(res.success).toBe(true);
    expect(res).toHaveProperty('message');
    expect(res.data).toHaveProperty('version');
  });

  it('mengembalikan BUSY bila lock tidak didapat', () => {
    gas.setLockBusy(true);
    const res = gas.call('faqs.create', { data: { question: 'Q?', answer: 'A' } });
    expect(res).toMatchObject({ success: false, code: 'BUSY' });
  });
});

describe('CRUD generik', () => {
  it('create → list → update → toggle → delete', () => {
    const created = gas.call('faqs.create', { data: { question: 'Bisa bayar transfer?', answer: 'Bisa.' } });
    expect(created.success).toBe(true);
    const rec = created.data as Record<string, unknown>;
    expect(rec.id).toMatch(/[0-9a-f-]{36}/);
    expect(rec.is_active).toBe(true);
    expect(rec.sort_order).toBe(7); // seed berisi 6 FAQ

    const upd = gas.call('faqs.update', { id: rec.id, data: { answer: 'Bisa, ke rekening BCA.' } });
    expect((upd.data as Record<string, unknown>).answer).toBe('Bisa, ke rekening BCA.');
    expect((upd.data as Record<string, unknown>).question).toBe('Bisa bayar transfer?');

    gas.call('faqs.toggle', { id: rec.id, is_active: false });
    const publicList = gas.call('faqs.list').data as { id: string }[];
    expect(publicList.find((f) => f.id === rec.id)).toBeUndefined();
    const adminList = gas.call('faqs.list', { includeInactive: true }).data as { id: string }[];
    expect(adminList.find((f) => f.id === rec.id)).toBeDefined();

    expect(gas.call('faqs.delete', { id: rec.id }).success).toBe(true);
    expect(gas.call('faqs.get', { id: rec.id })).toMatchObject({ success: false, code: 'NOT_FOUND' });
  });

  it('validasi: field wajib & tipe', () => {
    const res = gas.call('packages.create', { data: { name: '', price: 'abc' } });
    expect(res).toMatchObject({ success: false, code: 'VALIDATION' });
    const errs = (res.data as { fieldErrors: Record<string, string> }).fieldErrors;
    expect(Object.keys(errs)).toEqual(expect.arrayContaining(['name', 'price', 'category_id']));
  });

  it('slug unik otomatis & get by slug', () => {
    const cat = (gas.call('categories.list').data as { id: string }[])[0];
    const a = gas.call('packages.create', { data: { category_id: cat.id, name: 'Paket Hajatan Standar', price: 1 } });
    expect((a.data as { slug: string }).slug).toBe('paket-hajatan-standar-2');
    const got = gas.call('packages.get', { slug: 'paket-hajatan-standar-2' });
    expect((got.data as { id: string }).id).toBe((a.data as { id: string }).id);
  });

  it('json specs & image_ids tersimpan dan terbaca kembali', () => {
    const cat = (gas.call('categories.list').data as { id: string }[])[0];
    const res = gas.call('packages.create', {
      data: {
        category_id: cat.id,
        name: 'Uji JSON',
        price: 1000,
        specs: [{ label: 'Speaker', value: '=2x 15 inch' }],
        image_ids: ['abcdefghijklmnop'],
      },
    });
    expect(res.success).toBe(true);
    const got = gas.call('packages.get', { id: (res.data as { id: string }).id }).data as Record<string, unknown>;
    expect(got.specs).toEqual([{ label: 'Speaker', value: '=2x 15 inch' }]);
    expect(got.image_ids).toEqual(['abcdefghijklmnop']);
    expect(got.price).toBe(1000);
  });

  it('teks yang diawali "=" tidak menjadi formula', () => {
    const res = gas.call('faqs.create', { data: { question: '=IMPORTXML("http://x")', answer: '+62 boleh?' } });
    expect(res.success).toBe(true);
    expect((res.data as { question: string }).question).toBe('=IMPORTXML("http://x")');
  });

  it('reorder mengubah sort_order', () => {
    const list = gas.call('faqs.list').data as { id: string }[];
    const reversed = list.map((f) => f.id).reverse();
    gas.call('faqs.reorder', { ids: reversed });
    const after = (gas.call('faqs.list').data as { id: string }[]).map((f) => f.id);
    expect(after).toEqual(reversed);
  });

  it('kategori yang masih dipakai paket tidak bisa dihapus', () => {
    const cat = (gas.call('categories.list').data as { id: string }[])[0];
    expect(gas.call('categories.delete', { id: cat.id })).toMatchObject({ success: false, code: 'CONFLICT' });
  });

  it('paket dengan kategori tidak valid ditolak', () => {
    const res = gas.call('packages.create', { data: { category_id: 'tidak-ada', name: 'X', price: 1 } });
    expect(res).toMatchObject({ success: false, code: 'VALIDATION' });
  });
});

describe('cache', () => {
  it('perubahan langsung terlihat (cache di-invalidate saat tulis)', () => {
    gas.call('faqs.list'); // isi cache
    gas.call('faqs.create', { data: { question: 'Baru?', answer: 'Ya' } });
    const list = gas.call('faqs.list').data as { question: string }[];
    expect(list.some((f) => f.question === 'Baru?')).toBe(true);
  });

  it('data besar (>100KB) di-chunk tanpa error', () => {
    for (let i = 0; i < 40; i++) {
      gas.call('faqs.create', { data: { question: 'Pertanyaan ' + i, answer: 'x'.repeat(2900) } });
    }
    const first = gas.call('faqs.list').data as unknown[];
    const second = gas.call('faqs.list').data as unknown[]; // dari cache
    expect(second.length).toBe(first.length);
    expect(JSON.stringify(first).length).toBeGreaterThan(100 * 1024);
  });
});

describe('settings', () => {
  it('get & update hanya key yang diizinkan, nomor WA dinormalisasi', () => {
    const res = gas.call('settings.update', { values: { whatsapp: '0812-3456-7890', hacker: 'x', tagline: 'Baru' } });
    expect(res.success).toBe(true);
    const s = res.data as Record<string, string>;
    expect(s.whatsapp).toBe('6281234567890');
    expect(s.tagline).toBe('Baru');
    expect(s).not.toHaveProperty('hacker');
  });

  it('menolak maps embed dari domain lain', () => {
    const res = gas.call('settings.update', { values: { maps_embed_url: 'https://evil.example/embed' } });
    expect(res).toMatchObject({ success: false, code: 'VALIDATION' });
  });
});

describe('bookings', () => {
  const future = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  it('create (status baru, kirim email notifikasi) → list → updateStatus', () => {
    const pkg = (gas.call('packages.list').data as { id: string; name: string }[])[0];
    const res = gas.call('bookings.create', {
      name: 'Budi',
      phone: '0812 1111 2222',
      event_date: future,
      location: 'Desa Sukamaju',
      package_id: pkg.id,
      message: 'Untuk nikahan',
      ip: '10.0.0.1',
    });
    expect(res.success).toBe(true);
    expect(gas.mail.length).toBe(1);
    const list = gas.call('bookings.list').data as Record<string, string>[];
    expect(list[0]).toMatchObject({ name: 'Budi', phone: '6281211112222', status: 'baru', package_name: pkg.name });
    const upd = gas.call('bookings.updateStatus', { id: list[0].id, status: 'deal', admin_note: 'DP masuk' });
    expect(upd.data).toMatchObject({ status: 'deal', admin_note: 'DP masuk' });
    expect(gas.call('bookings.updateStatus', { id: list[0].id, status: 'ngawur' }).code).toBe('VALIDATION');
  });

  it('menolak tanggal lampau', () => {
    const res = gas.call('bookings.create', { name: 'A', phone: '08123456789', event_date: '2020-01-01', location: 'X', ip: '1' });
    expect(res).toMatchObject({ success: false, code: 'VALIDATION' });
  });

  it('rate limit per IP', () => {
    const body = { name: 'A', phone: '08123456789', event_date: future, location: 'X', ip: '9.9.9.9' };
    for (let i = 0; i < 5; i++) expect(gas.call('bookings.create', body).success).toBe(true);
    expect(gas.call('bookings.create', body)).toMatchObject({ success: false, code: 'RATE_LIMITED' });
  });
});

describe('auth', () => {
  it('rate limit login per username setelah 5 kali gagal', () => {
    for (let i = 0; i < 5; i++) gas.call('auth.loginFailed', { username: 'owner', ip: '2.2.2.2' });
    expect(gas.call('auth.getCredential', { username: 'owner', ip: '3.3.3.3' })).toMatchObject({
      success: false,
      code: 'RATE_LIMITED',
    });
  });

  it('login sukses mereset hitungan & mencatat last_login_at', () => {
    for (let i = 0; i < 4; i++) gas.call('auth.loginFailed', { username: 'owner', ip: '2.2.2.2' });
    const cred = gas.call('auth.getCredential', { username: 'owner', ip: '2.2.2.2' }).data as { admin: { id: string } };
    const ok = gas.call('auth.loginSucceeded', { id: cred.admin.id, username: 'owner' });
    expect((ok.data as { last_login_at: string }).last_login_at).toMatch(/^\d{4}-/);
    expect(ok.data).not.toHaveProperty('password_hash');
    for (let i = 0; i < 4; i++) gas.call('auth.loginFailed', { username: 'owner', ip: '2.2.2.2' });
    expect(gas.call('auth.getCredential', { username: 'owner', ip: '2.2.2.2' }).success).toBe(true);
  });

  it('changePassword menolak format hash yang salah', () => {
    const cred = gas.call('auth.getCredential', { username: 'owner', ip: '1' }).data as { admin: { id: string } };
    expect(gas.call('admins.changePassword', { id: cred.admin.id, password_hash: 'plaintext' }).code).toBe('VALIDATION');
  });
});

describe('upload & Drive', () => {
  it('upload gambar → file dibagikan publik; dihapus bersama record', () => {
    const up = gas.call('upload.image', { fileName: 'foto.png', mimeType: 'image/png', base64: PNG_1PX });
    expect(up.success).toBe(true);
    const { fileId, url } = up.data as { fileId: string; url: string };
    expect(url).toBe(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`);
    expect(gas.files.get(fileId)!.shared).toBe(true);

    const g = gas.call('gallery.create', { data: { title: 'Acara', image_ids: [fileId] } });
    const del = gas.call('gallery.delete', { id: (g.data as { id: string }).id });
    expect((del.data as { trashedFiles: number }).trashedFiles).toBe(1);
    expect(gas.files.get(fileId)!.trashed).toBe(true);
  });

  it('gambar yang dilepas saat update ikut di-trash', () => {
    const a = (gas.call('upload.image', { fileName: 'a.png', mimeType: 'image/png', base64: PNG_1PX }).data as { fileId: string }).fileId;
    const b = (gas.call('upload.image', { fileName: 'b.png', mimeType: 'image/png', base64: PNG_1PX }).data as { fileId: string }).fileId;
    const g = gas.call('gallery.create', { data: { title: 'Acara', image_ids: [a, b] } }).data as { id: string };
    gas.call('gallery.update', { id: g.id, data: { image_ids: [b] } });
    expect(gas.files.get(a)!.trashed).toBe(true);
    expect(gas.files.get(b)!.trashed).toBe(false);
  });

  it('menolak tipe file selain gambar', () => {
    const res = gas.call('upload.image', { fileName: 'x.pdf', mimeType: 'application/pdf', base64: PNG_1PX });
    expect(res).toMatchObject({ success: false, code: 'VALIDATION' });
  });

  it('upload.delete tidak menghapus file di luar folder upload', () => {
    const id = (gas.call('upload.image', { fileName: 'a.png', mimeType: 'image/png', base64: PNG_1PX }).data as { fileId: string }).fileId;
    gas.files.get(id)!.parentId = 'folder-lain';
    expect((gas.call('upload.delete', { fileId: id }).data as { trashed: boolean }).trashed).toBe(false);
  });
});

describe('public.snapshot & dashboard', () => {
  it('hanya berisi konten aktif; paket dari kategori nonaktif disembunyikan', () => {
    const cats = gas.call('categories.list').data as { id: string }[];
    gas.call('categories.toggle', { id: cats[0].id, is_active: false });
    const snap = gas.call('public.snapshot').data as { packages: { category_id: string }[]; settings: Record<string, string> };
    expect(snap.packages.every((p) => p.category_id !== cats[0].id)).toBe(true);
    expect(snap.settings.business_name).toBe('Genta Buana');
  });

  it('dashboard.stats menghitung booking baru', () => {
    const s = gas.call('dashboard.stats').data as { bookings: { baru: number }; packages: { total: number } };
    expect(s.bookings.baru).toBe(0);
    expect(s.packages.total).toBe(6);
  });
});

describe('bundle copy-paste (apps-script/dist/Code.gs)', () => {
  it('selalu sinkron dengan apps-script/src (jalankan `npm run gas:bundle` bila gagal)', async () => {
    const fs = await import('node:fs');
    // @ts-expect-error modul .mjs tanpa deklarasi tipe
    const { buildBundle } = await import('../../scripts/bundle-apps-script.mjs');
    expect(fs.readFileSync('apps-script/dist/Code.gs', 'utf8')).toBe(buildBundle());
  });

  it('file gabungan bisa dijalankan sebagai satu script (setup + ping)', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gas-bundle-'));
    fs.copyFileSync('apps-script/dist/Code.gs', path.join(dir, 'Code.js'));
    const rt = createGasRuntime({ quiet: true, sourceDir: dir });
    rt.run('setup');
    expect(rt.call('system.ping').success).toBe(true);
    expect((rt.call('packages.list').data as unknown[]).length).toBe(6);
  });
});

describe('analitik', () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const daysAgo = (n: number) => new Date(Date.parse(today + 'T00:00:00Z') - n * 86400000).toISOString().slice(0, 10);
  type Summary = {
    series: { date: string; views: number; visitors: number; wa_clicks: number }[];
    totals: { views: number; visitors: number; wa_clicks: number };
    previous: { views: number; visitors: number; wa_clicks: number };
    pages: { key: string; count: number }[];
    refs: { key: string; count: number }[];
    devices: Record<string, number>;
    packages: { key: string; count: number }[];
  };

  it('setup membuat sheet analitik & trigger per jam', () => {
    expect(gas.spreadsheet.getSheetByName('analytics_events')).not.toBeNull();
    expect(gas.spreadsheet.getSheetByName('analytics_daily')).not.toBeNull();
  });

  it('track → summary menghitung kunjungan, pengunjung, klik WA, halaman, sumber, paket', () => {
    const res = gas.call('analytics.track', {
      events: [
        { type: 'view', path: '/', ref: 'www.google.com', device: 'mobile', nv: true },
        { type: 'view', path: '/pricelist?x=1', device: 'mobile', nv: false },
        { type: 'view', path: '/pricelist', ref: 'instagram.com', device: 'desktop', nv: true },
        { type: 'wa_click', path: '/pricelist', pkg: 'paket-hajatan-standar' },
        { type: 'hacker', path: '/' },
        { type: 'view', path: 'javascript:alert(1)', ref: '<script>' },
      ],
    });
    expect((res.data as { recorded: number }).recorded).toBe(5);
    const s = gas.call('analytics.summary', { days: 7 }).data as Summary;
    expect(s.series).toHaveLength(7);
    expect(s.series.at(-1)!.date).toBe(today);
    expect(s.totals).toEqual({ views: 4, visitors: 2, wa_clicks: 1 });
    expect(s.pages.find((p) => p.key === '/pricelist')!.count).toBe(2);
    expect(s.pages.find((p) => p.key === '/')!.count).toBe(2); // termasuk path tidak valid → '/'
    expect(s.refs.map((r) => r.key)).toEqual(expect.arrayContaining(['google.com', 'instagram.com', '(langsung)']));
    expect(s.devices).toEqual({ mobile: 2, desktop: 2 });
    expect(s.packages).toEqual([{ key: 'paket-hajatan-standar', count: 1 }]);
  });

  it('aggregateAnalytics merangkum ke harian tanpa mengubah angka & mengosongkan event', () => {
    gas.call('analytics.track', { events: [{ type: 'view', path: '/', nv: true }, { type: 'wa_click', path: '/' }] });
    const before = gas.call('analytics.summary', { days: 30 }).data as Summary;
    expect(gas.run('aggregateAnalytics')).toEqual({ aggregated: 2 });
    expect(gas.spreadsheet.getSheetByName('analytics_events')!.getLastRow()).toBe(1);
    gas.call('analytics.track', { events: [{ type: 'view', path: '/faq' }] });
    gas.run('aggregateAnalytics'); // hari yang sama digabung, bukan baris baru
    expect(gas.spreadsheet.getSheetByName('analytics_daily')!.getLastRow()).toBe(2);
    const after = gas.call('analytics.summary', { days: 30 }).data as Summary;
    expect(after.totals.views).toBe(before.totals.views + 1);
    expect(after.totals.wa_clicks).toBe(before.totals.wa_clicks);
  });

  it('periode sebelumnya dihitung terpisah', () => {
    const sheet = gas.spreadsheet.getSheetByName('analytics_daily')!;
    sheet.appendRow([daysAgo(10), '50', '20', '5', '{}', '{}', '{}', '{}', '']); // periode sebelumnya (7 hari)
    sheet.appendRow([daysAgo(3), '7', '3', '1', '{"/":7}', '{}', '{}', '{}', '']); // periode ini
    const s = gas.call('analytics.summary', { days: 7 }).data as Summary;
    expect(s.totals.views).toBe(7);
    expect(s.previous).toEqual({ views: 50, visitors: 20, wa_clicks: 5 });
  });
});
